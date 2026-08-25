from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import AthleteLink, AthleteProfile, LinkType, User, VideoAnalysis, VideoStatus
from app.routers.deps import require_coach, require_linked_athlete
from app.schemas import AddAthleteRequest, AthleteProfileOut, RosterAthleteOut, VideoAnalysisListItem
from app.services.roster import find_athlete_by_email, get_roster

router = APIRouter(prefix="/api/coach", tags=["coach"])


@router.get("/team", response_model=list[RosterAthleteOut])
def get_team(current_user: User = Depends(require_coach), db: Session = Depends(get_db)):
    return get_roster(db, current_user.id, LinkType.COACH)


@router.get("/team/summary")
def team_summary(current_user: User = Depends(require_coach), db: Session = Depends(get_db)):
    roster = get_roster(db, current_user.id, LinkType.COACH)
    counts = {"LOW": 0, "MODERATE": 0, "HIGH": 0, "CRITICAL": 0, "NO_DATA": 0}
    for a in roster:
        cat = a["latest_risk_category"] or "NO_DATA"
        counts[cat] = counts.get(cat, 0) + 1
    return {"total_athletes": len(roster), "risk_breakdown": counts}


@router.post("/team/add", response_model=RosterAthleteOut, status_code=201)
def add_athlete(payload: AddAthleteRequest, current_user: User = Depends(require_coach), db: Session = Depends(get_db)):
    athlete = find_athlete_by_email(db, payload.athlete_email)
    if athlete is None:
        raise HTTPException(status_code=404, detail="No athlete account found with that email.")

    existing = (
        db.query(AthleteLink)
        .filter(AthleteLink.professional_user_id == current_user.id, AthleteLink.athlete_id == athlete.id,
                AthleteLink.link_type == LinkType.COACH)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="This athlete is already on your team.")

    db.add(AthleteLink(professional_user_id=current_user.id, athlete_id=athlete.id, link_type=LinkType.COACH))
    db.commit()

    roster = get_roster(db, current_user.id, LinkType.COACH)
    return next(a for a in roster if a["athlete_id"] == athlete.id)


@router.delete("/team/{athlete_id}", status_code=204)
def remove_athlete(athlete_id: str, current_user: User = Depends(require_coach), db: Session = Depends(get_db)):
    link = (
        db.query(AthleteLink)
        .filter(AthleteLink.professional_user_id == current_user.id, AthleteLink.athlete_id == athlete_id,
                AthleteLink.link_type == LinkType.COACH)
        .first()
    )
    if link is None:
        raise HTTPException(status_code=404, detail="Athlete not found on your team.")
    db.delete(link)
    db.commit()


@router.get("/athletes/{athlete_id}", response_model=AthleteProfileOut)
def get_athlete_profile(athlete: AthleteProfile = Depends(require_linked_athlete(LinkType.COACH))):
    return athlete


@router.get("/athletes/{athlete_id}/videos", response_model=list[VideoAnalysisListItem])
def get_athlete_videos(
    athlete: AthleteProfile = Depends(require_linked_athlete(LinkType.COACH)),
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
