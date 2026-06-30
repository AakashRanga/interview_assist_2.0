from pathlib import Path
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.routes.resume_routes import router as resume_router
from app.routes.auth_routes import router as auth_router
from app.routes.admin_routes import router as admin_router
from app.routes.notification_routes import router as notification_router
from app.routes.feedback_routes import router as feedback_router
from app.routes.super_admin_routes import router as super_admin_router

from app.database import engine, Base
from app.models.panel_group import PanelGroup
from app.models.panel_feedback import PanelFeedback
from app.models.email_log import EmailLog
from app.models.candidate_history import CandidateHistory

Base.metadata.create_all(bind=engine)

with engine.begin() as connection:
    if os.getenv("DB_NAME"):
        db_name = os.getenv("DB_NAME")
        result = connection.execute(
            text(
                "SELECT COLUMN_NAME FROM information_schema.columns "
                "WHERE table_schema = :schema AND table_name = 'job_roles'"
            ),
            {"schema": db_name}
        )
        existing_columns = {row[0] for row in result}
        if "job_type" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE job_roles ADD COLUMN job_type VARCHAR(50) NOT NULL DEFAULT 'Online'"
                )
            )
        if "venue" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE job_roles ADD COLUMN venue VARCHAR(255) NULL"
                )
            )
        if "created_at" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE job_roles ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
                )
            )
        if "is_visible" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE job_roles ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT TRUE"
                )
            )
        if "level" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE job_roles ADD COLUMN level VARCHAR(50) NULL"
                )
            )

        # candidates table columns check
        result_cand = connection.execute(
            text(
                "SELECT COLUMN_NAME FROM information_schema.columns "
                "WHERE table_schema = :schema AND table_name = 'candidates'"
            ),
            {"schema": db_name}
        )
        existing_cand_columns = {row[0] for row in result_cand}
        if "panel_id" not in existing_cand_columns:
            connection.execute(
                text(
                    "ALTER TABLE candidates ADD COLUMN panel_id VARCHAR(500) NULL"
                )
            )
        else:
            try:
                connection.execute(
                    text(
                        "ALTER TABLE candidates MODIFY COLUMN panel_id VARCHAR(500) NULL"
                    )
                )
            except Exception as modify_err:
                print(f"Failed to modify candidates.panel_id type: {modify_err}")
        if "panel_group_id" not in existing_cand_columns:
            connection.execute(
                text(
                    "ALTER TABLE candidates ADD COLUMN panel_group_id VARCHAR(100) NULL"
                )
            )
        if "current_level" not in existing_cand_columns:
            connection.execute(
                text(
                    "ALTER TABLE candidates ADD COLUMN current_level VARCHAR(100) NULL DEFAULT 'Level 1'"
                )
            )
        if "rejection_reason" not in existing_cand_columns:
            connection.execute(
                text(
                    "ALTER TABLE candidates ADD COLUMN rejection_reason TEXT NULL"
                )
            )

        # panel_groups table columns check
        result_pg = connection.execute(
            text(
                "SELECT COLUMN_NAME FROM information_schema.columns "
                "WHERE table_schema = :schema AND table_name = 'panel_groups'"
            ),
            {"schema": db_name}
        )
        existing_pg_columns = {row[0] for row in result_pg}
        if "max_candidates" not in existing_pg_columns:
            connection.execute(
                text(
                    "ALTER TABLE panel_groups ADD COLUMN max_candidates INT NULL DEFAULT 0"
                )
            )

        # panels table columns check
        result_panels = connection.execute(
            text(
                "SELECT COLUMN_NAME FROM information_schema.columns "
                "WHERE table_schema = :schema AND table_name = 'panels'"
            ),
            {"schema": db_name}
        )
        existing_panels_columns = {row[0] for row in result_panels}
        if "user_id" not in existing_panels_columns:
            connection.execute(
                text(
                    "ALTER TABLE panels ADD COLUMN user_id INT NULL"
                )
            )
        if "panel_group_id" not in existing_panels_columns:
            connection.execute(
                text(
                    "ALTER TABLE panels ADD COLUMN panel_group_id INT NULL"
                )
            )

        # interview_schedule table columns check
        result_sched = connection.execute(
            text(
                "SELECT COLUMN_NAME FROM information_schema.columns "
                "WHERE table_schema = :schema AND table_name = 'interview_schedule'"
            ),
            {"schema": db_name}
        )
        existing_sched_columns = {row[0] for row in result_sched}
        if "panel_id" not in existing_sched_columns:
            connection.execute(
                text(
                    "ALTER TABLE interview_schedule ADD COLUMN panel_id VARCHAR(500) NULL"
                )
            )
        else:
            try:
                # Attempt to drop constraint if it exists to allow altering the type
                try:
                    connection.execute(
                        text(
                            "ALTER TABLE interview_schedule DROP FOREIGN KEY interview_schedule_ibfk_3"
                        )
                    )
                except Exception:
                    pass
                
                connection.execute(
                    text(
                        "ALTER TABLE interview_schedule MODIFY COLUMN panel_id VARCHAR(500) NULL"
                    )
                )
            except Exception as modify_err:
                print(f"Failed to modify interview_schedule.panel_id type: {modify_err}")
        if "interview_mode" not in existing_sched_columns:
            connection.execute(
                text(
                    "ALTER TABLE interview_schedule ADD COLUMN interview_mode VARCHAR(50) NOT NULL DEFAULT 'online'"
                )
            )
        if "interview_level" not in existing_sched_columns:
            connection.execute(
                text(
                    "ALTER TABLE interview_schedule ADD COLUMN interview_level VARCHAR(100) NULL"
                )
            )

        # email_logs table columns check
        result_emails = connection.execute(
            text(
                "SELECT COLUMN_NAME FROM information_schema.columns "
                "WHERE table_schema = :schema AND table_name = 'email_logs'"
            ),
            {"schema": db_name}
        )
        existing_email_columns = {row[0] for row in result_emails}
        if existing_email_columns:
            if "recipient" not in existing_email_columns:
                connection.execute(text("ALTER TABLE email_logs ADD COLUMN recipient VARCHAR(255) NOT NULL DEFAULT ''"))
            if "to_email" in existing_email_columns:
                try:
                    connection.execute(text("ALTER TABLE email_logs MODIFY COLUMN to_email VARCHAR(255) NULL"))
                except Exception:
                    pass
            else:
                connection.execute(text("ALTER TABLE email_logs ADD COLUMN to_email VARCHAR(255) NULL"))
            if "subject" not in existing_email_columns:
                connection.execute(text("ALTER TABLE email_logs ADD COLUMN subject VARCHAR(255) NOT NULL DEFAULT ''"))
            if "body" not in existing_email_columns:
                connection.execute(text("ALTER TABLE email_logs ADD COLUMN body TEXT NULL"))
            if "status" not in existing_email_columns:
                connection.execute(text("ALTER TABLE email_logs ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending'"))
            if "error_message" not in existing_email_columns:
                connection.execute(text("ALTER TABLE email_logs ADD COLUMN error_message TEXT NULL"))
            if "created_at" not in existing_email_columns:
                connection.execute(text("ALTER TABLE email_logs ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"))
            if "updated_at" not in existing_email_columns:
                connection.execute(text("ALTER TABLE email_logs ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))

        # candidate_history table columns check
        result_hist = connection.execute(
            text(
                "SELECT COLUMN_NAME FROM information_schema.columns "
                "WHERE table_schema = :schema AND table_name = 'candidate_history'"
            ),
            {"schema": db_name}
        )
        existing_hist_columns = {row[0] for row in result_hist}
        if existing_hist_columns:
            if "candidate_id" not in existing_hist_columns:
                connection.execute(text("ALTER TABLE candidate_history ADD COLUMN candidate_id INT NOT NULL"))
            if "action" not in existing_hist_columns:
                connection.execute(text("ALTER TABLE candidate_history ADD COLUMN action VARCHAR(100) NOT NULL DEFAULT ''"))
            if "interview_level" not in existing_hist_columns:
                connection.execute(text("ALTER TABLE candidate_history ADD COLUMN interview_level VARCHAR(100) NULL"))
            if "details" not in existing_hist_columns:
                connection.execute(text("ALTER TABLE candidate_history ADD COLUMN details TEXT NULL"))
            if "created_at" not in existing_hist_columns:
                connection.execute(text("ALTER TABLE candidate_history ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"))

app = FastAPI(title="AI Recruitment System")

frontend_urls_env = os.getenv("FRONTEND_URLS")
if frontend_urls_env:
    origins = [url.strip() for url in frontend_urls_env.split(",") if url.strip()]
else:
    origins = [
        "http://localhost:8189",
        "http://127.0.0.1:8189",
        "https://aakashranga.github.io/interview_assist",
        "https://aakashranga.github.io"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(auth_router)
app.include_router(resume_router)
app.include_router(admin_router)
app.include_router(notification_router)
app.include_router(feedback_router)
app.include_router(super_admin_router)

@app.get("/")
def home():
    return {"message": "Server Running"}

@app.get("/health")
def health():
    return {"status": "ok"}