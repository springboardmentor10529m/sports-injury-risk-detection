"""
Database Seed & Reseed Script for Week 1-2 Demo
Run with: python backend/seed.py
"""
import sys
import os
import uuid
from datetime import date, datetime

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.database import engine, Base, SessionLocal
from app import models
from app.auth import hash_password

def seed_database():
    print("=" * 60)
    print("  AI Sports Injury Risk Detection Platform - Database Seeder")
    print("=" * 60)

    # Recreate tables cleanly
    print("[1/4] Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check existing users
        existing_admin = db.query(models.User).filter(models.User.email == "admin@demo.com").first()
        if existing_admin:
            print("      Existing demo data found. Resetting tables...")
            db.query(models.MovementAnomaly).delete()
            db.query(models.Recommendation).delete()
            db.query(models.InjuryPrediction).delete()
            db.query(models.AnalysisResult).delete()
            db.query(models.PoseData).delete()
            db.query(models.AiLog).delete()
            db.query(models.Video).delete()
            db.query(models.InjuryHistory).delete()
            db.query(models.Athlete).delete()
            db.query(models.Notification).delete()
            db.query(models.User).delete()
            db.commit()

        print("[2/4] Seeding 5 Role Demo Users...")
        demo_password = hash_password("Password123!")

        # 1. Athlete User
        u_athlete = models.User(
            user_id=uuid.uuid4(),
            name="Alex Hunter",
            email="athlete@demo.com",
            password=demo_password,
            role=models.UserRole.ATHLETE,
            phone="+1 555-0101"
        )
        # 2. Coach User
        u_coach = models.User(
            user_id=uuid.uuid4(),
            name="Coach Marcus",
            email="coach@demo.com",
            password=demo_password,
            role=models.UserRole.COACH,
            phone="+1 555-0102"
        )
        # 3. Physiotherapist User
        u_physio = models.User(
            user_id=uuid.uuid4(),
            name="Dr. Sarah Jenkins",
            email="physio@demo.com",
            password=demo_password,
            role=models.UserRole.PHYSIOTHERAPIST,
            phone="+1 555-0103"
        )
        # 4. Sports Scientist User
        u_scientist = models.User(
            user_id=uuid.uuid4(),
            name="Dr. Aris Thorne",
            email="scientist@demo.com",
            password=demo_password,
            role=models.UserRole.SPORTS_SCIENTIST,
            phone="+1 555-0104"
        )
        # 5. Administrator User
        u_admin = models.User(
            user_id=uuid.uuid4(),
            name="System Administrator",
            email="admin@demo.com",
            password=demo_password,
            role=models.UserRole.ADMINISTRATOR,
            phone="+1 555-0105"
        )
        # 6. Secondary Athlete User
        u_athlete2 = models.User(
            user_id=uuid.uuid4(),
            name="Jordan Lee",
            email="jordan@demo.com",
            password=demo_password,
            role=models.UserRole.ATHLETE,
            phone="+1 555-0106"
        )

        db.add_all([u_athlete, u_coach, u_physio, u_scientist, u_admin, u_athlete2])
        db.commit()

        print("[3/4] Seeding Athlete Profiles & Injury Records...")
        # Profile 1: Alex Hunter
        p_alex = models.Athlete(
            athlete_id=uuid.uuid4(),
            user_id=u_athlete.user_id,
            sport="Soccer",
            position="Midfielder",
            age=22,
            height=178.5,
            weight=72.0,
            training_load=14.5,
            flexibility=82.0,
            strength=78.5,
            balance=88.0,
            endurance=85.0,
            coach_notes="Baseline physical metrics complete. Knee valgus angle monitored."
        )

        # Profile 2: Jordan Lee
        p_jordan = models.Athlete(
            athlete_id=uuid.uuid4(),
            user_id=u_athlete2.user_id,
            sport="Basketball",
            position="Guard",
            age=24,
            height=188.0,
            weight=81.0,
            training_load=18.0,
            flexibility=75.0,
            strength=85.0,
            balance=80.0,
            endurance=82.0,
            coach_notes="High vertical jump load. Previous right ankle sprain history."
        )

        db.add_all([p_alex, p_jordan])
        db.commit()

        # Injury Records for Alex
        inj1 = models.InjuryHistory(
            injury_id=uuid.uuid4(),
            athlete_id=p_alex.athlete_id,
            injury_type="Hamstring Pull",
            body_part="Left Hamstring",
            severity="Moderate",
            injury_date=date(2025, 5, 10),
            recovery_date=date(2025, 6, 5),
            remarks="Physical therapy program completed cleanly."
        )

        inj2 = models.InjuryHistory(
            injury_id=uuid.uuid4(),
            athlete_id=p_alex.athlete_id,
            injury_type="Ankle Sprain",
            body_part="Right Ankle",
            severity="Low",
            injury_date=date(2025, 9, 15),
            recovery_date=date(2025, 9, 28),
            remarks="Taped during matchplay."
        )

        # Injury Record for Jordan
        inj3 = models.InjuryHistory(
            injury_id=uuid.uuid4(),
            athlete_id=p_jordan.athlete_id,
            injury_type="Patellar Tendonitis",
            body_part="Left Knee",
            severity="Moderate",
            injury_date=date(2025, 11, 20),
            recovery_date=None,
            remarks="Active rehabilitation protocol."
        )

        db.add_all([inj1, inj2, inj3])
        db.commit()

        print("[4/4] Seeding Sample Video Records & Analysis Results...")
        v1_id = uuid.uuid4()
        v1 = models.Video(
            video_id=v1_id,
            athlete_id=p_alex.athlete_id,
            activity="Squatting",
            video_url="uploads/processed/demo_squat.mp4",
            duration=5.2,
            fps=30,
            resolution="1920x1080",
            quality_score=0.94,
            processing_status="completed"
        )
        db.add(v1)
        db.commit()

        ar1 = models.AnalysisResult(
            analysis_id=uuid.uuid4(),
            video_id=v1.video_id,
            athlete_id=p_alex.athlete_id,
            knee_valgus=0.88,
            hip_stability=4.2,
            trunk_lean=18.5,
            stride_length=1.2,
            joint_alignment=142.0,
            symmetry_score=92.5,
            fatigue_score=2.5,
            movement_quality=85.0,
            overall_risk_score=24.5,
            risk_level="Low"
        )
        db.add(ar1)
        db.commit()

        ip1 = models.InjuryPrediction(
            prediction_id=uuid.uuid4(),
            analysis_id=ar1.analysis_id,
            acl_risk=24.5,
            hamstring_risk=18.0,
            ankle_risk=15.0,
            shoulder_risk=8.0,
            lower_back_risk=12.0,
            overuse_risk=22.0
        )
        db.add(ip1)

        rec1 = models.Recommendation(
            prediction_id=ip1.prediction_id,
            exercise="- Single-Leg Romanian Deadlift: 3 sets x 10 reps\n- Glute Medius Clamshells: 3 sets x 15 reps",
            mobility="- Ankle Dorsiflexion Wall Mobilization\n- Hip Flexor Dynamic Stretch",
            strengthening="- Eccentric Hamstring Curls\n- Core Anti-Rotation Pallof Press",
            recovery="Status: Active Recovery. Maintain 8 hours sleep and hydration.",
            training_modification="Maintain current training volume."
        )
        db.add(rec1)

        anom1 = models.MovementAnomaly(
            anomaly_id=uuid.uuid4(),
            analysis_id=ar1.analysis_id,
            video_id=v1.video_id,
            timestamp_start=1.2,
            timestamp_end=1.6,
            issue_type="Minor Knee Valgus Drift",
            severity="Low",
            confidence=0.85,
            affected_joints="Left Knee",
            description="Slight medial knee displacement during lowest point of squat descent."
        )
        db.add(anom1)

        # Notification for Alex
        notif1 = models.Notification(
            notification_id=uuid.uuid4(),
            user_id=u_athlete.user_id,
            title="Assessment Ready",
            message="Your latest Squatting assessment video has been processed cleanly.",
            notification_type="Info",
            is_read=False
        )
        db.add(notif1)

        db.commit()

        print("\nSeed completed successfully!")
        print("-" * 60)
        print("Demo User Credentials (Password for all: Password123!):")
        print("  - Athlete:          athlete@demo.com")
        print("  - Coach:            coach@demo.com")
        print("  - Physiotherapist:  physio@demo.com")
        print("  - Sports Scientist: scientist@demo.com")
        print("  - Administrator:    admin@demo.com")
        print("-" * 60)

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
