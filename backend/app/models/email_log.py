from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.database import Base, ist_now


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient = Column(String(255), nullable=False, index=True)
    to_email = Column(String(255), nullable=True)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="pending", index=True)  # pending, sent, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=ist_now, nullable=False)
    updated_at = Column(DateTime, default=ist_now, onupdate=ist_now, nullable=False)
