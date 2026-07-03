from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from app.database import Base, ist_now


class ApiLog(Base):
    __tablename__ = "api_logs"

    id = Column(Integer, primary_key=True, index=True)
    method = Column(String(10), nullable=False, index=True)
    path = Column(String(255), nullable=False, index=True)
    query_params = Column(String(500), nullable=True)
    status_code = Column(Integer, nullable=False, index=True)
    ip_address = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)
    response_time_ms = Column(Float, nullable=False)
    created_at = Column(DateTime, default=ist_now, nullable=False)
