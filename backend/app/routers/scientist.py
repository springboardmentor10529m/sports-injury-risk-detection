from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import AthleteLink, LinkType, User, VideoAnalysis, VideoStatus
from app.routers.deps import require_linked_athlete, require_scientist
from app.schemas import AddAthleteRequest, AthleteProfileOut, RosterAthleteOut, VideoAnalysisListItem
from app.services.notifications import notify_athlete_linked
from app.services.roster import find_athlete_by_email, get_roster

router = APIRouter(prefix="/api/scientist", tags=["sports-scientist"])


@router.get("/athletes", response_model=list[RosterAthleteOut])
def get_athletes(current_user: User = Depends(require_scientist), db: Session = Depends(get_db)):
    return get_roster(db, current_user.id, LinkType.SPORTS_SCIENTIST)


@router.post("/athletes/add", response_model=RosterAthleteOut, status_code=201)
def add_athlete(payload: AddAthleteRequest, current_user: User = Depends(require_scientist), db: Session = Depends(get_db)):
    athlete = find_athlete_by_email(db, payload.athlete_email)
    if athlete is None:
        raise HTTPException(status_code=404, detail="No athlete account found with that email.")

    existing = (
        db.query(AthleteLink)
        .filter(AthleteLink.professional_user_id == current_user.id, AthleteLink.athlete_id == athlete.id,
                AthleteLink.link_type == LinkType.SPORTS_SCIENTIST)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="This athlete is already in your dataset.")

    db.add(AthleteLink(professional_user_id=current_user.id, athlete_id=athlete.id, link_type=LinkType.SPORTS_SCIENTIST))
    db.commit()
    notify_athlete_linked(db, athlete.user_id, current_user.full_name, LinkType.SPORTS_SCIENTIST)

    roster = get_roster(db, current_user.id, LinkType.SPORTS_SCIENTIST)
    return next(a for a in roster if a["athlete_id"] == athlete.id)


@router.get("/athletes/{athlete_id}", response_model=AthleteProfileOut)
def get_athlete_profile(athlete=Depends(require_linked_athlete(LinkType.SPORTS_SCIENTIST))):
    return athlete


@router.get("/athletes/{athlete_id}/videos", response_model=list[VideoAnalysisListItem])
def get_athlete_videos(
    athlete=Depends(require_linked_athlete(LinkType.SPORTS_SCIENTIST)),
    db: Session = Depends(get_db),
):
    videos = (
        db.query(VideoAnalysis)
        .filter(VideoAnalysis.athlete_id == athlete.id)
        .order_by(VideoAnalysis.created_at.desc())
        .all()
    )
    out = []
    for v in videos:
        item = VideoAnalysisListItem.model_validate(v)
        if v.status == VideoStatus.COMPLETED and v.risk_assessment:
            item.overall_risk_score = v.risk_assessment["overall_risk_score"]
            item.risk_category = v.risk_assessment["risk_category"]
        out.append(item)
    return out


@router.get("/analytics")
def get_analytics(current_user: User = Depends(require_scientist), db: Session = Depends(get_db)):
    """All figures below are computed directly from this scientist's linked
    athletes' completed analyses. If there isn't enough data for a given
    statistic, it's returned as null with an explanation rather than a
    placeholder value."""
    import numpy as np

    links = (
        db.query(AthleteLink)
        .filter(AthleteLink.professional_user_id == current_user.id, AthleteLink.link_type == LinkType.SPORTS_SCIENTIST)
        .all()
    )
    athlete_ids = [l.athlete_id for l in links]
    if not athlete_ids:
        return {"has_data": False, "message": "Add athletes to your dataset to see aggregate analytics."}

    videos = (
        db.query(VideoAnalysis)
        .filter(VideoAnalysis.athlete_id.in_(athlete_ids), VideoAnalysis.status == VideoStatus.COMPLETED)
        .all()
    )
    if not videos:
        return {"has_data": False, "message": "None of your linked athletes have completed analyses yet."}

    risk_scores = [v.risk_assessment["overall_risk_score"] for v in videos]
    categories = [v.risk_assessment["risk_category"] for v in videos]
    training_components = [v.risk_assessment["components"]["training_load_indicators"] for v in videos]

    def avg_bio(key):
        vals = [v.biomechanics.get(key) for v in videos if v.biomechanics.get(key) is not None]
        return round(float(np.mean(vals)), 2) if vals else None

    category_counts = {"LOW": 0, "MODERATE": 0, "HIGH": 0, "CRITICAL": 0}
    for c in categories:
        category_counts[c] = category_counts.get(c, 0) + 1

    correlation = None
    if len(videos) >= 3 and len(set(training_components)) > 1 and len(set(risk_scores)) > 1:
        correlation = round(float(np.corrcoef(training_components, risk_scores)[0, 1]), 3)

    return {
        "has_data": True,
        "athletes_tracked": len(athlete_ids),
        "videos_analyzed": len(videos),
        "avg_risk_score": round(float(np.mean(risk_scores)), 2),
        "risk_category_distribution": category_counts,
        "avg_movement_quality_score": avg_bio("movement_quality_score"),
        "avg_symmetry_score": avg_bio("symmetry_score"),
        "avg_knee_valgus_pct": avg_bio("knee_valgus_avg_pct"),
        "avg_trunk_lean_deg": avg_bio("trunk_lean_avg_deg"),
        "avg_fatigue_score": avg_bio("fatigue_score"),
        "training_load_vs_risk_correlation": correlation,
        "correlation_note": (
            "Pearson correlation between each video's training-load risk component and its overall "
            "risk score, across this dataset. Null if fewer than 3 completed videos or no variance."
        ),
    }
