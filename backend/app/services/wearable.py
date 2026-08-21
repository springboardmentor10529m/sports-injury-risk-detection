"""Wearable integration service stub."""

from abc import ABC, abstractmethod


class WearableDataProvider(ABC):
    """
    Stub interface for future wearable integration (WHOOP, Garmin, Strava).
    No concrete implementation per Section 8 Q2 — do not build without an ingestion contract.
    """

    @abstractmethod
    async def connect(self, athlete_id: str, provider: str, auth_token: str) -> bool:
        """Connect athlete to a wearable provider."""
        pass

    @abstractmethod
    async def fetch_data(self, athlete_id: str, start_date: str, end_date: str) -> dict:
        """Fetch raw metrics from the wearable provider."""
        pass

    @abstractmethod
    async def sync(self, athlete_id: str) -> dict:
        """Sync wearable data and convert to training load records."""
        pass
