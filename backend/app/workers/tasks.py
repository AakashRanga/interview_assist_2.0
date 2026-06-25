
import requests
import json
from celery_worker import celery
from app.database import SessionLocal
from app.models.candidate import Candidate
from app.models.candidate_application import CandidateApplication
from app.models.job_role import JobRole
from app.models.interview_schedule import InterviewSchedule
from app.models.panel import Panel
from app.models.user import User
from app.models.panel_group import PanelGroup
from datetime import datetime, date, time, timedelta
from celery.exceptions import Retry
from zoneinfo import ZoneInfo

N8N_WEBHOOK_URL = "http://localhost:5678/webhook/schedule-interview"


@celery.task
def process_resume(candidate_id):
    db = SessionLocal()

    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    print("Processing Resume:", candidate.name)

    candidate.status = "Applied"

    db.commit()

    return True




@celery.task(bind=True, max_retries=20, default_retry_delay=60)
def schedule_interview_task(self, schedule_id, candidate_id, is_reschedule=False, is_first_panel_assignment=False, is_panel_reassignment=False):

    db = SessionLocal()

    try:

        # ============================================
        # GET CANDIDATE
        # ============================================

        candidate = db.query(Candidate).filter(
            Candidate.id == candidate_id
        ).first()

        if not candidate:
            return {
                "status": "error",
                "message": "Candidate not found"
            }

        print(
            f"Calling n8n for candidate: "
            f"{candidate.full_name}, "
            f"email: {candidate.email}"
        )

        # ============================================
        # GET INTERVIEW SCHEDULE
        # ============================================

        schedule = db.query(InterviewSchedule).filter(
            InterviewSchedule.id == schedule_id
        ).first()

        if not schedule:
            return {
                "status": "error",
                "message": "Interview schedule not found"
            }

        # ============================================
        # GET JOB ROLE
        # ============================================

        job_role_title = " "
        job_type = "Online"
        venue = None
        application = None

        if schedule.job_id:

            application = db.query(CandidateApplication).filter(
                CandidateApplication.candidate_id == candidate_id,
                CandidateApplication.role_id == schedule.job_id
            ).first()

            if application:

                job_role = db.query(JobRole).filter(
                    JobRole.id == schedule.job_id
                ).first()

                if job_role:
                    job_role_title = job_role.title
                    job_type = job_role.job_type or "Online"
                    venue = job_role.venue

        # Determine mode: candidate choice overrides job role default
        is_offline = False
        if schedule.interview_mode:
            is_offline = schedule.interview_mode.lower() == "offline"
        elif job_type:
            is_offline = job_type.lower() == "offline"

        if is_offline and schedule.gmeet_link:
            venue = schedule.gmeet_link

        # For offline interviews, skip n8n and don't generate gmeet link
        if is_offline:
            schedule.interview_status = "scheduled"
            # Also update candidate_applications status to "Scheduled" if not Selected/Rejected
            if application and application.status not in ["Selected", "Rejected"]:
                application.status = "Scheduled"
            db.commit()
            # Do not return early, proceed to send emails!

        # ============================================
        # PREPARE PAYLOAD FOR N8N
        # ============================================

        # Resolve panel records from schedule, candidate, or candidate's panel group
        panel_records = []
        
        # 1. Try schedule.panel_id
        if schedule.panel_id:
            try:
                parsed = json.loads(schedule.panel_id)
                if isinstance(parsed, list):
                    panel_records = db.query(Panel).filter(Panel.id.in_([int(x) for x in parsed])).all()
                else:
                    panel_records = db.query(Panel).filter(Panel.id == int(parsed)).all()
            except Exception:
                try:
                    panel_records = db.query(Panel).filter(Panel.id == int(schedule.panel_id)).all()
                except Exception:
                    pass

        # 2. Try candidate.panel_id if schedule has no panels
        if not panel_records and candidate.panel_id:
            try:
                parsed = json.loads(candidate.panel_id)
                if isinstance(parsed, list):
                    panel_records = db.query(Panel).filter(Panel.id.in_([int(x) for x in parsed])).all()
                else:
                    panel_records = db.query(Panel).filter(Panel.id == int(parsed)).all()
            except Exception:
                try:
                    panel_records = db.query(Panel).filter(Panel.id == int(candidate.panel_id)).all()
                except Exception:
                    p_by_name = db.query(Panel).filter(Panel.hr_panelists_name == candidate.panel_id).first()
                    if p_by_name:
                        panel_records = [p_by_name]

        # 3. Try candidate.panel_group_id if still no panels
        if not panel_records and candidate.panel_group_id:
            group = None
            try:
                group_id = int(candidate.panel_group_id)
                group = db.query(PanelGroup).filter(PanelGroup.id == group_id).first()
            except Exception:
                group = db.query(PanelGroup).filter(PanelGroup.name == candidate.panel_group_id).first()
            if group:
                panel_records = group.panels

        # 4. Extract emails
        panel_emails = []
        for p in panel_records:
            if p.user_id:
                u_rec = db.query(User).filter(User.id == p.user_id, User.role == 'panel').first()
                if u_rec and u_rec.email:
                    panel_emails.append(u_rec.email)

        payload = {
            "candidate_name": candidate.full_name,
            "email": candidate.email,
            "panel_emails": panel_emails,
            "job_role": job_role_title,
            "date": schedule.date.isoformat()
            if schedule.date else None,

            "start_time": schedule.start_time.isoformat()
            if schedule.start_time else None,

            "end_time": schedule.end_time.isoformat()
            if schedule.end_time else None,

            "start_datetime": f"{schedule.date.isoformat()}T{schedule.start_time.isoformat()}+05:30"
            if schedule.date and schedule.start_time else None,

            "end_datetime": f"{schedule.date.isoformat()}T{schedule.end_time.isoformat()}+05:30"
            if schedule.date and schedule.end_time else None
        }


        print("Sending payload to n8n:")
        print(payload)

        # ============================================
        # CALL N8N WEBHOOK
        # ============================================

        meet_link = None
        if not is_offline:
            meet_link = schedule.gmeet_link
            if not meet_link:
                # Fallback: check if this candidate has another schedule with a gmeet_link
                prior_schedule = db.query(InterviewSchedule).filter(
                    InterviewSchedule.candidate_id == candidate_id,
                    InterviewSchedule.gmeet_link.isnot(None),
                    InterviewSchedule.gmeet_link != "",
                    InterviewSchedule.interview_mode != "offline"
                ).order_by(InterviewSchedule.created_at.desc()).first()
                if prior_schedule:
                    meet_link = prior_schedule.gmeet_link
                    schedule.gmeet_link = meet_link
                    db.add(schedule)
                    db.commit()

            if not meet_link:
                try:
                    response = requests.post(
                        N8N_WEBHOOK_URL,
                        json=payload,
                        timeout=60
                    )
                    print(f"n8n response status: {response.status_code}")
                    if response.status_code == 200:
                        result = response.json()
                        print("Parsed n8n response:")
                        print(result)
                        if isinstance(result, list):
                            event_data = result[0] if result else {}
                        else:
                            event_data = result
                        meet_link = (
                            event_data.get("hangoutLink")
                            or event_data.get("meetLink")
                        )

                        if not meet_link:
                            conference = event_data.get("conferenceData", {})
                            entry_points = conference.get("entryPoints", [])

                            if entry_points:
                                meet_link = entry_points[0].get("uri")
                    
                    if not meet_link:
                        raise ValueError(f"No hangoutLink generated. Response Code: {response.status_code}")
                except Exception as e:
                    print(f"Error calling n8n or parsing link: {str(e)}. Triggering task retry...")
                    raise self.retry(exc=e)

                schedule.gmeet_link = meet_link

        schedule.interview_status = "scheduled"

        # Update PanelGroup's meet_link dynamically based on candidate's interview slot
        if not is_offline and meet_link and candidate.panel_group_id:
            try:
                group_id = int(candidate.panel_group_id)
                group = db.query(PanelGroup).filter(PanelGroup.id == group_id).first()
                if group:
                    group.meet_link = meet_link
                    db.add(group)
            except ValueError:
                group = db.query(PanelGroup).filter(PanelGroup.name == candidate.panel_group_id).first()
                if group:
                    group.meet_link = meet_link
                    db.add(group)

        # Also update candidate_applications status to "Scheduled" if not Selected/Rejected
        application = db.query(CandidateApplication).filter(
            CandidateApplication.candidate_id == candidate_id,
            CandidateApplication.role_id == schedule.job_id
        ).first()

        if application and application.status not in ["Selected", "Rejected"]:
            application.status = "Scheduled"

        db.commit()

        # ============================================
        # RETRIEVE PANEL AND SEND EMAIL NOTIFICATIONS
        # ============================================
        try:
            from app.services.email_service import send_email
            
            cand_panels = []
            if candidate.panel_id:
                import json
                try:
                    parsed = json.loads(candidate.panel_id)
                    if isinstance(parsed, list):
                        cand_panels = db.query(Panel).filter(Panel.id.in_(parsed)).all()
                    else:
                        cand_panels = db.query(Panel).filter(Panel.id == int(parsed)).all()
                except Exception:
                    try:
                        cand_panels = db.query(Panel).filter(Panel.id == int(candidate.panel_id)).all()
                    except Exception:
                        p_by_name = db.query(Panel).filter(Panel.hr_panelists_name == candidate.panel_id).first()
                        if p_by_name:
                            cand_panels = [p_by_name]
            
            cand_panel_names = ", ".join([p.hr_panelists_name for p in cand_panels if p.hr_panelists_name])
            with_panelist_str = f" with Panelist(s) {cand_panel_names}" if cand_panel_names else ""
            
            # Format the email content
            subject_action = "Rescheduled" if is_reschedule else "Scheduled"
            subject_cand = f"Interview {subject_action}"
            subject_panel = f"Interview Rescheduled Notification" if is_reschedule else "Interview Panel Assignment"
            
            level_str = f" ({schedule.interview_level})" if schedule.interview_level else ""
            level_prefix = f"{schedule.interview_level} " if schedule.interview_level else ""
            
            action_desc_cand = f"has been rescheduled successfully" if is_reschedule else f"has been scheduled successfully"
            action_desc_panel = f"has been rescheduled" if is_reschedule else f"You have been assigned to interview candidate {candidate.full_name}"

            if is_offline:
                location_info = f"Venue: {venue or 'TBD'}"
                email_body_candidate = (
                    f"Dear {candidate.full_name},\n\n"
                    f"Your {level_prefix}interview for the {job_role_title} role{with_panelist_str} "
                    f"{action_desc_cand}.\n\n"
                    f"Date: {schedule.date}\n"
                    f"Time: {schedule.start_time.strftime('%I:%M %p')} - {schedule.end_time.strftime('%I:%M %p')} IST\n"
                    f"{location_info}\n\n"
                    f"Best Regards,\n"
                    f"Recruitment Team"
                )
            else:
                meet_link_info = f"Google Meet Link: {meet_link}\n\n" if meet_link else ""
                email_body_candidate = (
                    f"Dear {candidate.full_name},\n\n"
                    f"Your {level_prefix}interview for the {job_role_title} role{with_panelist_str} "
                    f"{action_desc_cand}.\n\n"
                    f"Date: {schedule.date}\n"
                    f"Time: {schedule.start_time.strftime('%I:%M %p')} - {schedule.end_time.strftime('%I:%M %p')} IST\n"
                    f"{meet_link_info}"
                    f"Best Regards,\n"
                    f"Recruitment Team"
                )
            
            email_errors = []

            # Send candidate email
            if is_reschedule or is_first_panel_assignment:
                try:
                    send_email(candidate.email, subject_cand, email_body_candidate)
                    print(f"Sent scheduling email to candidate {candidate.email}")
                except Exception as email_err:
                    print(f"Failed to send email to candidate: {email_err}")
                    email_errors.append(email_err)
            
            # Send panelist emails (multi-dispatch) - ONLY if rescheduled, first-time panel assignment, or reassigned panelist
            if is_reschedule or is_first_panel_assignment or is_panel_reassignment:
                for p in cand_panels:
                    if is_offline:
                        if is_reschedule:
                            email_body_panelist = (
                                f"Dear {p.hr_panelists_name},\n\n"
                                f"The {level_prefix}interview for candidate {candidate.full_name} for the {job_role_title} role "
                                f"has been rescheduled.\n\n"
                                f"Date: {schedule.date}\n"
                                f"Time: {schedule.start_time.strftime('%I:%M %p')} - {schedule.end_time.strftime('%I:%M %p')} IST\n"
                                f"{location_info}\n\n"
                                f"Please be present at the venue.\n\n"
                                f"Best Regards,\n"
                                f"Recruitment Team"
                            )
                        else:
                            email_body_panelist = (
                                f"Dear {p.hr_panelists_name},\n\n"
                                f"You have been assigned to interview candidate {candidate.full_name} for the {job_role_title} role{level_str}.\n\n"
                                f"Date: {schedule.date}\n"
                                f"Time: {schedule.start_time.strftime('%I:%M %p')} - {schedule.end_time.strftime('%I:%M %p')} IST\n"
                                f"{location_info}\n\n"
                                f"Please be present at the venue.\n\n"
                                f"Best Regards,\n"
                                f"Recruitment Team"
                            )
                    else:
                        if is_reschedule:
                            email_body_panelist = (
                                f"Dear {p.hr_panelists_name},\n\n"
                                f"The {level_prefix}interview for candidate {candidate.full_name} for the {job_role_title} role "
                                f"has been rescheduled.\n\n"
                                f"Date: {schedule.date}\n"
                                f"Time: {schedule.start_time.strftime('%I:%M %p')} - {schedule.end_time.strftime('%I:%M %p')} IST\n"
                                        f"{meet_link_info}"
                                f"Please join on time.\n\n"
                                f"Best Regards,\n"
                                f"Recruitment Team"
                            )
                        else:
                            email_body_panelist = (
                                f"Dear {p.hr_panelists_name},\n\n"
                                f"You have been assigned to interview candidate {candidate.full_name} for the {job_role_title} role{level_str}.\n\n"
                                f"Date: {schedule.date}\n"
                                f"Time: {schedule.start_time.strftime('%I:%M %p')} - {schedule.end_time.strftime('%I:%M %p')} IST\n"
                                f"{meet_link_info}"
                                f"Please join on time.\n\n"
                                f"Best Regards,\n"
                                f"Recruitment Team"
                            )
                    panelist_email = p.user.email if (p.user and p.user.email) else (f"panel_{p.hr_panelist_emp_id}@example.com" if p.hr_panelist_emp_id else "panel@example.com")
                    try:
                        send_email(panelist_email, subject_panel, email_body_panelist)
                        print(f"Sent scheduling email to panelist {panelist_email}")
                    except Exception as email_err:
                        print(f"Failed to send email to panelist {panelist_email}: {email_err}")
                        email_errors.append(email_err)

            if email_errors:
                print(f"Failed to send some emails ({len(email_errors)} failures). Raising retry exception...")
                raise self.retry(exc=email_errors[0])
        except Exception as e:
            print(f"Failed to execute email notification flow: {e}")

        # ============================================
        # SUCCESS RESPONSE
        # ============================================

        return {
            "status": "success",
            "meet_link": meet_link
        }

    # ============================================
    # CELERY RETRY
    # ============================================

    except Retry:
        raise

    # ============================================
    # TIMEOUT ERROR
    # ============================================

    except requests.exceptions.Timeout as e:

        print("n8n request timed out. Triggering task retry...")
        raise self.retry(exc=e)

    # ============================================
    # GENERAL ERROR
    # ============================================

    except Exception as e:

        print(f"Error in schedule_interview_task: {str(e)}")

        schedule = db.query(InterviewSchedule).filter(
            InterviewSchedule.id == schedule_id
        ).first()

        if schedule:
            schedule.interview_status = "failed"
            db.commit()

        return {
            "status": "error",
            "message": str(e)
        }

    # ============================================
    # CLOSE DATABASE
    # ============================================

    finally:
        db.close()


