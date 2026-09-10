"""Small-installation authentication throttle (one API process)."""
import time
from collections import deque

from starlette.responses import JSONResponse
from app.core.config import settings


class RequestLimits:
    def __init__(self, app):
        self.app = app
        self.attempts = deque()

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and settings.ENVIRONMENT == "production":
            path = scope.get("path", "")
            if scope["method"] == "POST" and path.startswith(("/api/auth/login", "/api/auth/register")):
                now = time.monotonic()
                while self.attempts and self.attempts[0] <= now - 60:
                    self.attempts.popleft()
                # Aggregate quota cannot be evaded by spoofing forwarding headers.
                if len(self.attempts) >= 30:
                    await JSONResponse({"detail": "Too many authentication attempts. Try again in a minute."},
                                       status_code=429, headers={"Retry-After": "60"})(scope, receive, send)
                    return
                self.attempts.append(now)
        await self.app(scope, receive, send)
