from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import database, models, schemas, auth

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserOut)
def register_user(user_data: schemas.UserRegister, db: Session = Depends(database.get_db)):
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")

    hashed_password = auth.get_password_hash(user_data.password)
    user = models.User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_password,
        role=user_data.role,
        phone=user_data.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Auto-create athlete profile if user is an ATHLETE
    if user.role == models.UserRole.ATHLETE.value or user.role == "ATHLETE":
        athlete = models.Athlete(user_id=user.user_id)
        db.add(athlete)
        db.commit()
        db.refresh(user)

    return user

@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not auth.verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = auth.create_access_token(data={"sub": user.user_id, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
