"""Admin endpoints."""

from fastapi import APIRouter, Depends

from app.api.deps import require_roles
from app.core.rbac import UserRole

router = APIRouter(dependencies=[Depends(require_roles(UserRole.ADMIN))])


@router.get("/platform-stats")
async def get_platform_stats():
    """Get high-level platform usage stats."""
    raise NotImplementedError("Phase 7 implementation")


@router.get("/system-health")
async def get_system_health():
    """Get detailed health of ML models, DBs, workers."""
    raise NotImplementedError("Phase 7 implementation")


@router.get("/audit-log")
async def get_audit_log():
    """Fetch recent audit events."""
    raise NotImplementedError("Phase 7 implementation")
