from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.athlete import Athlete
from app.models.user import RoleEnum, User
from app.schemas.athlete import (
    AthleteCreate,
    AthleteResponse,
    AthleteUpdate,
)
from app.core.dependencies import get_current_user, require_roles


router = APIRouter(
    prefix="/athletes",
    tags=["Athletes"],
)


# Roles that can manage athlete profiles.
ATHLETE_MANAGEMENT_ROLES = (
    RoleEnum.ADMINISTRATOR,
    RoleEnum.COACH,
    RoleEnum.PHYSIOTHERAPIST,
)

# Roles that can view athlete profiles.
ATHLETE_VIEW_ROLES = (
    RoleEnum.ADMINISTRATOR,
    RoleEnum.COACH,
    RoleEnum.PHYSIOTHERAPIST,
    RoleEnum.SPORTS_SCIENTIST,
)


@router.post(
    "",
    response_model=AthleteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an athlete profile",
)
def create_athlete(
    athlete_in: AthleteCreate,
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
    db: Session = Depends(get_db),
) -> Athlete:

    # Athletes can only create their own profile.
    if current_user.role == RoleEnum.ATHLETE:
        if athlete_in.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Athletes can only create their own profile.",
            )

    # Other users need an authorized management role.
    elif current_user.role not in ATHLETE_MANAGEMENT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create athlete profiles.",
        )

    # Verify target user exists.
    target_user = (
        db.query(User)
        .filter(User.user_id == athlete_in.user_id)
        .first()
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    # Only Athlete accounts can have an athlete profile.
    if target_user.role != RoleEnum.ATHLETE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Athlete profile can only be linked to an Athlete user.",
        )

    # Check whether a profile already exists for this user.
    existing_profile = (
        db.query(Athlete)
        .filter(Athlete.user_id == athlete_in.user_id)
        .first()
    )

    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An athlete profile already exists for this user.",
        )

    athlete = Athlete(
        **athlete_in.model_dump(),
    )

    db.add(athlete)

    try:
        db.commit()
        db.refresh(athlete)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the athlete profile.",
        )

    return athlete


@router.get(
    "",
    response_model=list[AthleteResponse],
    summary="List athlete profiles",
)
def list_athletes(
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
    db: Session = Depends(get_db),
) -> list[Athlete]:

    # Athlete can only see their own profile.
    if current_user.role == RoleEnum.ATHLETE:
        profile = (
            db.query(Athlete)
            .filter(Athlete.user_id == current_user.user_id)
            .first()
        )

        return [profile] if profile else []

    # Other authorized roles can view all athletes.
    if current_user.role not in ATHLETE_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view athlete profiles.",
        )

    return (
        db.query(Athlete)
        .order_by(Athlete.athlete_id)
        .all()
    )


@router.get(
    "/{athlete_id}",
    response_model=AthleteResponse,
    summary="Get an athlete profile",
)
def get_athlete(
    athlete_id: UUID,
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
    db: Session = Depends(get_db),
) -> Athlete:

    athlete = (
        db.query(Athlete)
        .filter(Athlete.athlete_id == athlete_id)
        .first()
    )

    if athlete is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete profile not found.",
        )

    # Athlete can only access their own profile.
    if current_user.role == RoleEnum.ATHLETE:
        if athlete.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own athlete profile.",
            )

    elif current_user.role not in ATHLETE_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view athlete profiles.",
        )

    return athlete


@router.patch(
    "/{athlete_id}",
    response_model=AthleteResponse,
    summary="Update an athlete profile",
)
def update_athlete(
    athlete_id: UUID,
    athlete_in: AthleteUpdate,
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
    db: Session = Depends(get_db),
) -> Athlete:

    athlete = (
        db.query(Athlete)
        .filter(Athlete.athlete_id == athlete_id)
        .first()
    )

    if athlete is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete profile not found.",
        )

    # Athlete can update only their own profile.
    if current_user.role == RoleEnum.ATHLETE:
        if athlete.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own athlete profile.",
            )

    elif current_user.role not in ATHLETE_MANAGEMENT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update athlete profiles.",
        )

    update_data = athlete_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(athlete, field, value)

    try:
        db.commit()
        db.refresh(athlete)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the athlete profile.",
        )

    return athlete


@router.delete(
    "/{athlete_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an athlete profile",
)
def delete_athlete(
    athlete_id: UUID,
    current_user: Annotated[
        User,
        Depends(require_roles(RoleEnum.ADMINISTRATOR)),
    ],
    db: Session = Depends(get_db),
) -> None:

    athlete = (
        db.query(Athlete)
        .filter(Athlete.athlete_id == athlete_id)
        .first()
    )

    if athlete is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete profile not found.",
        )

    db.delete(athlete)
    db.commit()