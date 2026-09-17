from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.athlete import Athlete

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  # 'athlete' or 'coach'


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # 1. Check if user already exists in Supabase
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists.",
        )

    # 2. Save new User record into Supabase
    new_user = User(
        name=payload.name,
        email=payload.email,
        password=payload.password,  # In production, hash with passlib/bcrypt
        role=payload.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 3. Automatically create an empty Athlete entry if registering as an athlete
    if payload.role.lower() == "athlete":
        new_athlete = Athlete(
            user_id=new_user.user_id,
            sport="Not Specified",
            position="N/A",
            age=0,
            height=0.0,
            weight=0.0,
            training_load=0.0,
            flexibility=0.0,
            strength=0.0,
            balance=0.0,
            endurance=0.0,
            coach_notes="No notes available.",
        )
        db.add(new_athlete)
        db.commit()

    return {"message": "User registered successfully!"}


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    # 1. Query user by email from Supabase
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or user.password != payload.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if user.role.lower() != payload.role.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User is not registered as a {payload.role}.",
        )

    # 2. Return authentication response
    return {
        "access_token": f"bearer-token-{user.email}",
        "token_type": "bearer",
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


@router.get("/users/count")
def get_user_count(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return {
        "total_users": len(users),
        "registered_emails": [u.email for u in users],
        "users": [{"name": u.name, "email": u.email, "role": u.role} for u in users],
    }
