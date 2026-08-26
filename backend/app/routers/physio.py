from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import AthleteLink, AthleteProfile, ClinicalNote, LinkType, User, VideoAnalysis, VideoStatus
from app.routers.deps import require_linked_athlete, require_physio
from app.schemas import (
    AddAthleteRequest,
    AthleteProfileOut,
    ClinicalNoteCreate,
    ClinicalNoteOut,
    RosterAthleteOut,
    VideoAnalysisListItem,
)
from app.services.notifications import notify_athlete_linked
from app.services.roster import find_athlete_by_email, get_roster

router = APIRouter(prefix="/api/physio", tags=["physiotherapist"])


@router.get("/patients", response_model=list[RosterAthleteOut])
def get_patients(current_user: User = Depends(require_physio), db: Session = Depends(get_db)):
    return get_roster(db, current_user.id, LinkType.PHYSIOTHERAPIST)


@router.post("/patients/add", response_model=RosterAthleteOut, status_code=201)
def add_patient(payload: AddAthleteRequest, current_user: User = Depends(require_physio), db: Session = Depends(get_db)):
    athlete = find_athlete_by_email(db, payload.athlete_email)
    if athlete is None:
        raise HTTPException(status_code=404, detail="No athlete account found with that email.")

    existing = (
        db.query(AthleteLink)
        .filter(AthleteLink.professional_user_id == current_user.id, AthleteLink.athlete_id == athlete.id,
                AthleteLink.link_type == LinkType.PHYSIOTHERAPIST)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="This athlete is already one of your patients.")

    db.add(AthleteLink(professional_user_id=current_user.id, athlete_id=athlete.id, link_type=LinkType.PHYSIOTHERAPIST))
    db.commit()
    notify_athlete_linked(db, athlete.user_id, current_user.full_name, LinkType.PHYSIOTHERAPIST)

    roster = get_roster(db, current_user.id, LinkType.PHYSIOTHERAPIST)
    return next(a for a in roster if a["athlete_id"] == athlete.id)


@router.delete("/patients/{athlete_id}", status_code=204)
def remove_patient(athlete_id: str, current_user: User = Depends(require_physio), db: Session = Depends(get_db)):
    link = (
        db.query(AthleteLink)
        .filter(AthleteLink.professional_user_id == current_user.id, AthleteLink.athlete_id == athlete_id,
                AthleteLink.link_type == LinkType.PHYSIOTHERAPIST)
        .first()
    )
    if link is None:
        raise HTTPException(status_code=404, detail="Patient not found on your list.")
    db.delete(link)
    db.commit()


@router.get("/patients/{athlete_id}", response_model=AthleteProfileOut)
def get_patient_profile(athlete: AthleteProfile = Depends(require_linked_athlete(LinkType.PHYSIOTHERAPIST))):
    return athlete


@router.get("/patients/{athlete_id}/videos", response_model=list[VideoAnalysisListItem])
def get_patient_videos(
    athlete: AthleteProfile = Depends(require_linked_athlete(LinkType.PHYSIOTHERAPIST)),
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


@router.get("/patients/{athlete_id}/notes", response_model=list[ClinicalNoteOut])
def list_notes(
    athlete: AthleteProfile = Depends(require_linked_athlete(LinkType.PHYSIOTHERAPIST)),
    db: Session = Depends(get_db),
):
    notes = (
        db.query(ClinicalNote)
        .filter(ClinicalNote.athlete_id == athlete.id)
        .order_by(ClinicalNote.created_at.desc())
        .all()
    )
    out = []
    for n in notes:
        item = ClinicalNoteOut.model_validate(n)
        physio = db.get(User, n.physio_user_id)
        item.physio_name = physio.full_name if physio else None
        out.append(item)
    return out


@router.post("/patients/{athlete_id}/notes", response_model=ClinicalNoteOut, status_code=201)
def add_note(
    payload: ClinicalNoteCreate,
    athlete: AthleteProfile = Depends(require_linked_athlete(LinkType.PHYSIOTHERAPIST)),
    current_user: User = Depends(require_physio),
    db: Session = Depends(get_db),
):
    note = ClinicalNote(
        physio_user_id=current_user.id, athlete_id=athlete.id, phase=payload.phase, note=payload.note,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    out = ClinicalNoteOut.model_validate(note)
    out.physio_name = current_user.full_name
    return out
