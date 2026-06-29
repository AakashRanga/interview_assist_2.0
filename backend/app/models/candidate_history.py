from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base, ist_now


class CandidateHistory(Base):
    __tablename__ = "candidate_history"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., New, Applied, Selected, Scheduled, Assigned Panel, Completed, Hired, Rejected
    interview_level = Column(String(100), nullable=True)  # e.g., Level 1, Level 2
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=ist_now, nullable=False, index=True)

    candidate = relationship("Candidate", backref="history_logs")
