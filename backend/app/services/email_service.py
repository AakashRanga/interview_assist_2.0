import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv
import os
import re

load_dotenv()

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def build_html_email_template(subject: str, body: str) -> str:
    lines = body.strip().split("\n")
    formatted_paragraphs = []
    
    url_pattern = re.compile(r'https?://[^\s<"]+')
    found_meet_link = None

    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
        
        urls = url_pattern.findall(line_str)
        if urls:
            for u in urls:
                if "meet.google.com" in u or "meet" in u:
                    found_meet_link = u
                highlighted_link = f'<a href="{u}" target="_blank" style="color: #06b6d4; font-weight: bold; text-decoration: underline;">{u}</a>'
                line_str = line_str.replace(u, highlighted_link)
        
        formatted_paragraphs.append(f'<p style="margin: 0 0 12px 0; line-height: 1.6; color: #334155; font-size: 15px;">{line_str}</p>')

    content_html = "".join(formatted_paragraphs)

    cta_button_html = ""
    if found_meet_link:
        cta_button_html = f'''
        <div style="text-align: center; margin: 28px 0 20px 0;">
            <a href="{found_meet_link}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #02f576 0%, #06b6d4 100%); color: #0f172a; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 50px; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.3); letter-spacing: 0.5px;">
                🎥 Join Google Meet Interview
            </a>
        </div>
        '''

    html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 40px 15px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1); border: 1px solid #e2e8f0;">
                    <!-- Header Bar -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 32px 40px; text-align: center; background-image: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                                Interview<span style="color: #02f576;">Assist</span>
                            </h1>
                            <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; font-weight: 500;">
                                AI-Powered Recruitment Management Platform
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Subject Title Banner -->
                    <tr>
                        <td style="padding: 24px 40px 12px 40px; border-bottom: 1px solid #f1f5f9;">
                            <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 700;">{subject}</h2>
                        </td>
                    </tr>

                    <!-- Main Content Body -->
                    <tr>
                        <td style="padding: 30px 40px 20px 40px;">
                            {content_html}
                            {cta_button_html}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #64748b; font-size: 12px; font-weight: 500;">
                                &copy; 2026 InterviewAssist Recruitment Team. All rights reserved.
                            </p>
                            <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 11px;">
                                This is an automated notification regarding your interview process.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'''
    return html

def send_email(to_email, subject, body):
    from app.database import SessionLocal
    from app.models.email_log import EmailLog

    db = SessionLocal()
    log_entry = None
    try:
        log_entry = EmailLog(
            recipient=to_email,
            to_email=to_email,
            subject=subject,
            body=body,
            status="pending"
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
    except Exception as log_err:
        print(f"Failed to create email log entry: {log_err}")

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_EMAIL
        msg["To"] = to_email

        part_text = MIMEText(body, "plain")
        html_content = build_html_email_template(subject, body)
        part_html = MIMEText(html_content, "html")

        msg.attach(part_text)
        msg.attach(part_html)

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)

        server.sendmail(
            SMTP_EMAIL,
            [to_email],
            msg.as_string()
        )
        server.quit()

        if log_entry:
            try:
                log_entry.status = "sent"
                db.commit()
            except Exception:
                pass
    except Exception as e:
        if log_entry:
            try:
                log_entry.status = "failed"
                log_entry.error_message = str(e)
                db.commit()
            except Exception:
                pass
        raise e
    finally:
        db.close()