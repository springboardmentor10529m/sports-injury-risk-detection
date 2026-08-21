"""
Athlete service — handles athlete profiles, injury history, and training load.
"""
from typing import Optional, List
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.athlete import (
    AthleteProfile, Team, TeamMembership, 
    InjuryHistory, TrainingLoad
)
from app.models.user import User
from app.core.rbac import UserRole
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError
from app.schemas.athlete import (
    AthleteProfileCreate, AthleteProfileUpdate,
    InjuryHistoryCreate, TrainingLoadCreate,
    TeamCreate
)


class AthleteService:
    """Athlete management service with PostgreSQL persistence."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # --- Athlete Profile ---
    
    async def create_profile(self, profile_in: AthleteProfileCreate) -> AthleteProfile:
        """Create an athlete profile for an existing user."""
        # Check user exists
        result = await self.db.execute(
            select(User).where(User.id == profile_in.user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError(f"User '{profile_in.user_id}' not found")
        
        # Check no existing profile
        existing = await self.db.execute(
            select(AthleteProfile).where(AthleteProfile.user_id == profile_in.user_id)
        )
        if existing.scalar_one_or_none():
            raise ValidationError("Athlete profile already exists for this user")
        
        profile = AthleteProfile(**profile_in.model_dump())
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile
    
    async def get_profile(self, athlete_id: UUID) -> AthleteProfile:
        """Get athlete profile by ID."""
        result = await self.db.execute(
            select(AthleteProfile).where(AthleteProfile.id == athlete_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            raise NotFoundError(f"Athlete profile '{athlete_id}' not found")
        return profile
    
    async def get_profile_by_user_id(self, user_id: UUID) -> Optional[AthleteProfile]:
        """Get athlete profile by user ID."""
        result = await self.db.execute(
            select(AthleteProfile).where(AthleteProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def update_profile(
        self, athlete_id: UUID, profile_update: AthleteProfileUpdate
    ) -> AthleteProfile:
        """Update athlete profile."""
        profile = await self.get_profile(athlete_id)
        update_data = profile_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile
    
    async def list_athletes(
        self,
        skip: int = 0,
        limit: int = 50,
        team_id: Optional[UUID] = None,
    ) -> tuple[List[AthleteProfile], int]:
        """List athlete profiles with optional team filter."""
        query = select(AthleteProfile)
        count_query = select(func.count()).select_from(AthleteProfile)
        
        if team_id:
            query = query.where(AthleteProfile.team_id == team_id)
            count_query = count_query.where(AthleteProfile.team_id == team_id)
        
        total = (await self.db.execute(count_query)).scalar()
        result = await self.db.execute(query.offset(skip).limit(limit))
        return result.scalars().all(), total
    
    # --- Injury History ---
    
    async def add_injury_record(
        self, athlete_id: UUID, injury_in: InjuryHistoryCreate
    ) -> InjuryHistory:
        """Add an injury record to an athlete's history."""
        await self.get_profile(athlete_id)  # Verify athlete exists
        record = InjuryHistory(
            athlete_id=athlete_id,
            **injury_in.model_dump()
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record
    
    async def get_injury_history(self, athlete_id: UUID) -> List[InjuryHistory]:
        """Get full injury history for an athlete."""
        await self.get_profile(athlete_id)  # Verify athlete exists
        result = await self.db.execute(
            select(InjuryHistory)
            .where(InjuryHistory.athlete_id == athlete_id)
            .order_by(InjuryHistory.date_occurred.desc())
        )
        return result.scalars().all()
    
    # --- Training Load ---
    
    async def log_training(
        self, athlete_id: UUID, load_in: TrainingLoadCreate
    ) -> TrainingLoad:
        """Log a training session."""
        await self.get_profile(athlete_id)  # Verify athlete exists
        load = TrainingLoad(
            athlete_id=athlete_id,
            **load_in.model_dump()
        )
        self.db.add(load)
        await self.db.commit()
        await self.db.refresh(load)
        return load
    
    async def get_training_load(
        self, athlete_id: UUID, limit: int = 50
    ) -> List[TrainingLoad]:
        """Get training load history."""
        await self.get_profile(athlete_id)  # Verify athlete exists
        result = await self.db.execute(
            select(TrainingLoad)
            .where(TrainingLoad.athlete_id == athlete_id)
            .order_by(TrainingLoad.date.desc())
            .limit(limit)
        )
        return result.scalars().all()
    
    # --- Teams ---
    
    async def create_team(self, team_in: TeamCreate) -> Team:
        """Create a new team."""
        team = Team(**team_in.model_dump())
        self.db.add(team)
        await self.db.commit()
        await self.db.refresh(team)
        return team
    
    async def get_team(self, team_id: UUID) -> Team:
        """Get team by ID."""
        result = await self.db.execute(
            select(Team).where(Team.id == team_id)
        )
        team = result.scalar_one_or_none()
        if not team:
            raise NotFoundError(f"Team '{team_id}' not found")
        return team
    
    async def list_teams(self) -> List[Team]:
        """List all teams."""
        result = await self.db.execute(select(Team))
        return result.scalars().all()
