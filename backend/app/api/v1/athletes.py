"""Athlete management endpoints."""
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgresql import get_db
from app.schemas.athlete import (
    AthleteProfileResponse, AthleteProfileCreate, AthleteProfileUpdate,
    InjuryHistoryResponse, InjuryHistoryCreate,
    TrainingLoadResponse, TrainingLoadCreate,
    TeamCreate, TeamResponse,
)
from app.core.rbac import UserRole
from app.core.security import get_current_user
from app.api.deps import require_roles
from app.services.athlete_service import AthleteService

router = APIRouter()


@router.get("/", response_model=List[AthleteProfileResponse])
async def list_athletes(
    user=Depends(require_roles(
        UserRole.COACH, UserRole.PHYSIOTHERAPIST,
        UserRole.SPORTS_SCIENTIST, UserRole.ADMIN
    )),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    team_id: Optional[UUID] = None,
):
    """List athletes. Accessible by coaches, physios, scientists, admins."""
    service = AthleteService(db)
    athletes, total = await service.list_athletes(skip=skip, limit=limit, team_id=team_id)
    return athletes


@router.post("/profile", response_model=AthleteProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_athlete_profile(
    profile_in: AthleteProfileCreate,
    user=Depends(require_roles(UserRole.ADMIN, UserRole.ATHLETE)),
    db: AsyncSession = Depends(get_db),
):
    """Create an athlete profile for a user."""
    # Athletes can only create their own profile
    if user.role == UserRole.ATHLETE and profile_in.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Athletes can only create their own profile"
        )
    service = AthleteService(db)
    return await service.create_profile(profile_in)


@router.get("/{athlete_id}", response_model=AthleteProfileResponse)
async def get_athlete(
    athlete_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get athlete profile. Athletes can only see their own profile."""
    service = AthleteService(db)
    profile = await service.get_profile(athlete_id)
    
    # Athletes can only view their own profile
    if current_user.role == UserRole.ATHLETE and profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Athletes can only view their own profile"
        )
    return profile


@router.put("/{athlete_id}", response_model=AthleteProfileResponse)
async def update_athlete(
    athlete_id: UUID,
    profile_in: AthleteProfileUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update athlete profile. Athletes can only update their own."""
    service = AthleteService(db)
    profile = await service.get_profile(athlete_id)
    
    if current_user.role == UserRole.ATHLETE and profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Athletes can only update their own profile"
        )
    if current_user.role not in [
        UserRole.ATHLETE, UserRole.ADMIN,
        UserRole.COACH, UserRole.PHYSIOTHERAPIST
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update athlete profiles"
        )
    return await service.update_profile(athlete_id, profile_in)


@router.get("/{athlete_id}/injury-history", response_model=List[InjuryHistoryResponse])
async def get_injury_history(
    athlete_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get injury history. Athletes see own; coaches/physios/scientists see team athletes."""
    service = AthleteService(db)
    profile = await service.get_profile(athlete_id)
    
    if current_user.role == UserRole.ATHLETE and profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Athletes can only view their own injury history"
        )
    return await service.get_injury_history(athlete_id)


@router.post("/{athlete_id}/injury-history", response_model=InjuryHistoryResponse, status_code=status.HTTP_201_CREATED)
async def add_injury_record(
    athlete_id: UUID,
    record_in: InjuryHistoryCreate,
    user=Depends(require_roles(
        UserRole.PHYSIOTHERAPIST, UserRole.ADMIN, UserRole.SPORTS_SCIENTIST
    )),
    db: AsyncSession = Depends(get_db),
):
    """Add injury record. Physios and admins only."""
    service = AthleteService(db)
    return await service.add_injury_record(athlete_id, record_in)


@router.get("/{athlete_id}/training-load", response_model=List[TrainingLoadResponse])
async def get_training_load(
    athlete_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
):
    """Get training load history."""
    service = AthleteService(db)
    profile = await service.get_profile(athlete_id)
    
    if current_user.role == UserRole.ATHLETE and profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Athletes can only view their own training load"
        )
    return await service.get_training_load(athlete_id, limit=limit)


@router.post("/{athlete_id}/training-load", response_model=TrainingLoadResponse, status_code=status.HTTP_201_CREATED)
async def add_training_load(
    athlete_id: UUID,
    load_in: TrainingLoadCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log training session. Athletes log own; coaches can log for team athletes."""
    service = AthleteService(db)
    profile = await service.get_profile(athlete_id)
    
    if current_user.role == UserRole.ATHLETE and profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Athletes can only log their own training"
        )
    if current_user.role not in [
        UserRole.ATHLETE, UserRole.COACH, UserRole.ADMIN
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to log training data"
        )
    return await service.log_training(athlete_id, load_in)
