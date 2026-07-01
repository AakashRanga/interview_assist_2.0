from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.database import SessionLocal
from app.models.user import User
from app.services.excel_service import ExcelService
import openpyxl
import io
import json
from app.models.candidate import Candidate
from app.models.candidate_application import CandidateApplication
from app.models.interview_schedule import InterviewSchedule
from app.models.job_role import JobRole
from app.models.panel import Panel
from app.models.panel_group import PanelGroup
from app.models.panel_feedback import PanelFeedback
from app.services.notification_service import NotificationService
from app.models.notification import ActivityType, NotificationType
from app.workers.tasks import schedule_interview_task, send_interview_reminder_task
from datetime import datetime, date, time, timedelta
from zoneinfo import ZoneInfo

router = APIRouter(prefix="/admin", tags=["admin"])


def parse_role_levels(level_str: str) -> list:
    if not level_str:
        return ["Level 1"]
    level_str = level_str.strip()
    import re
    m = re.match(r'^L(\d+)$', level_str, re.IGNORECASE)
    if m:
        n = int(m.group(1))
        return [f"Level {i}" for i in range(1, n + 1)]
    parts = [p.strip() for p in level_str.split(",") if p.strip()]
    if not parts:
        return ["Level 1"]
    return parts


class AddPanelRequest(BaseModel):
    full_name: str
    email: str
    password: str
    role: Optional[str] = "panel"
    hr_panelist_grade: Optional[str] = None
    hr_panel_mobile: Optional[str] = None
    hr_panelist_emp_id: Optional[str] = None


class PanelResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str

    class Config:
        orm_mode = True


class AdminResponse(BaseModel):
    status: str
    message: str
    panel: Optional[PanelResponse] = None


def get_current_user_from_email(email: str, db) -> Optional[User]:
    """Helper function to get user from email (in production, use JWT tokens)"""
    return db.query(User).filter(User.email == email).first()


