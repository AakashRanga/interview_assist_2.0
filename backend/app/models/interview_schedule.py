from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Time
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base, ist_now


class InterviewSchedule(Base):
    __tablename__ = "interview_schedule"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("job_roles.id"), nullable=True, index=True)
    gmeet_link = Column(String(500), nullable=True)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    interview_status = Column(String(100), nullable=False, default="scheduled")
    # Stores JSON array of panel IDs e.g. "[1,2,3,4,5]" for parallel panels
    panel_id = Column(String(500), nullable=True, index=True)
    interview_mode = Column(String(50), nullable=False, default="online")
    interview_level = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=ist_now, nullable=False)
    updated_at = Column(DateTime, default=ist_now, onupdate=ist_now, nullable=False)

    candidate = relationship("Candidate", back_populates="interview_schedules")