"""Live End-to-End Verification Script for SafeMove Phase 4 (Biomechanical Anomaly Detection)."""

import asyncio
import os
import sys
import tempfile
import uuid

import cv2
import numpy as np
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.rbac import UserRole
from app.core.security import create_access_token, hash_password
from app.db.postgresql import get_session_factory, init_db
from app.main import app
from app.models.athlete import AthleteProfile
from app.models.user import User


def create_dynamic_motion_video(num_frames=25) -> bytes:
    """Create a temporary MP4 video with asymmetrical landing motion to generate realistic kinematic deviations."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(tmp_path, fourcc, 10.0, (640, 480))
        for i in range(num_frames):
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            # Simulate jump landing with trunk lean and asymmetrical knee flexion
            squat_offset = int(40 * np.sin(i * np.pi / 12)) if i < 15 else 0
            trunk_tilt_offset = int(15 * np.sin(i * np.pi / 8))

            # Head
            cv2.circle(
                frame,
                (320 + trunk_tilt_offset, 100 + squat_offset),
                25,
                (255, 255, 255),
                -1,
            )
            # Torso
            cv2.line(
                frame,
                (320 + trunk_tilt_offset, 125 + squat_offset),
                (320, 260 + squat_offset),
                (255, 255, 255),
                6,
            )
            # Arms
            cv2.line(
                frame,
                (320 + trunk_tilt_offset, 160 + squat_offset),
                (240, 220 + squat_offset),
                (255, 255, 255),
                4,
            )
            cv2.line(
                frame,
                (320 + trunk_tilt_offset, 160 + squat_offset),
                (400, 210 + squat_offset),
                (255, 255, 255),
                4,
            )
            # Left Leg (pronounced flexion)
            cv2.line(
                frame,
                (320, 260 + squat_offset),
                (250, 360 + int(squat_offset * 1.4)),
                (255, 255, 255),
                4,
            )
            cv2.line(
                frame,
                (250, 360 + int(squat_offset * 1.4)),
                (250, 450),
                (255, 255, 255),
                4,
            )
            # Right Leg (stiff landing -> creates bilateral asymmetry)
            cv2.line(
                frame,
                (320, 260 + squat_offset),
                (380, 340 + int(squat_offset * 0.8)),
                (255, 255, 255),
                4,
            )
            cv2.line(
                frame,
                (380, 340 + int(squat_offset * 0.8)),
                (380, 450),
                (255, 255, 255),
                4,
            )

            out.write(frame)
        out.release()

        with open(tmp_path, "rb") as f:
            data = f.read()
        return data
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


async def run_phase4_e2e_verification():
    print("=" * 75)
    print("SAFEMOVE PHASE 4 — LIVE E2E BIOMECHANICAL ANOMALY DETECTION")
    print("=" * 75)

    # 1. Initialize DB and create Athlete User
    await init_db()
    session_factory = get_session_factory()
    async with session_factory() as session:
        user_id = uuid.uuid4()
        athlete_user = User(
            id=user_id,
            email=f"e2e_anomaly_{uuid.uuid4().hex[:6]}@safemove.test",
            password_hash=hash_password("SafeMove2026!"),
            full_name="Jordan Motion",
            role=UserRole.ATHLETE,
        )
        session.add(athlete_user)
        await session.commit()

        profile = AthleteProfile(
            id=uuid.uuid4(),
            user_id=athlete_user.id,
            sport="Volleyball",
            position="Outside Hitter",
        )
        session.add(profile)
        await session.commit()
        await session.refresh(profile)

    token = create_access_token({"sub": str(athlete_user.id), "role": athlete_user.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 2. Upload Video
        print("\n1. [Video Ingestion] Uploading simulated sports movement drill...")
        video_bytes = create_dynamic_motion_video(num_frames=25)
        upload_res = await client.post(
            "/api/v1/videos/upload",
            files={"file": ("jump_landing_drill.mp4", video_bytes, "video/mp4")},
            data={"sport_type": "Jump Landing Assessment"},
            headers=headers,
        )
        assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
        video_data = upload_res.json()
        video_id = video_data["id"]
        print(f"   -> Video uploaded! Session ID: {video_id}")

        # 3. Process Video (Pose + Kinematics + Anomaly Detection)
        print("\n2. [Pipeline Execution] Running Full Processing Pipeline...")
        process_res = await client.post(
            f"/api/v1/videos/{video_id}/process?smoothing_method=SAVITZKY_GOLAY",
            headers=headers,
        )
        assert process_res.status_code == 200, f"Process failed: {process_res.text}"
        p_data = process_res.json()
        print(f"   -> Pipeline finished! Status: {p_data['status']}")
        print(f"   -> Details: {p_data['message']}")

        # 4. Fetch Biomechanical Anomaly Assessment
        print("\n3. [Anomaly Detection] Fetching Anomaly Assessment & Baseline Deviations...")
        anom_res = await client.get(f"/api/v1/analysis/{video_id}/anomalies", headers=headers)
        assert anom_res.status_code == 200, f"Anomaly retrieval failed: {anom_res.text}"
        anom_data = anom_res.json()

        print(f"   -> Overall Movement Status: {anom_data['overall_status']}")
        print(f"   -> Baseline Classification: {anom_data['baseline_metadata']['baseline_type']}")
        print(f"   -> Scientific Disclaimer: {anom_data['baseline_metadata']['disclaimer']}")
        print(f"   -> Total Metrics Evaluated: {anom_data['baseline_metadata']['total_metrics_evaluated']}")
        print(f"   -> Total Anomalies Detected: {len(anom_data['anomalies'])}")

        # 5. Display Sample Metric Deviations
        print("\n4. [Metric Deviations against Developmental Baselines]:")
        for key, dev in list(anom_data["metric_deviations"].items())[:4]:
            print(f"   * {dev['label']} ({dev['metric']}):")
            obs_str = f"{dev['observed']}{dev['unit']}"
            base_str = f"{dev['baseline_mean']}{dev['unit']} ± {dev['baseline_std']}{dev['unit']}"
            print(f"       - Observed: {obs_str} | Baseline Mean: {base_str}")
            stat_str = (
                f"Z-Score: {dev['z_score']} | "
                f"Percent Dev: {dev['percent_deviation']}% | "
                f"Range Dev: {dev['range_deviation']}"
            )
            print(f"       - {stat_str}")
            print(f"       - Severity: {dev['severity']} | Rule: {dev['severity_derivation_rule']}")
            print(f"       - Baseline Type: {dev['baseline_type']}")

        # 6. Display Sample Anomaly Events with Timestamps
        print("\n5. [Detected Anomaly Events & Clickable Timestamps]:")
        if anom_data["anomalies"]:
            for anom in anom_data["anomalies"][:3]:
                ts_str = f"at {anom['timestamp_seconds']:.2f}s" if anom["timestamp_seconds"] is not None else "N/A"
                print(f"   [!] {anom['metric_name']} ({anom['severity']}) — {ts_str}")
                print(f"       Description: {anom['description']}")
        else:
            print("   -> No major deviations outside standard developmental ranges.")

        print("\n" + "=" * 75)
        print("PHASE 4 BIOMECHANICAL ANOMALY PIPELINE VERIFIED SUCCESSFULLY!")
        print("=" * 75)


if __name__ == "__main__":
    asyncio.run(run_phase4_e2e_verification())