@router.post("/add-panel", response_model=AdminResponse)
def add_panel(data: AddPanelRequest):
    """
    Add a new panel member (interview panelist).
    """
    db = SessionLocal()
    try:
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == data.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create new panel member
        panel_user = User(
            full_name=data.full_name,
            email=data.email,
            password=data.password,
            role=data.role or "panel"
        )
        db.add(panel_user)
        db.flush()

        # Create corresponding Panel record
        panel = Panel(
            user_id=panel_user.id,
            hr_panelists_name=panel_user.full_name,
            hr_panelist_grade=data.hr_panelist_grade,
            hr_panel_mobile=data.hr_panel_mobile,
            hr_panelist_emp_id=data.hr_panelist_emp_id
        )
        db.add(panel)
        db.commit()
        db.refresh(panel_user)

        return {
            "status": "success",
            "message": "Panel member added successfully",
            "panel": PanelResponse(
                id=panel_user.id,
                full_name=panel_user.full_name,
                email=panel_user.email,
                role=panel_user.role
            )
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# ============ Interview Scheduling ============

class ScheduleInterviewRequest(BaseModel):
    candidate_id: int
    job_id: Optional[int] = None


class ScheduleInterviewResponse(BaseModel):
    status: str
    message: str
    schedule_id: Optional[int] = None


def find_available_slot(db, target_date: date = None):
    """
    Find the next available slot for interview.
    Returns (start_time, end_time) or None if no slots available.
    Uses Indian Standard Time (IST).
    """
    # Get current time in IST
    IST = ZoneInfo('Asia/Kolkata')
    now_ist = datetime.now(IST)
    current_time_ist = now_ist.time()
    today_ist = now_ist.date()

    # If no target_date provided, use today (IST)
    if target_date is None:
        target_date = today_ist

    # If target_date is in the past, return None
    if target_date < today_ist:
        return None

    # Define working hours (9 AM to 5 PM IST)
    slot_duration = timedelta(hours=1)
    work_start = time(9, 0)
    work_end = time(17, 0)

    # Get all schedules for the target date
    schedules = db.query(InterviewSchedule).filter(
        InterviewSchedule.date == target_date,
        InterviewSchedule.interview_status != "cancelled"
    ).all()

    occupied_slots = [(s.start_time, s.end_time) for s in schedules]

    # Find first available slot
    current_time = work_start

    # If scheduling for today, start from the next available slot after current time
    if target_date == today_ist:
        # Check if current time is within working hours
        if current_time_ist >= work_start and current_time_ist < work_end:
            hour_now = now_ist.hour
            # If minute > 0, we're past the start of current hour slot, use next slot
            if current_time_ist.minute > 0:
                next_hour = hour_now + 1
                # If next hour is still within work hours
                if next_hour < 17:
                    current_time = time(next_hour, 0)
                else:
                    return None  # No more slots today
            # If minute == 0, we're exactly at slot start, can use current slot

    while current_time and current_time < work_end:
        slot_end = (datetime.combine(target_date, current_time) + slot_duration).time()

        # Check if this slot is occupied
        is_occupied = False
        for occupied_start, occupied_end in occupied_slots:
            # Check overlap
            if current_time < occupied_end and slot_end > occupied_start:
                is_occupied = True
                break

        if not is_occupied:
            return current_time, slot_end

        current_time = slot_end

    return None


@router.post("/schedule-interview", response_model=ScheduleInterviewResponse)
def schedule_interview(data: ScheduleInterviewRequest):
    """
    Schedule an interview for a candidate:
    1. Validate candidate exists and has email
    2. Find available slot
    3. Create schedule record
    4. Queue Celery task to call n8n
    """
    db = SessionLocal()

    try:
        # Step 1: Validate candidate
        candidate = db.query(Candidate).filter(
            Candidate.id == data.candidate_id
        ).first()

        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        if not candidate.email:
            raise HTTPException(status_code=400, detail="Candidate has no email address")

        # Resolve job_id if not provided
        job_id = data.job_id
        application = None
        job_type = "Online"
        venue = None
        if not job_id:
            application = db.query(CandidateApplication).filter(
                CandidateApplication.candidate_id == data.candidate_id
            ).order_by(CandidateApplication.created_at.desc()).first()
            if application:
                job_id = application.role_id
                if application.role:
                    job_type = application.role.job_type or "Online"
                    venue = application.role.venue
        else:
            # Check job_type directly from job role if provided
            job_role = db.query(JobRole).filter(JobRole.id == job_id).first()
            if job_role:
                job_type = job_role.job_type or "Online"
                venue = job_role.venue

        is_offline = job_type and job_type.lower() == "offline"

        # Step 3: Find available slot (uses IST)
        IST = ZoneInfo('Asia/Kolkata')
        now_ist = datetime.now(IST)
        target_date = now_ist.date()
        slot = find_available_slot(db, target_date)

        if not slot:
            # Try tomorrow
            target_date = now_ist.date() + timedelta(days=1)
            slot = find_available_slot(db, target_date)

        if not slot:
            raise HTTPException(status_code=400, detail="No available slots today or tomorrow")

        start_time, end_time = slot

        # Step 4: Create schedule record
        next_lvl = candidate.current_level or "Level 1"
        schedule = InterviewSchedule(
            candidate_id=data.candidate_id,
            job_id=job_id,
            date=target_date,
            start_time=start_time,
            end_time=end_time,
            interview_level=next_lvl,
            interview_status="pending"  # Will be updated by Celery
        )
        db.add(schedule)
        db.commit()
        db.refresh(schedule)

        # Reuse existing gmeet_link if any
        prior_schedule = db.query(InterviewSchedule).filter(
            InterviewSchedule.candidate_id == data.candidate_id,
            InterviewSchedule.gmeet_link.isnot(None),
            InterviewSchedule.gmeet_link != ""
        ).order_by(InterviewSchedule.created_at.desc()).first()
        if prior_schedule:
            schedule.gmeet_link = prior_schedule.gmeet_link
            db.add(schedule)
            db.commit()
            db.refresh(schedule)
            
            # Update PanelGroup's meet_link dynamically based on candidate's interview slot
            if candidate.panel_group_id:
                from app.models.panel_group import PanelGroup
                try:
                    group_id = int(candidate.panel_group_id)
                    group = db.query(PanelGroup).filter(PanelGroup.id == group_id).first()
                    if group:
                        group.meet_link = prior_schedule.gmeet_link
                        db.add(group)
                        db.commit()
                except ValueError:
                    group = db.query(PanelGroup).filter(PanelGroup.name == candidate.panel_group_id).first()
                    if group:
                        group.meet_link = prior_schedule.gmeet_link
                        db.add(group)
                        db.commit()


        # Update candidate application status to "Scheduled"
        if not application and job_id:
            application = db.query(CandidateApplication).filter(
                CandidateApplication.candidate_id == data.candidate_id,
                CandidateApplication.role_id == job_id
            ).order_by(CandidateApplication.created_at.desc()).first()

        if application:
            application.status = "Scheduled"
            db.add(application)
            db.commit()

        # Update candidate status to "Scheduled"
        candidate.status = "Scheduled"
        db.add(candidate)
        db.commit()

        if application:
            try:
                NotificationService.create_activity_and_notify(
                    db=db,
                    candidate_id=candidate.id,
                    user_id=candidate.user_id,
                    activity_type=ActivityType.INTERVIEW_SCHEDULED,
                    activity_title=f"Interview scheduled for {application.role.title if application.role else 'your role'}",
                    notification_title="Interview Scheduled",
                    notification_message=f"Your interview has been scheduled for {target_date} from {start_time} to {end_time}.",
                    reference_id=application.id,
                    notification_type=NotificationType.SUCCESS,
                    icon="calendar",
                    priority="high",
                    redirect_url=f"/applications/{application.id}"
                )
            except Exception as notif_error:
                print(f"Failed to create notification: {notif_error}")

        # Step 5: Queue Celery task only for online interviews
        if not is_offline:
            schedule_interview_task.delay(schedule.id, data.candidate_id)
        else:
            # For offline interviews, just mark as scheduled without gmeet link
            schedule.interview_status = "scheduled"
            db.add(schedule)
            db.commit()

        if is_offline:
            return {
                "status": "scheduled",
                "message": f"Interview scheduled for {target_date} {start_time}-{end_time} at venue: {venue or 'TBD'}",
                "schedule_id": schedule.id,
                "venue": venue,
                "mode": "offline"
            }

        return {
            "status": "queued",
            "message": f"Interview scheduled for {target_date} {start_time}-{end_time}. n8n will generate Google Meet link.",
            "schedule_id": schedule.id
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# ============ Candidate Management ============

class CandidateAdminDetail(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = ""
    role: str
    status: str
    interviewDate: Optional[str] = None
    interviewTime: Optional[str] = None
    mode: str
    panelId: Optional[str] = ""
    panelGroupId: Optional[str] = ""
    panelIds: List[int] = []  # Panel IDs from interview schedule (JSON)
    profileComplete: int
    avatar: str
    skills: List[str]
    experience: str
    education: str
    resumeUrl: Optional[str] = None
    meetLink: Optional[str] = None
    venue: Optional[str] = None
    appliedDate: str
    roleId: Optional[int] = None
    rejectionReason: Optional[str] = None
    userId: Optional[int] = None


class UpdateCandidateStatusRequest(BaseModel):
    status: str
    rejection_reason: Optional[str] = None


class ReassignCandidatePanelRequest(BaseModel):
    panel_id: str
    panel_group_id: str


class RescheduleInterviewRequest(BaseModel):
    date: str
    start_time: str
    end_time: str
    interview_level: Optional[str] = None
    interview_mode: Optional[str] = None
    venue: Optional[str] = None


@router.get("/candidates", response_model=List[CandidateAdminDetail])
def get_admin_candidates():
    db = SessionLocal()
    try:
        candidates = db.query(Candidate).all()
        result = []
        for c in candidates:
            # 1. Fetch latest application
            application = db.query(CandidateApplication).filter(
                CandidateApplication.candidate_id == c.id
            ).order_by(CandidateApplication.created_at.desc()).first()
            
            role_title = "No Applied Role"
            app_status = c.status
            from app.database import ist_now
            applied_date_str = c.created_at.isoformat() if c.created_at else ist_now().isoformat()
            job_type = "Online"
            venue = None
            job_id = None
            
            if application:
                role_title = application.role.title if application.role else "Unknown Role"
                app_status = application.status
                applied_date_str = application.created_at.isoformat()
                job_type = application.role.job_type if application.role else "Online"
                venue = application.role.venue if application.role else None
                job_id = application.role_id

            # 2. Fetch latest interview schedule
            schedule = db.query(InterviewSchedule).filter(
                InterviewSchedule.candidate_id == c.id,
                InterviewSchedule.interview_status != "cancelled"
            ).order_by(InterviewSchedule.created_at.desc()).first()
            if not schedule:
                schedule = db.query(InterviewSchedule).filter(
                    InterviewSchedule.candidate_id == c.id
                ).order_by(InterviewSchedule.created_at.desc()).first()

            interview_date = None
            interview_time = None
            meet_link = None
            schedule_panel_ids = []

            mode_val = job_type
            if schedule:
                interview_date = schedule.date.isoformat() if schedule.date else None
                if schedule.start_time and schedule.end_time:
                    start_str = schedule.start_time.strftime("%I:%M %p")
                    end_str = schedule.end_time.strftime("%I:%M %p")
                    interview_time = f"{start_str} - {end_str}"
                elif schedule.start_time:
                    interview_time = schedule.start_time.strftime("%I:%M %p")
                
                if schedule.interview_mode and schedule.interview_mode.lower() == "offline":
                    mode_val = "Offline"
                    venue = schedule.gmeet_link or venue
                    meet_link = None
                else:
                    mode_val = schedule.interview_mode.capitalize() if schedule.interview_mode else "Online"
                    venue = None
                    meet_link = schedule.gmeet_link
                # Parse panel_ids from JSON string (e.g., "[1,2,3,4,5]")
                if schedule.panel_id:
                    try:
                        schedule_panel_ids = json.loads(schedule.panel_id)
                    except (json.JSONDecodeError, TypeError):
                        schedule_panel_ids = []

            if app_status not in ["Hired", "Rejected"]:
                if schedule and schedule.interview_status in ["pending", "scheduled"]:
                    app_status = "Scheduled"
                elif schedule and schedule.interview_status == "completed":
                    app_status = "Completed"

            # 3. Calculate profileComplete
            profile_pct = 60
            if c.phone:
                profile_pct += 10
            if c.resume_path:
                profile_pct += 10
            if c.education_list:
                profile_pct += 10
            if c.experience_list:
                profile_pct += 10
            if profile_pct > 100:
                profile_pct = 100

            # 4. Format skills
            skills_list = [s.strip() for s in c.skills.split(",") if s.strip()] if c.skills else []

            # 5. Format experience summary
            exp_str = "No experience listed"
            if c.experience_list:
                latest_exp = c.experience_list[0]
                exp_str = f"{latest_exp.years_experience} years as {latest_exp.current_role} at {latest_exp.company}"

            # 6. Format education summary
            edu_str = "No education listed"
            if c.education_list:
                latest_edu = c.education_list[0]
                edu_str = f"{latest_edu.degree} from {latest_edu.university} (Class of {latest_edu.graduation_year})"

            # 7. Resume URL
            resume_url = None
            if c.resume_path:
                if c.resume_path.startswith("http"):
                    resume_url = c.resume_path
                else:
                    # Return relative path - frontend will construct full URL
                    resume_url = c.resume_path

            avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={c.id}"

            result.append(
                CandidateAdminDetail(
                    id=str(c.id),
                    name=c.full_name,
                    email=c.email,
                    phone=c.phone or "",
                    role=role_title,
                    status=app_status,
                    interviewDate=interview_date,
                    interviewTime=interview_time,
                    mode=mode_val,
                    panelId=c.panel_id or "",
                    panelGroupId=c.panel_group_id or "",
                    panelIds=schedule_panel_ids,
                    profileComplete=profile_pct,
                    avatar=avatar_url,
                    skills=skills_list,
                    experience=exp_str,
                    education=edu_str,
                    resumeUrl=resume_url,
                    meetLink=meet_link,
                    venue=venue,
                    appliedDate=applied_date_str,
                    roleId=job_id,
                    rejectionReason=c.rejection_reason,
                    userId=c.user_id
                )
            )
        return result
    finally:
        db.close()


@router.get("/candidates/export-excel")
def export_candidates_excel(
    search: Optional[str] = None,
    status: Optional[str] = None,
    panelGroupId: Optional[str] = None,
    role: Optional[str] = None,
    mode: Optional[str] = None
):
    """
    Export matching candidates and their application details directly to Excel.
    """
    db = SessionLocal()
    try:
        candidates = db.query(Candidate).all()
        filtered_candidates = []
        
        for c in candidates:
            # 1. Fetch latest application
            application = db.query(CandidateApplication).filter(
                CandidateApplication.candidate_id == c.id
            ).order_by(CandidateApplication.created_at.desc()).first()
            
            role_id = ""
            role_name = ""
            app_status = c.status
            
            if application:
                role_id = application.role_id
                role_name = application.role.title if application.role else "Unknown Role"
                app_status = application.status

            # Match frontend filtering
            if search and search.lower() not in c.full_name.lower():
                continue
            if status and status != "all" and app_status != status:
                continue
            if panelGroupId and panelGroupId != "all" and c.panel_group_id != panelGroupId:
                continue
            if role and role != "all" and role_name != role:
                continue

            # Fetch schedule information
            sched_date = ""
            sched_start = ""
            sched_end = ""
            sched_mode = ""
            
            if role_id:
                sched_obj = db.query(InterviewSchedule).filter(
                    InterviewSchedule.candidate_id == c.id,
                    InterviewSchedule.job_id == role_id,
                    InterviewSchedule.interview_status != "cancelled"
                ).order_by(InterviewSchedule.created_at.desc()).first()
                if sched_obj:
                    sched_date = sched_obj.date.isoformat() if sched_obj.date else ""
                    sched_start = sched_obj.start_time.strftime("%H:%M") if sched_obj.start_time else ""
                    sched_end = sched_obj.end_time.strftime("%H:%M") if sched_obj.end_time else ""
                    sched_mode = sched_obj.interview_mode or "online"

            if mode and mode != "all":
                actual_mode = sched_mode or "online"
                if not sched_date:
                    continue
                if mode.lower() != actual_mode.lower():
                    continue

            filtered_candidates.append({
                "id": c.id,
                "name": c.full_name,
                "email": c.email,
                "mobile": c.phone or "",
                "role_id": role_id,
                "role_name": role_name,
                "status": app_status,
                "sched_date": sched_date,
                "sched_start": sched_start,
                "sched_end": sched_end,
                "sched_mode": sched_mode
            })
            
        # Create a new workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Candidates"
        
        # Headers
        headers = [
            "Candidate ID", "Name", "Email", "Mobile", "Role ID", "Role Name", "Status",
            "Interview Date (YYYY-MM-DD)", "Start Time (HH:MM)", "End Time (HH:MM)", "Interview Mode (Online/Offline)"
        ]
        ws.append(headers)
        
        for fc in filtered_candidates:
            ws.append([
                fc["id"],
                fc["name"],
                fc["email"],
                fc["mobile"],
                fc["role_id"],
                fc["role_name"],
                fc["status"],
                fc["sched_date"],
                fc["sched_start"],
                fc["sched_end"],
                fc["sched_mode"]
            ])
            
        # Style headers
        from openpyxl.styles import Font, PatternFill, Alignment
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        for col_idx in range(1, 12):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")
            
        # Set column widths automatically
        for col in ws.columns:
            vals = [cell.value for cell in col]
            max_len = max(len(str(v or '')) for v in vals)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)
            
        # Save to BytesIO
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = f"candidates_export_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
        headers_resp = {
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers_resp
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.put("/candidates/{candidate_id}/status")
def update_candidate_status(candidate_id: int, data: UpdateCandidateStatusRequest):
    db = SessionLocal()
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Update candidate status
        candidate.status = data.status
        if data.status == "Rejected":
            candidate.rejection_reason = data.rejection_reason
        db.add(candidate)
        
        from app.services.history_service import record_candidate_history
        details_str = f"Status updated to {data.status}"
        if data.status == "Rejected" and data.rejection_reason:
            details_str += f": {data.rejection_reason}"
        record_candidate_history(
            db=db,
            candidate_id=candidate.id,
            action=data.status,
            interview_level=candidate.current_level or "Level 1",
            details=details_str
        )

        # Also update latest application status
        application = db.query(CandidateApplication).filter(
            CandidateApplication.candidate_id == candidate_id
        ).order_by(CandidateApplication.created_at.desc()).first()
        
        if application:
            application.status = data.status
            db.add(application)

        # Also sync active interview_schedule status
        schedule = db.query(InterviewSchedule).filter(
            InterviewSchedule.candidate_id == candidate_id,
            InterviewSchedule.interview_status.in_(["pending", "scheduled"])
        ).order_by(InterviewSchedule.created_at.desc()).first()
        if schedule:
            if data.status == "Rejected":
                schedule.interview_status = "cancelled"
                db.add(schedule)
            elif data.status == "Completed":
                schedule.interview_status = "completed"
                db.add(schedule)
            
            try:
                NotificationService.create_activity_and_notify(
                    db=db,
                    candidate_id=candidate.id,
                    user_id=candidate.user_id,
                    activity_type=ActivityType.PROFILE_UPDATED,
                    activity_title=f"Application status updated to {data.status}",
                    notification_title="Application Status Updated",
                    notification_message=f"Your application status for {application.role.title if application.role else 'your role'} has been updated to {data.status}.",
                    reference_id=application.id,
                    notification_type=NotificationType.INFO,
                    icon="info",
                    priority="medium",
                    redirect_url=f"/profile"
                )
            except Exception as notif_error:
                print(f"Failed to create notification: {notif_error}")
        
        # Send selection/hired email notification if status is "Hired"
        if data.status == "Hired":
            from app.workers.tasks import send_email_async_task
            email_body = (
                f"Dear {candidate.full_name},\n\n"
                f"Congratulations! We are pleased to inform you that you have been selected "
                f"for the {application.role.title if application and application.role else 'position'} role.\n\n"
                f"Our HR team will reach out to you shortly with the official offer letter and next steps.\n\n"
                f"Best Regards,\n"
                f"Recruitment Team"
            )
            send_email_async_task.delay(candidate.email, "Job Offer Selection - Congratulations!", email_body)

        db.commit()
        return {"status": "success", "message": f"Candidate status updated to {data.status}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.put("/candidates/{candidate_id}/reassign")
def reassign_candidate_panel(candidate_id: int, data: ReassignCandidatePanelRequest):
    db = SessionLocal()
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        candidate.panel_id = data.panel_id
        candidate.panel_group_id = data.panel_group_id
        db.add(candidate)
        
        # Find latest pending schedule for candidate
        application = db.query(CandidateApplication).filter(
            CandidateApplication.candidate_id == candidate_id
        ).order_by(CandidateApplication.created_at.desc()).first()
        job_id = application.role_id if application else None
        
        schedule = db.query(InterviewSchedule).filter(
            InterviewSchedule.candidate_id == candidate_id,
            InterviewSchedule.job_id == job_id,
            InterviewSchedule.interview_status != "cancelled"
        ).order_by(InterviewSchedule.created_at.desc()).first()
        
        if not schedule:
            raise HTTPException(
                status_code=400,
                detail="Candidate does not have a scheduled interview slot. Please schedule date and time first."
            )
            
        # Check if first time or reassigned panel
        old_panel_id = schedule.panel_id

        # Update schedule with panel
        schedule.panel_id = data.panel_id
        db.add(schedule)
        
        # Reuse existing gmeet_link if any
        existing_gmeet_link = schedule.gmeet_link
        if not existing_gmeet_link:
            prior_schedule = db.query(InterviewSchedule).filter(
                InterviewSchedule.candidate_id == candidate_id,
                InterviewSchedule.gmeet_link.isnot(None),
                InterviewSchedule.gmeet_link != ""
            ).order_by(InterviewSchedule.created_at.desc()).first()
            if prior_schedule:
                existing_gmeet_link = prior_schedule.gmeet_link
                schedule.gmeet_link = existing_gmeet_link
                db.add(schedule)

        # Update PanelGroup's meet_link dynamically based on candidate's interview slot
        if existing_gmeet_link and data.panel_group_id:
            from app.models.panel_group import PanelGroup
            try:
                group_id = int(data.panel_group_id)
                group = db.query(PanelGroup).filter(PanelGroup.id == group_id).first()
                if group:
                    group.meet_link = existing_gmeet_link
                    db.add(group)
            except ValueError:
                group = db.query(PanelGroup).filter(PanelGroup.name == data.panel_group_id).first()
                if group:
                    group.meet_link = existing_gmeet_link
                    db.add(group)

        # Trigger Celery task to generate meeting link / send emails
        is_first_panel_assignment = not old_panel_id
        is_panel_reassignment = bool(old_panel_id and old_panel_id != data.panel_id)
        schedule_interview_task.delay(
            schedule.id,
            candidate.id,
            is_first_panel_assignment=is_first_panel_assignment,
            is_panel_reassignment=is_panel_reassignment
        )
        
        # Update candidate status to Scheduled
        candidate.status = "Scheduled"
        if application:
            application.status = "Scheduled"
            db.add(application)

        from app.services.history_service import record_candidate_history
        record_candidate_history(
            db=db,
            candidate_id=candidate.id,
            action="Assigned Panel",
            interview_level=candidate.current_level or "Level 1",
            details="Panel assigned and interview schedule activated"
        )
        record_candidate_history(
            db=db,
            candidate_id=candidate.id,
            action="Scheduled",
            interview_level=candidate.current_level or "Level 1",
            details=f"Interview slot active for {schedule.date} {schedule.start_time.strftime('%I:%M %p') if schedule.start_time else ''}"
        )
            
        # Create activity and notify candidate
        try:
            NotificationService.create_activity_and_notify(
                db=db,
                candidate_id=candidate.id,
                user_id=candidate.user_id,
                activity_type=ActivityType.PROFILE_UPDATED,
                activity_title="Interview Panel Assigned",
                notification_title="Panel Assigned",
                notification_message="An interview panel group and category have been assigned to you. The scheduling workflow has been started.",
                reference_id=application.id if application else None,
                notification_type=NotificationType.INFO,
                icon="users",
                priority="medium",
                redirect_url=f"/profile"
            )
        except Exception as notif_error:
            print(f"Failed to create notification: {notif_error}")

        # Notify assigned panel members and schedule 1-hour reminder
        try:
            cand_panels = []
            if candidate.panel_id:
                try:
                    parsed = json.loads(candidate.panel_id)
                    if isinstance(parsed, list):
                        cand_panels = db.query(Panel).filter(Panel.id.in_(parsed)).all()
                    else:
                        cand_panels = db.query(Panel).filter(Panel.id == int(parsed)).all()
                except Exception:
                    try:
                        cand_panels = db.query(Panel).filter(Panel.id == int(candidate.panel_id)).all()
                    except Exception:
                        p_by_name = db.query(Panel).filter(Panel.hr_panelists_name == candidate.panel_id).first()
                        if p_by_name:
                            cand_panels = [p_by_name]

            if not cand_panels and candidate.panel_group_id:
                group = None
                try:
                    group_id = int(candidate.panel_group_id)
                    group = db.query(PanelGroup).filter(PanelGroup.id == group_id).first()
                except Exception:
                    group = db.query(PanelGroup).filter(PanelGroup.name == candidate.panel_group_id).first()
                if group:
                    cand_panels = group.panels

            role_title = application.role.title if (application and application.role) else "Applied Role"
            
            # Send immediate notification to each panelist
            for p in cand_panels:
                if p.user_id:
                    NotificationService.create_notification(
                        db=db,
                        user_id=p.user_id,
                        title="New Interview Assigned",
                        message=f"You have been assigned to interview {candidate.full_name} for the {role_title} role on {schedule.date.strftime('%Y-%m-%d') if schedule.date else 'scheduled date'} at {schedule.start_time.strftime('%I:%M %p') if schedule.start_time else ''}.",
                        notification_type=NotificationType.INFO,
                        candidate_id=candidate.id,
                        icon="calendar",
                        priority="medium",
                        redirect_url="/panel/schedule"
                    )
            
            # Schedule 1-hour pre-interview reminder
            if schedule.date and schedule.start_time:
                IST = ZoneInfo('Asia/Kolkata')
                start_datetime_tz = datetime.combine(schedule.date, schedule.start_time).replace(tzinfo=IST)
                now_ist = datetime.now(IST)
                reminder_time_tz = start_datetime_tz - timedelta(hours=1)
                
                if reminder_time_tz > now_ist:
                    eta_utc = reminder_time_tz.astimezone(ZoneInfo('UTC')).replace(tzinfo=None)
                    send_interview_reminder_task.apply_async(args=[schedule.id], eta=eta_utc)
                    print(f"Scheduled Celery 1-hour reminder at {eta_utc} UTC")
                else:
                    send_interview_reminder_task.delay(schedule.id)
                    
        except Exception as panel_notif_error:
            print(f"Failed to create panelist notification: {panel_notif_error}")
            
        db.commit()
        return {"status": "success", "message": "Panel assigned and scheduling workflow started."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


class ImportSelectedResponse(BaseModel):
    status: str
    message: str
    updated_count: int
    skipped_count: int
    errors: List[dict] = []


@router.post("/candidates/import-selected", response_model=ImportSelectedResponse)
async def import_selected_candidates(file: UploadFile = File(...)):
    """
    Import candidates from Excel file and transition Applied status to Uploaded.
    Optionally sets scheduling details if columns are present.
    """
    db = SessionLocal()
    updated_count = 0
    skipped_count = 0
    errors = []
    
    try:
        content = await file.read()
        workbook = openpyxl.load_workbook(io.BytesIO(content))
        worksheet = workbook.active
        
        # Get headers from first row
        headers = [str(cell.value).strip() if cell.value is not None else "" for cell in worksheet[1]]
        
        # Find column indices (0-indexed)
        try:
            id_col = headers.index("Candidate ID")
        except ValueError:
            raise HTTPException(status_code=400, detail="Missing required column: 'Candidate ID'")
            
        date_col = headers.index("Interview Date (YYYY-MM-DD)") if "Interview Date (YYYY-MM-DD)" in headers else -1
        start_col = headers.index("Start Time (HH:MM)") if "Start Time (HH:MM)" in headers else -1
        end_col = headers.index("End Time (HH:MM)") if "End Time (HH:MM)" in headers else -1
        mode_col = headers.index("Interview Mode (Online/Offline)") if "Interview Mode (Online/Offline)" in headers else -1
        
        for row_idx, row in enumerate(
            worksheet.iter_rows(min_row=2, values_only=True),
            start=2
        ):
            candidate_id_raw = row[id_col]
            if candidate_id_raw is None:
                continue
                
            try:
                candidate_id = int(str(candidate_id_raw).replace("candidate-", "").strip())
            except ValueError:
                errors.append({
                    "row": row_idx,
                    "error": f"Invalid Candidate ID: {candidate_id_raw}"
                })
                skipped_count += 1
                continue
                
            # Find candidate
            candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
            if not candidate:
                errors.append({
                    "row": row_idx,
                    "error": f"Candidate with ID {candidate_id} not found"
                })
                skipped_count += 1
                continue
                
            # Check status is Applied
            # User requirement: "remember this should affect only applied candidate status not candidate who are already selected and waiting for interview scheduled"
            # Application status is where we check
            application = db.query(CandidateApplication).filter(
                CandidateApplication.candidate_id == candidate.id
            ).order_by(CandidateApplication.created_at.desc()).first()
            
            current_status = application.status if application else candidate.status
            
            if current_status != "Applied":
                skipped_count += 1
                continue
                
            # Update status to Selected
            candidate.status = "Selected"
            if application:
                application.status = "Selected"
                db.add(application)
            db.add(candidate)
            
            # Parse and set schedule if cols are available and filled
            if date_col != -1 and start_col != -1 and end_col != -1:
                date_val = row[date_col]
                start_val = row[start_col]
                end_val = row[end_col]
                mode_val = row[mode_col] if mode_col != -1 else "Online"
                
                if date_val and start_val and end_val:
                    try:
                        # Parse date
                        if isinstance(date_val, (datetime, date)):
                            target_date = date_val if isinstance(date_val, date) else date_val.date()
                        else:
                            target_date = datetime.strptime(str(date_val).strip(), "%Y-%m-%d").date()
                            
                        # Parse times
                        if isinstance(start_val, time):
                            start_time = start_val
                        else:
                            start_time = datetime.strptime(str(start_val).strip(), "%H:%M").time()
                            
                        if isinstance(end_val, time):
                            end_time = end_val
                        else:
                            end_time = datetime.strptime(str(end_val).strip(), "%H:%M").time()
                            
                        mode_str = str(mode_val).strip().lower() if mode_val else "online"
                        if mode_str not in ["online", "offline"]:
                            mode_str = "online"
                            
                        # Fetch or create InterviewSchedule
                        job_id = application.role_id if application else None
                        
                        # Determine next level
                        next_lvl = "Level 1"
                        if job_id:
                            role = application.role
                            if role:
                                levels_str = role.level or ""
                                if levels_str:
                                    role_levels = [l.strip() for l in levels_str.split(",") if l.strip()]
                                    completed_scheds = db.query(InterviewSchedule).filter(
                                        InterviewSchedule.candidate_id == candidate.id,
                                        InterviewSchedule.job_id == job_id,
                                        InterviewSchedule.interview_status == "completed"
                                    ).all()
                                    completed_lvls = [s.interview_level for s in completed_scheds if s.interview_level]
                                    for lvl in role_levels:
                                        if lvl not in completed_lvls:
                                            next_lvl = lvl
                                            break
                                        
                        schedule = db.query(InterviewSchedule).filter(
                            InterviewSchedule.candidate_id == candidate.id,
                            InterviewSchedule.job_id == job_id,
                            InterviewSchedule.interview_status != "cancelled"
                        ).order_by(InterviewSchedule.created_at.desc()).first()
                        
                        if schedule and schedule.interview_status == "pending":
                            schedule.date = target_date
                            schedule.start_time = start_time
                            schedule.end_time = end_time
                            schedule.interview_mode = mode_str
                            schedule.interview_level = next_lvl
                            db.add(schedule)
                        else:
                            schedule = InterviewSchedule(
                                candidate_id=candidate.id,
                                job_id=job_id,
                                date=target_date,
                                start_time=start_time,
                                end_time=end_time,
                                interview_mode=mode_str,
                                interview_level=next_lvl,
                                interview_status="pending"
                            )
                            db.add(schedule)
                        candidate.current_level = next_lvl
                        db.add(candidate)
                    except Exception as parse_err:
                        errors.append({
                            "row": row_idx,
                            "error": f"Failed to parse schedule: {str(parse_err)}"
                        })
                        
            updated_count += 1
            
        db.commit()
        return {
            "status": "success" if len(errors) == 0 else "partial",
            "message": f"Successfully updated {updated_count} candidates to Selected.",
            "updated_count": updated_count,
            "skipped_count": skipped_count,
            "errors": errors
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/candidates/{candidate_id}/next-level-info")
def get_next_level_info(candidate_id: int):
    db = SessionLocal()
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        application = db.query(CandidateApplication).filter(
            CandidateApplication.candidate_id == candidate_id
        ).order_by(CandidateApplication.created_at.desc()).first()
        
        if not application or not application.role:
            return {
                "next_level": candidate.current_level or "Level 1",
                "completed_levels": [],
                "role_levels": ["Level 1"]
            }
        
        role = application.role
        role_levels = parse_role_levels(role.level)
        
        # Get previous completed interview schedules
        completed_schedules = db.query(InterviewSchedule).filter(
            InterviewSchedule.candidate_id == candidate_id,
            InterviewSchedule.job_id == role.id,
            InterviewSchedule.interview_status == "completed"
        ).all()
        
        completed_levels = [s.interview_level for s in completed_schedules if s.interview_level]
        
        # Suggested next level
        next_level = candidate.current_level
        if not next_level or next_level in completed_levels:
            for lvl in role_levels:
                if lvl not in completed_levels:
                    next_level = lvl
                    break
        if not next_level:
            next_level = f"Level {len(completed_levels) + 1}"
            
        return {
            "next_level": next_level,
            "completed_levels": completed_levels,
            "role_levels": role_levels
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


class ScheduleManualRequest(BaseModel):
    date: str
    start_time: str
    end_time: str
    interview_mode: str
    interview_level: Optional[str] = None
    venue: Optional[str] = None


@router.post("/candidates/{candidate_id}/schedule-manual")
def schedule_manual(candidate_id: int, data: ScheduleManualRequest):
    db = SessionLocal()
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
            
        try:
            target_date = datetime.strptime(data.date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")
            
        try:
            start_time = datetime.strptime(data.start_time, "%H:%M").time()
            end_time = datetime.strptime(data.end_time, "%H:%M").time()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Expected HH:MM")
            
        application = db.query(CandidateApplication).filter(
            CandidateApplication.candidate_id == candidate_id
        ).order_by(CandidateApplication.created_at.desc()).first()
        job_id = application.role_id if application else None
        
        # Fetch or create InterviewSchedule
        schedule = db.query(InterviewSchedule).filter(
            InterviewSchedule.candidate_id == candidate_id,
            InterviewSchedule.job_id == job_id,
            InterviewSchedule.interview_status != "cancelled"
        ).order_by(InterviewSchedule.created_at.desc()).first()
        
        if schedule and schedule.interview_status == "pending":
            schedule.date = target_date
            schedule.start_time = start_time
            schedule.end_time = end_time
            schedule.interview_mode = data.interview_mode.lower()
            schedule.interview_level = data.interview_level
            db.add(schedule)
        else:
            schedule = InterviewSchedule(
                candidate_id=candidate_id,
                job_id=job_id,
                date=target_date,
                start_time=start_time,
                end_time=end_time,
                interview_mode=data.interview_mode.lower(),
                interview_level=data.interview_level,
                interview_status="pending"
            )
            db.add(schedule)
        if data.interview_level:
            candidate.current_level = data.interview_level
            db.add(candidate)

        # Handle gmeet_link vs venue based on interview mode
        if data.interview_mode.lower() == "offline":
            schedule.gmeet_link = data.venue
            db.add(schedule)
        else:
            # Online mode: if the old mode was offline (meaning gmeet_link was a venue), clear it first!
            if schedule.interview_mode and schedule.interview_mode.lower() == "offline":
                schedule.gmeet_link = None
            
            # Reuse existing gmeet_link if any
            if not schedule.gmeet_link:
                prior_schedule = db.query(InterviewSchedule).filter(
                    InterviewSchedule.candidate_id == candidate_id,
                    InterviewSchedule.gmeet_link.isnot(None),
                    InterviewSchedule.gmeet_link != "",
                    InterviewSchedule.interview_mode != "offline"
                ).order_by(InterviewSchedule.created_at.desc()).first()
                if prior_schedule:
                    schedule.gmeet_link = prior_schedule.gmeet_link
                    db.add(schedule)

        # Update PanelGroup's meet_link directly
        if schedule.gmeet_link and candidate.panel_group_id:
            from app.models.panel_group import PanelGroup
            try:
                group_id = int(candidate.panel_group_id)
                group = db.query(PanelGroup).filter(PanelGroup.id == group_id).first()
                if group:
                    group.meet_link = schedule.gmeet_link
                    db.add(group)
            except ValueError:
                group = db.query(PanelGroup).filter(PanelGroup.name == candidate.panel_group_id).first()
                if group:
                    group.meet_link = schedule.gmeet_link
                    db.add(group)
            
        # Update candidate status to Selected
        candidate.status = "Selected"
        if application:
            application.status = "Selected"
            db.add(application)

        from app.services.history_service import record_candidate_history
        record_candidate_history(
            db=db,
            candidate_id=candidate.id,
            action="Scheduled",
            interview_level=data.interview_level or candidate.current_level or "Level 1",
            details=f"Interview slot set for {data.date} {data.start_time}-{data.end_time} ({data.interview_mode})"
        )
            
        db.commit()
        return {"status": "success", "message": "Interview slot scheduled successfully. Awaiting panel assignment."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.put("/candidates/{candidate_id}/reschedule")
def reschedule_interview(candidate_id: int, data: RescheduleInterviewRequest):
    db = SessionLocal()
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        try:
            target_date = datetime.strptime(data.date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")
            
        try:
            target_start_time = datetime.strptime(data.start_time.split()[0], "%H:%M").time()
        except ValueError:
            try:
                target_start_time = datetime.strptime(data.start_time.split()[0], "%H:%M:%S").time()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start time format. Expected HH:MM")

        try:
            target_end_time = datetime.strptime(data.end_time.split()[0], "%H:%M").time()
        except ValueError:
            try:
                target_end_time = datetime.strptime(data.end_time.split()[0], "%H:%M:%S").time()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end time format. Expected HH:MM")

        time_str = f"{target_start_time.strftime('%I:%M %p')} - {target_end_time.strftime('%I:%M %p')}"

        schedule = db.query(InterviewSchedule).filter(
            InterviewSchedule.candidate_id == candidate_id,
            InterviewSchedule.interview_status != "cancelled"
        ).order_by(InterviewSchedule.created_at.desc()).first()

        job_id = None
        application = db.query(CandidateApplication).filter(
            CandidateApplication.candidate_id == candidate_id
        ).order_by(CandidateApplication.created_at.desc()).first()
        if application:
            job_id = application.role_id

        # Determine mode: request data overrides existing / role job type
        interview_mode = data.interview_mode or (schedule.interview_mode if schedule else None)
        if not interview_mode and application and application.role:
            interview_mode = application.role.job_type or "Online"
        
        if not interview_mode:
            interview_mode = "Online"
            
        is_offline = interview_mode.lower() == "offline"
        
        venue = data.venue if is_offline else None
        if is_offline and not venue:
            venue = (schedule.gmeet_link if schedule and schedule.interview_mode and schedule.interview_mode.lower() == "offline" else None) or (application.role.venue if application and application.role else None)

        if schedule:
            schedule.date = target_date
            schedule.start_time = target_start_time
            schedule.end_time = target_end_time
            schedule.interview_status = "pending"
            schedule.interview_mode = interview_mode.lower()
            if job_id:
                schedule.job_id = job_id
            if data.interview_level:
                schedule.interview_level = data.interview_level
                candidate.current_level = data.interview_level
                db.add(candidate)
            db.add(schedule)
        else:
            schedule = InterviewSchedule(
                candidate_id=candidate_id,
                job_id=job_id,
                date=target_date,
                start_time=target_start_time,
                end_time=target_end_time,
                interview_mode=interview_mode.lower(),
                interview_level=data.interview_level,
                interview_status="pending"
            )
            if data.interview_level:
                candidate.current_level = data.interview_level
                db.add(candidate)
            db.add(schedule)
        
        # Handle gmeet_link vs venue based on interview mode
        if is_offline:
            schedule.gmeet_link = venue
            db.add(schedule)
        else:
            # Online mode: clear the gmeet_link to force a new calendar invite and meet link generation via n8n for the new time
            schedule.gmeet_link = None
            db.add(schedule)

        # Update PanelGroup's meet_link directly
        if schedule.gmeet_link and candidate.panel_group_id:
            from app.models.panel_group import PanelGroup
            try:
                group_id = int(candidate.panel_group_id)
                group = db.query(PanelGroup).filter(PanelGroup.id == group_id).first()
                if group:
                    group.meet_link = schedule.gmeet_link
                    db.add(group)
            except ValueError:
                group = db.query(PanelGroup).filter(PanelGroup.name == candidate.panel_group_id).first()
                if group:
                    group.meet_link = schedule.gmeet_link
                    db.add(group)
        
        db.commit()
        db.refresh(schedule)

        if application and application.status != "Scheduled":
            application.status = "Scheduled"
            db.add(application)
            db.commit()

        if candidate.status != "Scheduled":
            candidate.status = "Scheduled"
            db.add(candidate)
            db.commit()

        from app.services.history_service import record_candidate_history
        record_candidate_history(
            db=db,
            candidate_id=candidate.id,
            action="Rescheduled",
            interview_level=data.interview_level or candidate.current_level or "Level 1",
            details=f"Interview slot rescheduled for {data.date} {time_str}"
        )
        db.commit()

        try:
            if is_offline:
                notif_message = f"Your interview has been rescheduled for {target_date} at {time_str} at venue: {venue or 'TBD'}."
            else:
                notif_message = f"Your interview has been rescheduled for {target_date} at {time_str}."
            NotificationService.create_activity_and_notify(
                db=db,
                candidate_id=candidate.id,
                user_id=candidate.user_id,
                activity_type=ActivityType.INTERVIEW_SCHEDULED,
                activity_title=f"Interview rescheduled for {application.role.title if application and application.role else 'your role'}",
                notification_title="Interview Rescheduled",
                notification_message=notif_message,
                reference_id=application.id if application else None,
                notification_type=NotificationType.SUCCESS,
                icon="calendar",
                priority="high",
                redirect_url=f"/profile"
            )
        except Exception as notif_error:
            print(f"Failed to create notification: {notif_error}")

        # Always trigger Celery task to send emails (and generate new gmeet link if online)
        schedule_interview_task.delay(schedule.id, candidate.id, is_reschedule=True)

        if is_offline:
            return {
                "status": "success",
                "message": f"Interview rescheduled to {target_date} {time_str} at venue: {venue or 'TBD'}.",
                "schedule_id": schedule.id,
                "venue": venue,
                "mode": "offline"
            }

        return {
            "status": "success",
            "message": f"Interview rescheduled to {target_date} {time_str}. n8n will generate Google Meet link.",
            "schedule_id": schedule.id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# ============ Roles Management ============

class AdminJobRoleResponse(BaseModel):
    id: str
    title: str
    location: str
    experience: str
    totalVacancy: int
    jobType: str
    venue: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    createdAt: str
    isVisible: bool


# ============ Excel Import ============

class ImportPanelResponse(BaseModel):
    status: str
    message: str
    imported_count: int
    failed_count: int
    duplicate_count: Optional[int] = 0
    errors: List[dict] = []


@router.post("/import-panels", response_model=ImportPanelResponse)
async def import_panels(file: UploadFile = File(...), admin_id: Optional[str] = None):
    """
    Import panel members from Excel file.

    Column A: full_name
    Column B: email
    Column C: password
    Column D: hr_panelist_grade (Designation / Specialization)
    Column E: hr_panel_mobile
    """

    db = SessionLocal()
    imported_count = 0
    failed_count = 0
    duplicate_count = 0
    errors = []
    seen_emails = set()

    try:
        content = await file.read()
        workbook = openpyxl.load_workbook(io.BytesIO(content))
        worksheet = workbook.active

        for row_idx, row in enumerate(
            worksheet.iter_rows(min_row=2, values_only=True),
            start=2
        ):
            if not row:
                continue

            # Skip if the entire row contains only None or empty strings
            if all(val is None or str(val).strip() == "" for val in row):
                continue

            # Helper to safely retrieve values from the row to avoid IndexError
            def get_val(r, idx):
                return r[idx] if idx < len(r) else None

            full_name = get_val(row, 0)
            email = get_val(row, 1)
            password = get_val(row, 2)

            # Skip if all required fields are empty
            if (not full_name or str(full_name).strip() == "") and \
               (not email or str(email).strip() == "") and \
               (not password or str(password).strip() == ""):
                continue

            try:
                hr_panelist_grade = get_val(row, 3)
                hr_panel_mobile = get_val(row, 4)

                if not full_name or not email or not password:
                    errors.append({
                        "row": row_idx,
                        "error": "Missing required fields: full_name, email, or password"
                    })
                    failed_count += 1
                    continue

                email_clean = str(email).strip().lower()
                if email_clean in seen_emails:
                    duplicate_count += 1
                    errors.append({
                        "row": row_idx,
                        "error": f"Duplicate email address inside uploaded file: {email}"
                    })
                    failed_count += 1
                    continue

                seen_emails.add(email_clean)

                existing_user = (
                    db.query(User)
                    .filter(User.email == str(email).strip())
                    .first()
                )

                if existing_user:
                    duplicate_count += 1
                    user = existing_user
                    if user.role != "panel" and user.role != "admin":
                        user.role = "panel"
                        db.add(user)
                        db.flush()
                else:
                    user = User(
                        full_name=str(full_name).strip(),
                        email=str(email).strip(),
                        password=str(password).strip(),
                        role="panel"
                    )
                    db.add(user)
                    db.flush()

                # Find or create corresponding Panel record for this user
                panel = db.query(Panel).filter(Panel.user_id == user.id).first()
                if panel:
                    panel.hr_panelists_name = user.full_name
                    panel.hr_panelist_grade = str(hr_panelist_grade).strip() if hr_panelist_grade else panel.hr_panelist_grade
                    panel.hr_panel_mobile = str(hr_panel_mobile).strip() if hr_panel_mobile else panel.hr_panel_mobile
                    if admin_id:
                        panel.hr_panelist_emp_id = admin_id
                else:
                    panel = Panel(
                        user_id=user.id,
                        hr_panelists_name=user.full_name,
                        hr_panelist_grade=str(hr_panelist_grade).strip() if hr_panelist_grade else None,
                        hr_panel_mobile=str(hr_panel_mobile).strip() if hr_panel_mobile else None,
                        hr_panelist_emp_id=admin_id if admin_id else None
                    )
                db.add(panel)
                db.commit()

                imported_count += 1

            except Exception as row_error:
                db.rollback()

                errors.append({
                    "row": row_idx,
                    "error": str(row_error)
                })

                failed_count += 1

        return {
            "status": "success" if failed_count == 0 else "partial",
            "message": f"Import completed. {imported_count} records imported, {failed_count} failed, {duplicate_count} duplicates found.",
            "imported_count": imported_count,
            "failed_count": failed_count,
            "duplicate_count": duplicate_count,
            "errors": errors
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        db.close()

@router.get("/download-panel-template")
def download_panel_template():
    """
    Download Excel template for importing panel members
    """
    try:
        template_io = ExcelService.create_panel_import_template()
        
        return StreamingResponse(
            iter([template_io.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=panel_import_template.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreateJobRoleRequest(BaseModel):
    title: str
    location: str
    experience: str
    totalVacancy: int
    jobType: str
    venue: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None


class ToggleVisibilityRequest(BaseModel):
    is_visible: bool


@router.get("/roles", response_model=List[AdminJobRoleResponse])
def get_admin_roles():
    db = SessionLocal()
    try:
        roles = db.query(JobRole).order_by(JobRole.id.desc()).all()
        result = []
        for r in roles:
            from app.database import ist_now
            created_str = r.created_at.strftime("%Y-%m-%d") if r.created_at else ist_now().strftime("%Y-%m-%d")
            result.append(
                AdminJobRoleResponse(
                    id=str(r.id),
                    title=r.title,
                    location=r.location,
                    experience=r.experience,
                    totalVacancy=r.total_vacancy,
                    jobType=r.job_type,
                    venue=r.venue,
                    level=r.level,
                    description=r.description,
                    createdAt=created_str,
                    isVisible=r.is_visible
                )
            )
        return result
    finally:
        db.close()


@router.post("/roles")
def create_job_role(data: CreateJobRoleRequest):
    db = SessionLocal()
    try:
        role = JobRole(
            title=data.title,
            location=data.location,
            experience=data.experience,
            total_vacancy=data.totalVacancy,
            job_type=data.jobType,
            venue=data.venue,
            level=data.level,
            description=data.description,
            is_visible=True
        )
        db.add(role)
        db.commit()
        db.refresh(role)
        return {
            "status": "success",
            "message": "Job role created successfully",
            "role_id": role.id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.put("/roles/{role_id}/visibility")
def toggle_job_role_visibility(role_id: int, data: ToggleVisibilityRequest):
    db = SessionLocal()
    try:
        role = db.query(JobRole).filter(JobRole.id == role_id).first()
        if not role:
            raise HTTPException(status_code=404, detail="Job role not found")
        
        role.is_visible = data.is_visible
        db.add(role)
        db.commit()
        
        status_text = "visible" if data.is_visible else "hidden"
        return {
            "status": "success",
            "message": f"Job role visibility updated to {status_text}"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.delete("/roles/{role_id}")
def delete_job_role(role_id: int):
    db = SessionLocal()
    try:
        role = db.query(JobRole).filter(JobRole.id == role_id).first()
        if not role:
            raise HTTPException(status_code=404, detail="Job role not found")
        
        # Soft delete: set visibility to False to avoid foreign key issues
        role.is_visible = False
        db.add(role)
        db.commit()
        return {
            "status": "success",
            "message": "Job role deactivated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/panels/busy")
def get_busy_panels(date_str: str, start_time_str: str, end_time_str: str):
    """
    Get a list of panel IDs that are busy (have overlapping scheduled interviews)
    on the given date and time range.
    """
    db = SessionLocal()
    try:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")
            
        try:
            def parse_time(t_str):
                t_str = t_str.strip()
                t_str = " ".join(t_str.split())
                for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M%p"):
                    try:
                        return datetime.strptime(t_str, fmt).time()
                    except ValueError:
                        continue
                raise ValueError(f"Invalid time format: {t_str}")
                
            start_time = parse_time(start_time_str)
            end_time = parse_time(end_time_str)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
            
        # Query overlapping schedules
        overlapping = db.query(InterviewSchedule).filter(
            InterviewSchedule.date == target_date,
            InterviewSchedule.interview_status != "cancelled",
            InterviewSchedule.start_time < end_time,
            InterviewSchedule.end_time > start_time
        ).all()
        
        busy_ids = []
        for s in overlapping:
            if s.panel_id:
                try:
                    p_ids = json.loads(s.panel_id)
                    if isinstance(p_ids, list):
                        busy_ids.extend([str(pid) for pid in p_ids])
                    else:
                        busy_ids.append(str(p_ids))
                except Exception:
                    busy_ids.append(s.panel_id)
                    
        return {"busy_panel_ids": list(set(busy_ids))}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


class PanelListResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    user_id: Optional[int] = None
    interview_type: Optional[str] = None
    panel_group_id: Optional[int] = None
    hr_panelist_grade: Optional[str] = None
    hr_panel_mobile: Optional[str] = None
    hr_panelist_emp_id: Optional[str] = None


@router.get("/panels", response_model=List[PanelListResponse])
def get_db_panels():
    db = SessionLocal()
    try:
        panels = db.query(Panel).all()
        result = []
        for p in panels:
            name = p.hr_panelists_name
            email = None
            if p.user_id:
                user = db.query(User).filter(User.id == p.user_id).first()
                if user:
                    if not name:
                        name = user.full_name
                    email = user.email
            if not name:
                name = f"Panel {p.id}"
            result.append(
                PanelListResponse(
                    id=p.id,
                    name=name,
                    email=email,
                    user_id=p.user_id,
                    interview_type=p.hr_panelist_grade,
                    panel_group_id=p.panel_group_id,
                    hr_panelist_grade=p.hr_panelist_grade,
                    hr_panel_mobile=p.hr_panel_mobile,
                    hr_panelist_emp_id=p.hr_panelist_emp_id
                )
            )
        return result
    finally:
        db.close()


class PanelGroupCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    max_candidates: Optional[int] = 0


class PanelMemberResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    user_id: Optional[int] = None
    interview_type: Optional[str] = None
    hr_panelist_grade: Optional[str] = None
    hr_panel_mobile: Optional[str] = None
    hr_panelist_emp_id: Optional[str] = None


class PanelGroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    meet_link: Optional[str] = None
    max_candidates: Optional[int] = 0
    members: List[PanelMemberResponse] = []


class AssignPanelGroupRequest(BaseModel):
    panel_group_id: Optional[int] = None


@router.post("/panel-groups", response_model=PanelGroupResponse)
def create_panel_group(data: PanelGroupCreateRequest):
    db = SessionLocal()
    try:
        existing = db.query(PanelGroup).filter(PanelGroup.name == data.name.strip()).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Panel group '{data.name}' already exists.")
            
        group = PanelGroup(
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
            max_candidates=data.max_candidates or 0
        )
        db.add(group)
        db.commit()
        db.refresh(group)
        return PanelGroupResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            meet_link=group.meet_link,
            max_candidates=group.max_candidates,
            members=[]
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/panel-groups", response_model=List[PanelGroupResponse])
def list_panel_groups():
    db = SessionLocal()
    try:
        groups = db.query(PanelGroup).all()
        result = []
        for g in groups:
            members = []
            for p in g.panels:
                name = p.hr_panelists_name
                email = None
                if p.user_id:
                    user = db.query(User).filter(User.id == p.user_id).first()
                    if user:
                        if not name:
                            name = user.full_name
                        email = user.email
                if not name:
                    name = f"Panel {p.id}"
                members.append(
                    PanelMemberResponse(
                        id=p.id,
                        name=name,
                        email=email,
                        user_id=p.user_id,
                        interview_type=p.hr_panelist_grade,
                        hr_panelist_grade=p.hr_panelist_grade,
                        hr_panel_mobile=p.hr_panel_mobile,
                        hr_panelist_emp_id=p.hr_panelist_emp_id
                    )
                )
            result.append(
                PanelGroupResponse(
                    id=g.id,
                    name=g.name,
                    description=g.description,
                    meet_link=g.meet_link,
                    max_candidates=g.max_candidates or 0,
                    members=members
                )
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.delete("/panel-groups/{group_id}")
def delete_panel_group(group_id: int):
    db = SessionLocal()
    try:
        group = db.query(PanelGroup).filter(PanelGroup.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Panel group not found.")
            
        for p in group.panels:
            p.panel_group_id = None
            db.add(p)
            
        db.delete(group)
        db.commit()
        return {"status": "success", "message": "Panel group deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.put("/panels/{panel_id}/assign-group")
def assign_panel_group(panel_id: int, data: AssignPanelGroupRequest):
    db = SessionLocal()
    try:
        panel = db.query(Panel).filter(Panel.id == panel_id).first()
        if not panel:
            raise HTTPException(status_code=404, detail="Panelist not found.")
            
        if data.panel_group_id is not None:
            group = db.query(PanelGroup).filter(PanelGroup.id == data.panel_group_id).first()
            if not group:
                raise HTTPException(status_code=404, detail="Panel group not found.")
            panel.panel_group_id = data.panel_group_id
        else:
            panel.panel_group_id = None
            
        db.add(panel)
        db.commit()
        return {"status": "success", "message": "Panel group assigned successfully."}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/candidates/{candidate_id}/history")
def get_candidate_history(candidate_id: int):
    db = SessionLocal()
    try:
        from app.models.candidate_history import CandidateHistory
        history = db.query(CandidateHistory).filter(
            CandidateHistory.candidate_id == candidate_id
        ).order_by(CandidateHistory.created_at.asc()).all()

        res = []
        for item in history:
            res.append({
                "id": item.id,
                "candidate_id": item.candidate_id,
                "action": item.action,
                "interview_level": item.interview_level or "Level 1",
                "details": item.details,
                "created_at": item.created_at.isoformat() if item.created_at else None
            })
        return res
    finally:
        db.close()


class AdminResetPasswordRequest(BaseModel):
    new_password: str


@router.put("/users/{user_id}/reset-password")
def admin_reset_password(user_id: int, data: AdminResetPasswordRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not data.new_password or len(data.new_password.strip()) < 4:
            raise HTTPException(status_code=400, detail="Password must be at least 4 characters long")
        user.password = data.new_password.strip()
        db.add(user)
        db.commit()
        return {"status": "success", "message": f"Password updated successfully for {user.email}"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


