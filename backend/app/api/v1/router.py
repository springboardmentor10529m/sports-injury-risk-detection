from fastapi import APIRouter
from app.api.v1.endpoints import auth, athletes, videos

api_router = APIRouter()

# Register endpoint routers
api_router.include_router(auth.router)
api_router.include_router(athletes.router)
api_router.include_router(videos.router)
