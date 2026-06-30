import os
import time
import hmac
import hashlib
import psutil
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, Body
from pydantic import BaseModel
from sqlalchemy import text
from app.database import SessionLocal
from app.models.user import User
from celery_worker import celery

router = APIRouter(prefix="/admin/system-diagnostics", tags=["super_admin"])

SUPER_ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD", "SuperAdmin123!")
DIAGNOSTIC_SECRET = os.getenv("DIAGNOSTIC_SECRET", "SuperAdminSecretKeyForSigning")

class PasscodeRequest(BaseModel):
    passcode: str

def generate_diag_token() -> str:
    # Valid for 2 hours
    exp = str(int(time.time()) + 7200)
    sig = hmac.new(DIAGNOSTIC_SECRET.encode(), exp.encode(), hashlib.sha256).hexdigest()
    return f"{exp}:{sig}"

def verify_diag_token(token: str) -> bool:
    if not token or ":" not in token:
        return False
    try:
        exp_str, sig = token.split(":", 1)
        exp = int(exp_str)
        if time.time() > exp:
            return False
        expected_sig = hmac.new(DIAGNOSTIC_SECRET.encode(), exp_str.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, expected_sig)
    except Exception:
        return False

def check_auth(token: Optional[str]):
    if not token or not verify_diag_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized access to system diagnostics")

@router.post("/auth")
def authenticate_diag(data: PasscodeRequest):
    if data.passcode == SUPER_ADMIN_PASSWORD:
        return {"status": "success", "token": generate_diag_token()}
    else:
        raise HTTPException(status_code=401, detail="Invalid passcode")

@router.get("/metrics")
def get_system_metrics(x_diag_token: Optional[str] = Header(None)):
    check_auth(x_diag_token)
    
    cpu_percent = psutil.cpu_percent(interval=None)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    db = SessionLocal()
    db_status = "Healthy"
    active_connections = 0
    try:
        res = db.execute(text("SHOW STATUS WHERE Variable_name = 'Threads_connected'")).fetchone()
        if res:
            active_connections = int(res[1])
    except Exception as e:
        db_status = f"Error: {str(e)}"
    finally:
        db.close()
        
    return {
        "status": "success",
        "cpu_usage": cpu_percent,
        "memory_total": memory.total,
        "memory_used": memory.used,
        "memory_percent": memory.percent,
        "disk_total": disk.total,
        "disk_used": disk.used,
        "disk_percent": disk.percent,
        "database": {
            "status": db_status,
            "active_connections": active_connections
        }
    }

@router.get("/celery-logs")
def get_celery_logs(x_diag_token: Optional[str] = Header(None)):
    check_auth(x_diag_token)
    
    celery_status = "Inactive"
    active_tasks = []
    reserved_tasks = []
    scheduled_tasks = []
    
    try:
        insp = celery.control.inspect()
        if insp:
            stats = insp.stats()
            if stats:
                celery_status = "Active"
                
                active = insp.active()
                if active:
                    for worker, tasks in active.items():
                        active_tasks.extend(tasks)
                
                reserved = insp.reserved()
                if reserved:
                    for worker, tasks in reserved.items():
                        reserved_tasks.extend(tasks)
                        
                scheduled = insp.scheduled()
                if scheduled:
                    for worker, tasks in scheduled.items():
                        scheduled_tasks.extend(tasks)
            else:
                celery_status = "No workers detected"
    except Exception as e:
        celery_status = f"Error inspecting workers: {str(e)}"
        
    db = SessionLocal()
    recent_logs = []
    try:
        from app.models.email_log import EmailLog
        logs = db.query(EmailLog).order_by(EmailLog.created_at.desc()).limit(10).all()
        for l in logs:
            recent_logs.append({
                "id": l.id,
                "recipient": l.recipient,
                "subject": l.subject,
                "status": l.status,
                "error_message": l.error_message,
                "created_at": l.created_at.isoformat() if l.created_at else None
            })
    except Exception as e:
        print(f"Error fetching email logs: {e}")
    finally:
        db.close()

    return {
        "status": "success",
        "celery_status": celery_status,
        "active_tasks": active_tasks,
        "reserved_tasks": reserved_tasks,
        "scheduled_tasks": scheduled_tasks,
        "recent_email_logs": recent_logs
    }

@router.get("/active-users")
def get_active_users(x_diag_token: Optional[str] = Header(None)):
    check_auth(x_diag_token)
    
    db = SessionLocal()
    users_data = []
    try:
        roles_count = {}
        users = db.query(User).order_by(User.created_at.desc()).all()
        for u in users:
            roles_count[u.role] = roles_count.get(u.role, 0) + 1
            
        for u in users[:10]:
            users_data.append({
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "created_at": u.created_at.isoformat() if u.created_at else None
            })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
        
    return {
        "status": "success",
        "total_users": len(users),
        "roles_distribution": roles_count,
        "recent_users": users_data
    }

@router.post("/automate-fix")
def run_automation_fix(action: str = Body(..., embed=True), x_diag_token: Optional[str] = Header(None)):
    check_auth(x_diag_token)
    
    db = SessionLocal()
    result_message = ""
    try:
        if action == "clear_stale_tasks":
            purged = celery.control.purge()
            result_message = f"Purged {purged} stale messages from Celery queues."
            
        elif action == "optimize_database":
            db.execute(text("FLUSH TABLES;"))
            result_message = "Database tables flushed and optimized successfully."
            
        elif action == "clear_failed_email_logs":
            from app.models.email_log import EmailLog
            deleted = db.query(EmailLog).filter(EmailLog.status == "failed").delete()
            db.commit()
            result_message = f"Cleared {deleted} failed email logs."
            
        elif action == "restart_workers":
            try:
                celery.control.broadcast('pool_restart')
                result_message = "Broadcasted pool restart command to Celery workers."
            except Exception as e:
                result_message = f"Failed to broadcast restart command: {str(e)}"
        else:
            raise HTTPException(status_code=400, detail="Invalid action request")
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
        
    return {
        "status": "success",
        "message": result_message
    }
