from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base, ist_now

class PanelGroup(Base):
    __tablename__ = "panel_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(String(255), nullable=True)
    meet_link = Column(String(500), nullable=True)
    max_candidates = Column(Integer, nullable=True, default=0)
    created_at = Column(DateTime, default=ist_now, nullable=False)

    panels = relationship("Panel", back_populates="panel_group")
