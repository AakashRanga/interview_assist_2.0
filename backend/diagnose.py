import sys
import os
import json

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.candidate import Candidate
from app.models.interview_schedule import InterviewSchedule
from app.models.panel import Panel
from app.models.user import User

def main():
    db = SessionLocal()
    try:
        # 1. Find the candidate
        candidate = db.query(Candidate).filter(Candidate.email == 'akashranga27@gmail.com').first()
        if not candidate:
            print("Candidate akashranga27@gmail.com not found!")
            # Let's check any candidate
            candidate = db.query(Candidate).first()
            if not candidate:
                print("No candidates found in database!")
                return
        
        print(f"Candidate: ID={candidate.id}, Name={candidate.name}, Email={candidate.email}")
        
        # 2. Find latest schedule
        schedule = db.query(InterviewSchedule).filter(
            InterviewSchedule.candidate_id == candidate.id
        ).order_by(InterviewSchedule.created_at.desc()).first()
        
        if not schedule:
            print("No interview schedule found for this candidate.")
            return
            
        print(f"Schedule: ID={schedule.id}, Date={schedule.date}, Time={schedule.start_time}-{schedule.end_time}")
        print(f"Stored schedule.panel_id raw value: {repr(schedule.panel_id)}")
        
        if not schedule.panel_id:
            print("schedule.panel_id is empty/null!")
            return
            
        try:
            panel_ids = json.loads(schedule.panel_id)
            print(f"Parsed panel_ids: {panel_ids} (Type: {type(panel_ids)})")
            
            if isinstance(panel_ids, list):
                for pid in panel_ids:
                    p_rec = db.query(Panel).filter(Panel.id == int(pid)).first()
                    if p_rec:
                        print(f"  -> Found Panel record: ID={p_rec.id}, user_id={p_rec.user_id}, hr_name={p_rec.hr_panelists_name}")
                        if p_rec.user_id:
                            u_rec = db.query(User).filter(User.id == p_rec.user_id).first()
                            if u_rec:
                                print(f"     -> Found User record: ID={u_rec.id}, Name={u_rec.full_name}, Email={u_rec.email}")
                            else:
                                print(f"     -> User record NOT found for user_id={p_rec.user_id}!")
                        else:
                            print(f"     -> Panel record does not have user_id!")
                    else:
                        print(f"  -> Panel record NOT found for panel_id={pid}!")
            else:
                # Is it a single string or number?
                print(f"panel_ids is not a list, it is {type(panel_ids)}")
        except Exception as e:
            print(f"Exception parsing/resolving panel_id: {e}")
            
    finally:
        db.close()

if __name__ == "__main__":
    main()