@celery.task
def send_interview_reminder_task(schedule_id):
    db = SessionLocal()
    try:
        schedule = db.query(InterviewSchedule).filter(InterviewSchedule.id == schedule_id).first()
        if not schedule or schedule.interview_status == "cancelled":
            return False
            
        candidate = db.query(Candidate).filter(Candidate.id == schedule.candidate_id).first()
        if not candidate:
            return False
            
        cand_panels = []
        if candidate.panel_id:
            import json
            try:
                parsed = json.loads(candidate.panel_id)
                if isinstance(parsed, list):
                    cand_panels = db.query(Panel).filter(Panel.id.in_(parsed)).all()
                else:
                    cand_panels = db.query(Panel).filter(Panel.id == int(parsed)).all()
            except Exception:
                try:
                    cand_panels = db.query(Panel).filter(Panel.id == int(candidate.panel_id)).all()
                except Exception:
                    p_by_name = db.query(Panel).filter(Panel.hr_panelists_name == candidate.panel_id).first()
                    if p_by_name:
                        cand_panels = [p_by_name]
                        
        if not cand_panels and candidate.panel_group_id:
            try:
                group_id = int(candidate.panel_group_id)
                group = db.query(PanelGroup).filter(PanelGroup.id == group_id).first()
            except Exception:
                group = db.query(PanelGroup).filter(PanelGroup.name == candidate.panel_group_id).first()
            if group:
                cand_panels = group.panels
                
        from app.services.notification_service import NotificationService
        from app.models.notification import NotificationType
        
        for p in cand_panels:
            if p.user_id:
                NotificationService.create_notification(
                    db=db,
                    user_id=p.user_id,
                    title="Upcoming Interview Reminder",
                    message=f"Reminder: You have an interview with {candidate.full_name} scheduled in 1 hour (at {schedule.start_time.strftime('%I:%M %p') if schedule.start_time else ''}).",
                    notification_type=NotificationType.WARNING,
                    candidate_id=candidate.id,
                    icon="clock",
                    priority="high",
                    redirect_url="/panel/schedule"
                )
        return True
    finally:
        db.close()