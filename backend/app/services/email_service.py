import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv
import os

load_dotenv()

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def send_email(to_email, subject, body):
    from app.database import SessionLocal
    from app.models.email_log import EmailLog

    db = SessionLocal()
    log_entry = EmailLog(
        recipient=to_email,
        subject=subject,
        body=body,
        status="pending"
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = SMTP_EMAIL
        msg["To"] = to_email

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)

        server.sendmail(
            SMTP_EMAIL,
            [to_email],
            msg.as_string()
        )
        server.quit()

        log_entry.status = "sent"
        db.commit()
    except Exception as e:
        log_entry.status = "failed"
        log_entry.error_message = str(e)
        db.commit()
        raise e
    finally:
        db.close()