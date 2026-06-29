from sqlalchemy.orm import Session
from app.models.candidate_history import CandidateHistory
from typing import Optional


def record_candidate_history(
    db: Session,
    candidate_id: int,
    action: str,
    interview_level: Optional[str] = None,
    details: Optional[str] = None
):
    """
    Utility helper to append a history log record for a candidate.
    """
    try:
        history_entry = CandidateHistory(
            candidate_id=candidate_id,
            action=action,
            interview_level=interview_level,
            details=details
        )
        db.add(history_entry)
        # We do not do db.commit() here so it commits atomically with parent transaction if managed outside,
        # or we flush it to ensure ID generation if needed.
        db.flush()
    except Exception as e:
        print(f"Failed to record candidate history for candidate_id {candidate_id}: {e}")
