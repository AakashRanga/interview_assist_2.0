from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base, ist_now


class Panel(Base):
    __tablename__ = "panels"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    panel_group_id = Column(Integer, ForeignKey("panel_groups.id", ondelete="SET NULL"), nullable=True)
    mr_panelist_grade = Column(String(100), nullable=True)
    mr_panel_mobile = Column(String(50), nullable=True)
    hr_panelist_emp_id = Column(String(100), nullable=True)
    hr_panelists_name = Column(String(255), nullable=True)
    hr_panelist_grade = Column(String(100), nullable=True)
    hr_panel_mobile = Column(String(50), nullable=True)
    tag_coordinator = Column(String(255), nullable=True)
    slots = Column(String(255), nullable=True)
    team_link = Column(String(500), nullable=True)
    interview_type = Column(String(100), nullable=True)
    panel_briefing = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=ist_now, nullable=False)

    user = relationship("User")
    panel_group = relationship("PanelGroup", back_populates="panels")


