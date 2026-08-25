from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import AthleteLink, AthleteProfile, LinkType, User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_exception
    user = db.get(User, user_id)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated by an administrator.")
    return user


def require_athlete(user: User = Depends(get_current_user)) -> User:
    if user.athlete_profile is None:
        raise HTTPException(status_code=403, detail="This endpoint requires an athlete profile.")
    return user


def require_coach(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.COACH:
        raise HTTPException(status_code=403, detail="This endpoint requires a coach account.")
    return user


def require_physio(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.PHYSIOTHERAPIST:
        raise HTTPException(status_code=403, detail="This endpoint requires a physiotherapist account.")
    return user


def require_scientist(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.SPORTS_SCIENTIST:
        raise HTTPException(status_code=403, detail="This endpoint requires a sports scientist account.")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="This endpoint requires an administrator account.")
    return user


def require_linked_athlete(link_type: LinkType):
    """Returns a dependency that resolves `athlete_id` from the path only if
    the current professional user has an AthleteLink of the right type to
    that athlete - the actual access-control check, not just a role check."""

    def _dep(athlete_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> AthleteProfile:
        link = (
            db.query(AthleteLink)
            .filter(
                AthleteLink.professional_user_id == user.id,
                AthleteLink.athlete_id == athlete_id,
                AthleteLink.link_type == link_type,
            )
            .first()
        )
        if link is None:
            raise HTTPException(status_code=403, detail="You don't have access to this athlete's data.")
        athlete = db.get(AthleteProfile, athlete_id)
        if athlete is None:
            raise HTTPException(status_code=404, detail="Athlete not found.")
        return athlete

    return _dep
