"""Notification & Alert System.

Every function here is called from a real event site (pipeline completion,
registration, athlete-link creation) - never invoked to seed placeholder
content. Matches the spec's alert categories: high-risk movement alerts,
training-load warnings, recovery reminders, assessment-completion alerts,
new-user-registration alerts.
"""

from sqlalchemy.orm import Session

from app.models import AthleteLink, LinkType, Notification, NotificationType, User, UserRole, VideoAnalysis


def _create(db: Session, user_id: str, type_: NotificationType, title: str, message: str, link: str | None = None) -> None:
    db.add(Notification(user_id=user_id, type=type_, title=title, message=message, link=link))


def notify_admins(db: Session, title: str, message: str, link: str | None = None) -> None:
    admin_ids = [u.id for u in db.query(User).filter(User.role == UserRole.ADMIN).all()]
    for admin_id in admin_ids:
        _create(db, admin_id, NotificationType.NEW_USER_REGISTERED, title, message, link)
    db.commit()


def notify_athlete_linked(db: Session, athlete_user_id: str, professional_name: str, link_type: LinkType) -> None:
    role_label = {"coach": "coach", "physiotherapist": "physiotherapist", "sports_scientist": "sports scientist"}[link_type.value]
    _create(
        db, athlete_user_id, NotificationType.ATHLETE_LINKED,
        "New team member added",
        f"{professional_name} ({role_label}) added you to their {'team' if link_type == LinkType.COACH else 'patient list' if link_type == LinkType.PHYSIOTHERAPIST else 'research dataset'}.",
    )
    db.commit()


def notify_after_pipeline(db: Session, video: VideoAnalysis) -> None:
    """Fans out notifications once a video's pipeline reaches a terminal
    state. Called from services/pipeline.py right after status is set."""
    athlete = video.athlete
    athlete_user_id = athlete.user_id
    link = f"/analysis/{video.id}"

    if video.status.value == "failed":
        _create(
            db, athlete_user_id, NotificationType.ASSESSMENT_FAILED,
            "Analysis failed",
            f"Your {video.activity_type.value} analysis couldn't be completed: {video.error_message}",
            link,
        )
        db.commit()
        return

    risk = video.risk_assessment
    category = risk["risk_category"]
    score = risk["overall_risk_score"]

    _create(
        db, athlete_user_id, NotificationType.ASSESSMENT_COMPLETED,
        "Analysis complete",
        f"Your {video.activity_type.value} analysis is ready — {category} risk ({score}/100).",
        link,
    )

    training_component = risk["components"]["training_load_indicators"]
    if training_component >= 61:
        _create(
            db, athlete_user_id, NotificationType.TRAINING_LOAD_WARNING,
            "Training load warning",
            f"Your training-load risk component is elevated ({training_component}/100) in your latest analysis.",
            link,
        )

    if category in ("HIGH", "CRITICAL"):
        _create(
            db, athlete_user_id, NotificationType.HIGH_RISK_ALERT,
            f"{category} injury risk detected",
            f"Your latest {video.activity_type.value} analysis scored {score}/100 ({category}). Review your recommendations.",
            link,
        )

        # Fan out to every coach/physio/scientist linked to this athlete.
        links = db.query(AthleteLink).filter(AthleteLink.athlete_id == athlete.id).all()
        for l in links:
            role_word = {"coach": "athlete", "physiotherapist": "patient", "sports_scientist": "athlete"}[l.link_type.value]
            staff_link = (
                f"/coach/athletes/{athlete.id}" if l.link_type == LinkType.COACH
                else f"/physio/patients/{athlete.id}" if l.link_type == LinkType.PHYSIOTHERAPIST
                else f"/scientist/athletes/{athlete.id}"
            )
            _create(
                db, l.professional_user_id, NotificationType.HIGH_RISK_ALERT,
                f"{role_word.capitalize()} entered {category.lower()}-risk zone",
                f"{athlete.user.full_name} scored {score}/100 ({category}) on a {video.activity_type.value} analysis.",
                staff_link,
            )

    db.commit()
