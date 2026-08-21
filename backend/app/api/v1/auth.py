"""Authentication endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgresql import get_db
from app.schemas.user import UserCreate, UserResponse, TokenResponse
from app.services.user_service import UserService
from app.core.security import get_current_user, create_access_token
from jose import jwt, JWTError
from app.config import get_settings

router = APIRouter()
settings = get_settings()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    service = UserService(db)
    user = await service.create_user(user_in)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Authenticate and receive JWT access token."""
    service = UserService(db)
    user = await service.authenticate(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    tokens = UserService.create_tokens(user)
    return TokenResponse(
        access_token=tokens["access_token"],
        token_type=tokens["token_type"]
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    current_user=Depends(get_current_user),
):
    """Refresh access token using a valid existing token."""
    tokens = UserService.create_tokens(current_user)
    return TokenResponse(
        access_token=tokens["access_token"],
        token_type=tokens["token_type"]
    )
