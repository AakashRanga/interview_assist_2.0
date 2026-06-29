from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base, ist_now

class PanelFeedback(Base):
    __tablename__ = "panel_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    panel_id = Column(Integer, ForeignKey("panels.id", ondelete="CASCADE"), nullable=False, index=True)
    feedback_text = Column(Text, nullable=False)
    rating = Column(Integer, nullable=True)
    decision = Column(String(50), nullable=True) # e.g. "Recommend", "Reject", "Neutral"
    created_at = Column(DateTime, default=ist_now, nullable=False)

    candidate = relationship("Candidate", back_populates="feedbacks")
    panel = relationship("Panel")
