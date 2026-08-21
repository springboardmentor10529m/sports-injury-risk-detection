"""Notification service stub."""

from abc import ABC, abstractmethod


class NotificationServiceBase(ABC):
    @abstractmethod
    async def send_notification(self, user_id: str, notif_data: dict) -> dict:
        """Send a notification to a user."""
        pass

    @abstractmethod
    async def get_notifications(self, user_id: str) -> list:
        """Get notifications for a user."""
        pass

    @abstractmethod
    async def mark_read(self, notification_id: str) -> dict:
        """Mark notification as read."""
        pass


class NotificationService(NotificationServiceBase):
    async def send_notification(self, user_id: str, notif_data: dict) -> dict:
        raise NotImplementedError("Phase 7 implementation")

    async def get_notifications(self, user_id: str) -> list:
        raise NotImplementedError("Phase 7 implementation")

    async def mark_read(self, notification_id: str) -> dict:
        raise NotImplementedError("Phase 7 implementation")
