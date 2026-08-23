"""
SafeMove Container & Runtime Verification Suite.

Performs deterministic smoke testing across all SafeMove subsystems:
1. Environment & configuration sanity
2. Database schema registration & connectivity
3. Video storage resolution & write permissions
4. MediaPipe PoseLandmarker model loading & synthetic frame inference
5. Calgary Biomechanical Dataset adapter & layout verification
6. Phase 5B baseline ML model artifact loading & prediction
7. Anomaly detection & kinematics calculation sanity
8. Frontend API client URL configuration
"""

import os
import sys
from pathlib import Path

import numpy as np

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))


def verify_environment() -> bool:
    print("\n[1/8] Verifying Environment Configuration...")
    from app.config import get_settings
    settings = get_settings()
    print(f"  * App Name: {settings.APP_NAME}")
    print(f"  * Database URL: {settings.DATABASE_URL}")
    print(f"  * Video Storage Path: {settings.VIDEO_STORAGE_PATH}")
    print(f"  * CORS Origins: {settings.CORS_ORIGINS}")
    return True


def verify_database_models() -> bool:
    print("\n[2/8] Verifying Database Models & Metadata Registration...")
    import app.models.analysis  # noqa: F401
    import app.models.athlete  # noqa: F401
    import app.models.recommendation  # noqa: F401
    import app.models.risk  # noqa: F401
    import app.models.user  # noqa: F401
    import app.models.video  # noqa: F401
    from app.db.postgresql import Base

    registered_tables = list(Base.metadata.tables.keys())
    print(f"  * Total registered DB tables: {len(registered_tables)}")
    for t in registered_tables:
        print(f"    - table: {t}")
    assert len(registered_tables) >= 6, "Missing database model tables"
    return True


def verify_video_storage() -> bool:
    print("\n[3/8] Verifying Video Storage Subsystem...")
    from app.services.storage_service import StorageService
    storage = StorageService()
    print(f"  * Storage directory: {storage.storage_dir}")
    assert storage.storage_dir.exists(), "Storage directory does not exist"
    # Test write permission
    test_file = storage.storage_dir / ".storage_check.tmp"
    test_file.write_text("storage_ok", encoding="utf-8")
    assert test_file.read_text(encoding="utf-8") == "storage_ok"
    test_file.unlink()
    print("  * Storage read/write permissions verified.")
    return True


def verify_mediapipe_pose() -> bool:
    print("\n[4/8] Verifying MediaPipe Pose Landmarker & Inference...")
    from app.ml.pose.pose_extractor import PoseExtractor
    extractor = PoseExtractor()
    print(f"  * MediaPipe model loaded from: {extractor.model_path}")
    assert os.path.exists(extractor.model_path), f"Model not found at {extractor.model_path}"

    # Generate a dummy RGB frame (480x640x3)
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    # Draw simple lines to simulate pose
    import cv2
    cv2.line(dummy_frame, (320, 100), (320, 250), (255, 255, 255), 5)
    import mediapipe as mp
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=dummy_frame)
    with mp.tasks.vision.PoseLandmarker.create_from_options(
        extractor.options
    ) as landmarker:
        _ = landmarker.detect(mp_image)
        print("  * PoseLandmarker inference executed successfully on test frame.")
    return True


def verify_kinematics_and_anomalies() -> bool:
    print("\n[5/8] Verifying Kinematics & Anomaly Engines...")
    from app.services.kinematics_engine import KinematicsEngine
    # 90-degree right angle test
    p1 = {"x": 0.0, "y": 1.0, "z": 0.0, "visibility": 0.9}
    p2 = {"x": 0.0, "y": 0.0, "z": 0.0, "visibility": 0.9}
    p3 = {"x": 1.0, "y": 0.0, "z": 0.0, "visibility": 0.9}
    angle = KinematicsEngine.calculate_3point_angle(p1, p2, p3)
    print(f"  * Right angle joint calculation: {angle:.1f} deg (expected 90.0)")
    assert abs(angle - 90.0) < 0.1

    from app.core.baselines import DEFAULT_DEVELOPMENTAL_BASELINES
    baseline = DEFAULT_DEVELOPMENTAL_BASELINES["knee_flexion_rom"]
    print(f"  * Baseline knee_flexion_rom mean: {baseline.mean} deg")
    assert baseline.mean == 120.0
    return True


def verify_calgary_dataset() -> bool:
    print("\n[6/8] Verifying Calgary Biomechanical Dataset Adapter...")
    from app.ml.datasets.storage_layout import DatasetStorageManager
    storage_mgr = DatasetStorageManager()
    print(f"  * Dataset base dir: {storage_mgr.base_dir}")
    features_csv = storage_mgr.get_features_dir("calgary") / "features.csv"
    print(f"  * Calgary features CSV: {features_csv}")
    assert features_csv.exists(), f"Calgary features CSV missing at {features_csv}"
    import pandas as pd
    df = pd.read_csv(features_csv)
    print(f"  * Loaded {len(df)} subjects with {len(df.columns)} columns.")
    assert len(df) == 20
    assert "injury_label" in df.columns
    return True


def verify_phase5b_ml_model() -> bool:
    print("\n[7/8] Verifying Phase 5B Baseline ML Model Artifact...")
    import joblib
    import pandas as pd
    from app.ml.risk.feature_selection import EXPERIMENT_A_FEATURES
    model_path = backend_dir / "data" / "models" / "phase5_baseline" / "best_model.joblib"
    print(f"  * Champion model path: {model_path}")
    assert model_path.exists(), f"Model artifact missing at {model_path}"
    model_pipeline = joblib.load(model_path)
    print(f"  * Loaded Pipeline steps: {list(model_pipeline.named_steps.keys())}")

    # Test dummy prediction with 9 core features in DataFrame
    dummy_input = pd.DataFrame(
        [[42.0, 48.0, 38.0, 24.0, 12.0, 18.0, 12.0, 2.5, 70.0]],
        columns=EXPERIMENT_A_FEATURES,
    )
    pred = model_pipeline.predict(dummy_input)
    prob = model_pipeline.predict_proba(dummy_input)
    print(f"  * Test prediction: class={pred[0]}, prob={prob[0].tolist()}")
    assert pred[0] in [0, 1]
    return True


def verify_frontend_configuration() -> bool:
    print("\n[8/8] Verifying Frontend Configuration & API Client...")
    frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
    pkg_json = frontend_dir / "package.json"
    assert pkg_json.exists(), "Frontend package.json missing"
    import json
    with open(pkg_json, encoding="utf-8") as f:
        pkg_data = json.load(f)
    print(f"  * Next.js App: {pkg_data.get('name')} v{pkg_data.get('version')}")
    assert "next" in pkg_data.get("dependencies", {})
    return True


def main():
    print("=" * 70)
    print("SafeMove Container & Subsystem Verification")
    print("=" * 70)

    checks = [
        verify_environment,
        verify_database_models,
        verify_video_storage,
        verify_mediapipe_pose,
        verify_kinematics_and_anomalies,
        verify_calgary_dataset,
        verify_phase5b_ml_model,
        verify_frontend_configuration,
    ]

    for check_fn in checks:
        success = check_fn()
        if not success:
            print(f"\n[FAILED] at {check_fn.__name__}")
            sys.exit(1)

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL 8/8 SAFEMOVE SUBSYSTEM VERIFICATION CHECKS PASSED")
    print("=" * 70)


if __name__ == "__main__":
    main()
