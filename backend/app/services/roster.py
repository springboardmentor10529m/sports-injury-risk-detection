"""Builds the athlete roster view (name, sport, latest risk) shared by the
coach, physiotherapist and sports-scientist dashboards. Every field here
comes from a real DB row - if an athlete has no completed analyses yet,
latest_risk_score is None rather than a placeholder number."""

from sqlalchemy.orm import Session

from app.models import AthleteLink, AthleteProfile, LinkType, User, VideoAnalysis, VideoStatus


def get_roster(db: Session, professional_user_id: str, link_type: LinkType) -> list[dict]:
    links = (
        db.query(AthleteLink)
        .filter(AthleteLink.professional_user_id == professional_user_id, AthleteLink.link_type == link_type)
        .all()
    )
    roster = []
    for link in links:
        athlete = db.get(AthleteProfile, link.athlete_id)
        if athlete is None:
            continue
        user = athlete.user

        completed = (
            db.query(VideoAnalysis)
            .filter(VideoAnalysis.athlete_id == athlete.id, VideoAnalysis.status == VideoStatus.COMPLETED)
            .order_by(VideoAnalysis.completed_at.desc())
            .all()
        )
        latest = completed[0] if completed else None

        roster.append({
            "athlete_id": athlete.id,
            "full_name": user.full_name,
            "email": user.email,
            "sport": athlete.sport,
            "position": athlete.position,
            "latest_risk_score": latest.risk_assessment["overall_risk_score"] if latest else None,
            "latest_risk_category": latest.risk_assessment["risk_category"] if latest else None,
            "latest_analysis_date": latest.completed_at if latest else None,
            "total_analyses": len(completed),
        })
    return roster


def find_athlete_by_email(db: Session, email: str) -> AthleteProfile | None:
    user = db.query(User).filter(User.email == email).first()
    if user is None or user.athlete_profile is None:
        return None
    return user.athlete_profile
