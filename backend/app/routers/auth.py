from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models import (
    AthleteProfile,
    CoachProfile,
    PhysiotherapistProfile,
    SportsScientistProfile,
    User,
    UserRole,
)
from app.routers.deps import get_current_user
from app.schemas import (
    LoginRequest,
    RegisterCoachRequest,
    RegisterPhysioRequest,
    RegisterRequest,
    RegisterScientistRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _check_email_free(db: Session, email: str) -> None:
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_athlete(payload: RegisterRequest, db: Session = Depends(get_db)):
    _check_email_free(db, payload.email)

    user = User(
        email=payload.email, hashed_password=hash_password(payload.password),
        full_name=payload.full_name, role=UserRole.ATHLETE,
    )
    db.add(user)
    db.flush()

    profile = AthleteProfile(
        user_id=user.id, sport=payload.sport, position=payload.position, age=payload.age,
        height_cm=payload.height_cm, weight_kg=payload.weight_kg,
        previous_injury_count=payload.previous_injury_count,
        days_since_last_injury=payload.days_since_last_injury,
        current_pain_flag=payload.current_pain_flag,
        weekly_training_hours=payload.weekly_training_hours,
        acute_chronic_ratio=payload.acute_chronic_ratio,
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register/coach", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_coach(payload: RegisterCoachRequest, db: Session = Depends(get_db)):
    _check_email_free(db, payload.email)
    user = User(
        email=payload.email, hashed_password=hash_password(payload.password),
        full_name=payload.full_name, role=UserRole.COACH,
    )
    db.add(user)
    db.flush()
    db.add(CoachProfile(
        user_id=user.id, sport=payload.sport, specialization=payload.specialization,
        years_experience=payload.years_experience, organization=payload.organization,
    ))
    db.commit()
    db.refresh(user)
    return user


@router.post("/register/physiotherapist", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_physio(payload: RegisterPhysioRequest, db: Session = Depends(get_db)):
    _check_email_free(db, payload.email)
    user = User(
        email=payload.email, hashed_password=hash_password(payload.password),
        full_name=payload.full_name, role=UserRole.PHYSIOTHERAPIST,
    )
    db.add(user)
    db.flush()
    db.add(PhysiotherapistProfile(
        user_id=user.id, qualification=payload.qualification, specialization=payload.specialization,
        years_experience=payload.years_experience, clinic=payload.clinic,
    ))
    db.commit()
    db.refresh(user)
    return user


@router.post("/register/sports-scientist", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_scientist(payload: RegisterScientistRequest, db: Session = Depends(get_db)):
    _check_email_free(db, payload.email)
    user = User(
        email=payload.email, hashed_password=hash_password(payload.password),
        full_name=payload.full_name, role=UserRole.SPORTS_SCIENTIST,
    )
    db.add(user)
    db.flush()
    db.add(SportsScientistProfile(
        user_id=user.id, institution=payload.institution, research_area=payload.research_area,
        specialization=payload.specialization, years_experience=payload.years_experience,
    ))
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated by an administrator.")
    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token)


@router.post("/login-json", response_model=TokenResponse)
def login_json(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated by an administrator.")
    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
