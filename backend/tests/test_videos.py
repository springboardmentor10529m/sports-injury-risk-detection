"""Tests for video ingestion, storage, and authorization endpoints."""

import uuid
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole
from app.core.security import hash_password
from app.models.athlete import AthleteProfile
from app.models.user import User
from app.models.video import VideoSession, VideoStatus
from tests.conftest import auth_header

# A minimal valid MP4 binary header with 'ftyp' box
VALID_MP4_BYTES = (
    b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom"
    b"\x00\x00\x00\x08free\x00\x00\x00\x10mdat\x00\x01\x02\x03\x04\x05\x06\x07"
)

# A minimal valid WebM binary header
VALID_WEBM_BYTES = b"\x1a\x45\xdf\xa3\x9f\x42\x86\x81\x01\x42\xf7\x81\x01\x42\xf2\x81\x04"


@pytest.fixture
async def athlete_profile_1(db_session: AsyncSession, test_user: User) -> AthleteProfile:
    """Create athlete profile for test_user."""
    profile = AthleteProfile(id=uuid4(), user_id=test_user.id, sport="Track & Field", position="Sprinter")
    db_session.add(profile)
    await db_session.commit()
    await db_session.refresh(profile)
    return profile


@pytest.fixture
async def athlete_profile_2(db_session: AsyncSession) -> AthleteProfile:
    """Create a second athlete profile with a different user."""
    second_user = User(
        id=uuid4(),
        email="athlete2@test.com",
        password_hash=hash_password("testpass123"),
        full_name="Athlete Two",
        role=UserRole.ATHLETE,
    )
    db_session.add(second_user)
    await db_session.commit()
    await db_session.refresh(second_user)

    profile = AthleteProfile(id=uuid4(), user_id=second_user.id, sport="Basketball", position="Guard")
    db_session.add(profile)
    await db_session.commit()
    await db_session.refresh(profile)
    return profile


@pytest.mark.asyncio
async def test_successful_video_upload(client: AsyncClient, test_user: User, athlete_profile_1: AthleteProfile):
    """Test 1: Successful video upload by athlete."""
    files = {"file": ("jump_test.mp4", VALID_MP4_BYTES, "video/mp4")}
    data = {"sport_type": "Drop Jump Test"}

    response = await client.post("/api/v1/videos/upload", files=files, data=data, headers=auth_header(test_user))

    assert response.status_code == 201
    res_data = response.json()
    assert "id" in res_data
    assert res_data["athlete_id"] == str(athlete_profile_1.id)
    assert res_data["status"] == "UPLOADED"
    assert res_data["original_filename"] == "jump_test.mp4"
    assert res_data["filename"].endswith(".mp4")


@pytest.mark.asyncio
async def test_upload_authentication_required(client: AsyncClient):
    """Test 2: Video upload without authentication returns 401."""
    files = {"file": ("jump_test.mp4", VALID_MP4_BYTES, "video/mp4")}
    response = await client.post("/api/v1/videos/upload", files=files)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_athlete_can_only_upload_for_self(
    client: AsyncClient,
    test_user: User,
    athlete_profile_1: AthleteProfile,
    athlete_profile_2: AthleteProfile,
):
    """Test 3: Athlete attempting to upload for another athlete returns 403."""
    files = {"file": ("drill.mp4", VALID_MP4_BYTES, "video/mp4")}
    data = {"athlete_id": str(athlete_profile_2.id)}

    response = await client.post("/api/v1/videos/upload", files=files, data=data, headers=auth_header(test_user))
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_coach_can_upload_for_athlete(client: AsyncClient, coach_user: User, athlete_profile_1: AthleteProfile):
    """Test 4: Coach can upload video by specifying athlete_id."""
    files = {"file": ("sprint.mp4", VALID_MP4_BYTES, "video/mp4")}
    data = {"athlete_id": str(athlete_profile_1.id), "sport_type": "Max Sprint"}

    response = await client.post("/api/v1/videos/upload", files=files, data=data, headers=auth_header(coach_user))
    assert response.status_code == 201
    assert response.json()["athlete_id"] == str(athlete_profile_1.id)


@pytest.mark.asyncio
async def test_coach_upload_missing_athlete_id(client: AsyncClient, coach_user: User):
    """Test 5: Coach upload without athlete_id returns 422."""
    files = {"file": ("sprint.mp4", VALID_MP4_BYTES, "video/mp4")}
    response = await client.post("/api/v1/videos/upload", files=files, headers=auth_header(coach_user))
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_upload_invalid_extension(client: AsyncClient, test_user: User, athlete_profile_1: AthleteProfile):
    """Test 6: Uploading disallowed extension (.txt) returns 415."""
    files = {"file": ("malicious.txt", b"not a video", "text/plain")}
    response = await client.post("/api/v1/videos/upload", files=files, headers=auth_header(test_user))
    assert response.status_code == 415


@pytest.mark.asyncio
async def test_upload_invalid_mime(client: AsyncClient, test_user: User, athlete_profile_1: AthleteProfile):
    """Test 7: Uploading disallowed MIME returns 415."""
    files = {"file": ("fake.mp4", VALID_MP4_BYTES, "application/pdf")}
    response = await client.post("/api/v1/videos/upload", files=files, headers=auth_header(test_user))
    assert response.status_code == 415


