from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.database import SessionLocal
from app.models.panel_feedback import PanelFeedback
from app.models.panel import Panel
from app.models.candidate import Candidate
from app.models.candidate_application import CandidateApplication
from app.models.interview_schedule import InterviewSchedule

router = APIRouter(prefix="/feedback", tags=["feedback"])

class FeedbackSubmitRequest(BaseModel):
    candidate_id: int
    user_id: int
    feedback_text: str
    rating: Optional[int] = None
    decision: Optional[str] = None

def check_direct_assignment(candidate: Candidate, panel_id: int) -> bool:
    if not candidate.panel_id:
        return False
    target_id = str(panel_id)
    cand_panel_id_str = str(candidate.panel_id)
    if cand_panel_id_str.startswith('['):
        try:
            import json
            parsed = json.loads(cand_panel_id_str)
            if isinstance(parsed, list):
                return target_id in [str(x) for x in parsed]
        except Exception:
            pass
    return cand_panel_id_str == target_id

@router.post("/submit")
def submit_feedback(data: FeedbackSubmitRequest):
    db = SessionLocal()
    try:
        # 1. Verify candidate exists
        candidate = db.query(Candidate).filter(Candidate.id == data.candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # 2. Find Panel by user_id
        panel = db.query(Panel).filter(Panel.user_id == data.user_id).first()
        if not panel:
            raise HTTPException(status_code=404, detail="Panel member not found for user")

        # 3. Check direct assignment
        is_assigned = check_direct_assignment(candidate, panel.id)
        if not is_assigned:
            raise HTTPException(
                status_code=403,
                detail="You can only submit feedback for candidates directly assigned to you."
            )

        # 4. Find the active schedule and mark it completed
        schedule = db.query(InterviewSchedule).filter(
            InterviewSchedule.candidate_id == candidate.id,
            InterviewSchedule.interview_status.in_(["pending", "scheduled"])
        ).order_by(InterviewSchedule.created_at.desc()).first()
        if schedule:
            schedule.interview_status = "completed"
            db.add(schedule)

        # 5. Auto-advance candidate's current_level to next round if decision is "Selected"
        if data.decision == "Selected":
            application = db.query(CandidateApplication).filter(
                CandidateApplication.candidate_id == candidate.id
            ).order_by(CandidateApplication.created_at.desc()).first()
            if application and application.role:
                from app.routes.admin_routes import parse_role_levels
                role_levels = parse_role_levels(application.role.level)
                curr = candidate.current_level or "Level 1"
                if curr in role_levels:
                    idx = role_levels.index(curr)
                    if idx + 1 < len(role_levels):
                        candidate.current_level = role_levels[idx + 1]
                        db.add(candidate)

        # 6. Check if feedback already exists for this candidate by this panel member
        existing = db.query(PanelFeedback).filter(
            PanelFeedback.candidate_id == candidate.id,
            PanelFeedback.panel_id == panel.id
        ).first()

        if existing:
            existing.feedback_text = data.feedback_text
            existing.rating = data.rating
            existing.decision = data.decision
            db.add(existing)
            db.commit()
            db.refresh(existing)
            msg = "Feedback updated successfully"
            feedback_obj = existing
        else:
            new_fb = PanelFeedback(
                candidate_id=candidate.id,
                panel_id=panel.id,
                feedback_text=data.feedback_text,
                rating=data.rating,
                decision=data.decision
            )
            db.add(new_fb)
            
            # Update candidate status to Completed when feedback is submitted
            candidate.status = "Completed"
            db.add(candidate)
            
            application = db.query(CandidateApplication).filter(
                CandidateApplication.candidate_id == candidate.id
            ).order_by(CandidateApplication.created_at.desc()).first()
            if application:
                application.status = "Completed"
                db.add(application)

            db.commit()
            db.refresh(new_fb)
            msg = "Feedback submitted successfully"
            feedback_obj = new_fb

        return {"status": "success", "message": msg, "id": feedback_obj.id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.get("/candidate/{candidate_id}")
def get_candidate_feedbacks(candidate_id: int):
    db = SessionLocal()
    try:
        feedbacks = db.query(PanelFeedback).filter(PanelFeedback.candidate_id == candidate_id).all()
        res = []
        for f in feedbacks:
            p = db.query(Panel).filter(Panel.id == f.panel_id).first()
            panel_name = p.hr_panelists_name if p and p.hr_panelists_name else f"Panel {f.panel_id}"
            res.append({
                "id": f.id,
                "candidate_id": f.candidate_id,
                "panel_id": f.panel_id,
                "panel_name": panel_name,
                "feedback_text": f.feedback_text,
                "rating": f.rating,
                "decision": f.decision,
                "created_at": f.created_at.isoformat()
            })
        return res
    finally:
        db.close()

@router.get("/candidate/{candidate_id}/user/{user_id}")
def get_candidate_feedback_by_user(candidate_id: int, user_id: int):
    db = SessionLocal()
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        panel = db.query(Panel).filter(Panel.user_id == user_id).first()
        if not panel:
            return {"feedback": None, "is_assigned": False}

        is_assigned = check_direct_assignment(candidate, panel.id)
            
        f = db.query(PanelFeedback).filter(
            PanelFeedback.candidate_id == candidate_id,
            PanelFeedback.panel_id == panel.id
        ).first()
        
        feedback_data = None
        if f:
            feedback_data = {
                "id": f.id,
                "candidate_id": f.candidate_id,
                "panel_id": f.panel_id,
                "feedback_text": f.feedback_text,
                "rating": f.rating,
                "decision": f.decision,
                "created_at": f.created_at.isoformat()
            }
            
        return {
            "feedback": feedback_data,
            "is_assigned": is_assigned
        }
    finally:
        db.close()
