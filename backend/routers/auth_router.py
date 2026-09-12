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


@router.post("/google", response_model=schemas.GoogleAuthResponse)
def google_auth(auth_data: schemas.GoogleAuthRequest, db: Session = Depends(database.get_db)):
    """
    Authenticate or register a user using Google OAuth 2.0 Identity Services credential (ID token).
    Verifies the cryptographic Google ID token, finds or provisions the user record,
    and returns a standard AthleteGuard JWT access token.
    """
    import uuid
    from services.google_auth_service import verify_google_credential, GoogleAuthError

    credential = auth_data.credential or auth_data.code
    if not credential:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google credential token or authorization code is required."
        )

    try:
        google_profile = verify_google_credential(credential)
    except GoogleAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

    email = google_profile["email"]
    google_id = google_profile.get("google_id")
    name = google_profile.get("name") or email.split("@")[0]
    picture = google_profile.get("picture")

    # 1. Lookup existing user by google_id or email
    user = None
    if google_id:
        user = db.query(models.User).filter(models.User.google_id == google_id).first()
    if not user:
        user = db.query(models.User).filter(models.User.email == email).first()

    is_new = False
    if user:
        # Existing user: link google_id and update avatar if missing
        if not user.google_id and google_id:
            user.google_id = google_id
        if not user.profile_image and picture:
            user.profile_image = picture
        if not user.auth_provider:
            user.auth_provider = "google"
        db.commit()
        db.refresh(user)
    else:
        # 2. Provision new user
        is_new = True
        chosen_role = (auth_data.role or "ATHLETE").upper()
        if chosen_role not in [r.value for r in models.UserRole]:
            chosen_role = models.UserRole.ATHLETE.value

        # Secure random password placeholder for OAuth accounts
        random_pwd_hash = auth.get_password_hash(f"google_oauth_{uuid.uuid4()}_{email}")

        user = models.User(
            name=name,
            email=email,
            password=random_pwd_hash,
            role=chosen_role,
            profile_image=picture,
            google_id=google_id,
            auth_provider="google"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Auto-create fresh unrated athlete profile if ATHLETE
        if user.role == models.UserRole.ATHLETE.value or user.role == "ATHLETE":
            athlete = models.Athlete(
                user_id=user.user_id,
                sport="General",
                position="Athlete",
                age=None,
                height=None,
                weight=None,
                training_load=0.0,
                flexibility=0.0,
                strength=0.0,
                balance=0.0,
                endurance=0.0
            )
            db.add(athlete)
            db.commit()
            db.refresh(user)

    # 3. Generate platform JWT
    access_token = auth.create_access_token(data={"sub": user.user_id, "role": user.role})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "is_new_user": is_new
    }


@router.get("/google/config")
def get_google_config():
    """
    Returns public Google OAuth configuration for the frontend client.
    """
    from services.google_auth_service import get_google_oauth_config
    return get_google_oauth_config()