@pytest.mark.asyncio
async def test_upload_empty_file(client: AsyncClient, test_user: User, athlete_profile_1: AthleteProfile):
    """Test 8: Uploading 0-byte file returns 400."""
    files = {"file": ("empty.mp4", b"", "video/mp4")}
    response = await client.post("/api/v1/videos/upload", files=files, headers=auth_header(test_user))
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_corrupted_file(client: AsyncClient, test_user: User, athlete_profile_1: AthleteProfile):
    """Test 9: Uploading corrupted/fake video header returns 400."""
    files = {
        "file": (
            "corrupt.mp4",
            b"<html><body>Hello Fake Video</body></html>",
            "video/mp4",
        )
    }
    response = await client.post("/api/v1/videos/upload", files=files, headers=auth_header(test_user))
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_oversized_file(
    client: AsyncClient, test_user: User, athlete_profile_1: AthleteProfile, monkeypatch
):
    """Test 10: Uploading file exceeding max size returns 413."""
    from app.config import get_settings

    # Temporarily set max upload size to 0.00001 MB (10 bytes)
    settings = get_settings()
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 0.00001)

    files = {"file": ("large.mp4", VALID_MP4_BYTES * 100, "video/mp4")}
    response = await client.post("/api/v1/videos/upload", files=files, headers=auth_header(test_user))
    assert response.status_code == 413


@pytest.mark.asyncio
async def test_database_record_creation(
    client: AsyncClient,
    test_user: User,
    athlete_profile_1: AthleteProfile,
    db_session: AsyncSession,
):
    """Test 11: Database record is properly created and persisted."""
    files = {"file": ("cut_drill.mp4", VALID_MP4_BYTES, "video/mp4")}
    response = await client.post("/api/v1/videos/upload", files=files, headers=auth_header(test_user))
    assert response.status_code == 201
    video_id = uuid.UUID(response.json()["id"])

    # Query database directly
    stmt = select(VideoSession).where(VideoSession.id == video_id)
    result = await db_session.execute(stmt)
    video = result.scalar_one_or_none()

    assert video is not None
    assert video.athlete_id == athlete_profile_1.id
    assert video.original_filename == "cut_drill.mp4"
    assert video.status == VideoStatus.UPLOADED
    assert video.content_type == "video/mp4"
    assert video.file_size == len(VALID_MP4_BYTES)


@pytest.mark.asyncio
async def test_video_list_and_detail_authorization(
    client: AsyncClient,
    test_user: User,
    coach_user: User,
    athlete_profile_1: AthleteProfile,
    athlete_profile_2: AthleteProfile,
):
    """Test 12: Video list & detail role boundary enforcement."""
    # 1. Athlete 1 uploads a video
    res1 = await client.post(
        "/api/v1/videos/upload",
        files={"file": ("video1.mp4", VALID_MP4_BYTES, "video/mp4")},
        headers=auth_header(test_user),
    )
    v1_id = res1.json()["id"]

    # 2. Coach uploads a video for Athlete 2
    res2 = await client.post(
        "/api/v1/videos/upload",
        files={"file": ("video2.mp4", VALID_MP4_BYTES, "video/mp4")},
        data={"athlete_id": str(athlete_profile_2.id)},
        headers=auth_header(coach_user),
    )
    v2_id = res2.json()["id"]

    # Athlete 1 lists videos -> should see only v1
    ath1_list = await client.get("/api/v1/videos/", headers=auth_header(test_user))
    assert ath1_list.status_code == 200
    ids = [v["id"] for v in ath1_list.json()]
    assert v1_id in ids
    assert v2_id not in ids

    # Athlete 1 gets detail for v1 -> 200
    detail_v1 = await client.get(f"/api/v1/videos/{v1_id}", headers=auth_header(test_user))
    assert detail_v1.status_code == 200
    assert detail_v1.json()["id"] == v1_id

    # Athlete 1 tries to get detail for v2 -> 403 Forbidden
    detail_v2 = await client.get(f"/api/v1/videos/{v2_id}", headers=auth_header(test_user))
    assert detail_v2.status_code == 403

    # Coach lists all videos -> sees both
    coach_list = await client.get("/api/v1/videos/", headers=auth_header(coach_user))
    assert coach_list.status_code == 200
    coach_ids = [v["id"] for v in coach_list.json()]
    assert v1_id in coach_ids
    assert v2_id in coach_ids


@pytest.mark.asyncio
async def test_missing_video_returns_404(client: AsyncClient, test_user: User):
    """Test 13: Querying a non-existent video returns 404."""
    non_existent = str(uuid4())
    response = await client.get(f"/api/v1/videos/{non_existent}", headers=auth_header(test_user))
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_path_traversal_sanitization(client: AsyncClient, test_user: User, athlete_profile_1: AthleteProfile):
    """Test 14: Filename with path traversal sequences is safely sanitized."""
    files = {"file": ("../../../../etc/evil.mp4", VALID_MP4_BYTES, "video/mp4")}
    response = await client.post("/api/v1/videos/upload", files=files, headers=auth_header(test_user))
    assert response.status_code == 201
    data = response.json()
    assert data["original_filename"] == "evil.mp4"
    assert ".." not in data["filename"]
