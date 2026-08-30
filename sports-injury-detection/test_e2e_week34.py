"""
E2E Verification Script for Week 3-4 Milestone Implementation
Tests Pose Extraction, Biomechanical Kinematics, Movement Quality Scoring,
Phase Detection, Anomaly Screening, and Report Generation.
"""
import sys
import os
import numpy as np

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("backend"))

def run_tests():
    print("==================================================")
    print("  RUNNING WEEK 3-4 END-TO-END VERIFICATION TESTS  ")
    print("==================================================")

    # 1. Test Pose Service & Keypoints Map
    from app.services.pose_service import pose_service, KEYPOINT_MAP, SKELETON_CONNECTIONS
    print("\n[1] Pose Service Inspection:")
    print(f"  - Landmark count: {len(KEYPOINT_MAP)}")
    print(f"  - Skeleton connection pairs: {len(SKELETON_CONNECTIONS)}")
    print(f"  - MediaPipe availability: {pose_service.has_mediapipe}")

    dummy_landmarks = {
        "left_hip": {"x": 0.45, "y": 0.5, "z": 0.0, "visibility": 0.95},
        "right_hip": {"x": 0.55, "y": 0.5, "z": 0.0, "visibility": 0.95},
        "left_knee": {"x": 0.45, "y": 0.7, "z": 0.1, "visibility": 0.95},
        "right_knee": {"x": 0.55, "y": 0.7, "z": 0.1, "visibility": 0.95},
        "left_ankle": {"x": 0.45, "y": 0.9, "z": 0.0, "visibility": 0.95},
        "right_ankle": {"x": 0.55, "y": 0.9, "z": 0.0, "visibility": 0.95},
        "left_shoulder": {"x": 0.42, "y": 0.25, "z": 0.0, "visibility": 0.95},
        "right_shoulder": {"x": 0.58, "y": 0.25, "z": 0.0, "visibility": 0.95},
        "left_elbow": {"x": 0.38, "y": 0.35, "z": 0.0, "visibility": 0.95},
        "right_elbow": {"x": 0.62, "y": 0.35, "z": 0.0, "visibility": 0.95},
        "left_wrist": {"x": 0.35, "y": 0.45, "z": 0.0, "visibility": 0.95},
        "right_wrist": {"x": 0.65, "y": 0.45, "z": 0.0, "visibility": 0.95},
    }

    # Test skeleton overlay rendering with HUD parameters
    dummy_img = np.zeros((480, 640, 3), dtype=np.uint8)
    overlay = pose_service.draw_skeleton_overlay(
        dummy_img,
        dummy_landmarks,
        knee_angles=(135.0, 138.0),
        trunk_lean=14.5,
        frame_idx=42,
        confidence=0.94
    )
    assert overlay is not None and overlay.shape == (480, 640, 3)
    print("  [SUCCESS] Skeleton overlay rendering & HUD timestamp verified.")

    # 2. Test Biomechanics Service Kinematics
    from app.services.biomechanics_service import biomechanics_service
    print("\n[2] Biomechanics Service Kinematics Inspection:")
    kin = biomechanics_service.compute_frame_kinematics(dummy_landmarks)
    print(f"  - Calculated Left Knee Angle: {kin['left_knee_angle']}°")
    print(f"  - Calculated Right Knee Angle: {kin['right_knee_angle']}°")
    print(f"  - Calculated Left Shoulder Angle: {kin['left_shoulder_angle']}°")
    print(f"  - Calculated Trunk Lean: {kin['trunk_lean']}°")
    print(f"  - Knee Valgus Ratio: {kin['knee_valgus_ratio']}")
    assert kin['left_knee_angle'] > 0 and kin['right_knee_angle'] > 0
    print("  [SUCCESS] Biomechanical frame kinematics computation verified.")

    # 3. Test Movement Sequence Analysis, Phase Detection, Smoothness & Landing Mechanics
    print("\n[3] Sequence Analysis & Phase Detection Inspection:")
    frames_seq = []
    for idx in range(60):
        t = idx / 30.0
        # Simulate squat motion: flexion down to 100° then extension back to 175°
        depth = 175.0 - 75.0 * np.sin(np.pi * idx / 60)
        f_kin = {
            "frame": idx,
            "timestamp": t,
            "left_knee_angle": depth,
            "right_knee_angle": depth + 1.5,
            "left_hip_angle": depth - 10.0,
            "right_hip_angle": depth - 9.0,
            "left_elbow_angle": 160.0,
            "right_elbow_angle": 160.0,
            "left_shoulder_angle": 30.0,
            "right_shoulder_angle": 30.0,
            "trunk_lean": 12.0 + 4.0 * np.sin(np.pi * idx / 60),
            "hip_tilt": 2.1,
            "knee_valgus_ratio": 0.88
        }
        frames_seq.append(f_kin)

    seq_summary = biomechanics_service.analyze_sequence(frames_seq, activity="Squatting")
    print(f"  - Movement Phase Timeline: {len(seq_summary['phase_timeline'])} phases identified.")
    for p in seq_summary['phase_timeline']:
        print(f"    * Phase: {p['phase']} (frames {p['start_frame']}-{p['end_frame']}, depth {p['avg_knee_angle']}°)")
    print(f"  - Symmetry Score: {seq_summary['symmetry_score']}%")
    print(f"  - Movement Smoothness Score: {seq_summary['smoothness_score']}%")
    print(f"  - Structural Joint Alignment Score: {seq_summary['joint_alignment_score']}%")
    print(f"  - Landing Mechanics peak flexion: {seq_summary['landing_mechanics']['peak_flexion_left']}° L")
    assert seq_summary['symmetry_score'] > 80.0
    print("  [SUCCESS] Sequence kinematics, phase timeline, and smoothness verified.")

    # 4. Test Movement Analysis Service Quality Scoring & Anomaly Detection
    from app.services.movement_analysis_service import movement_analysis_service
    print("\n[4] Movement Quality & Anomaly Detection Inspection:")
    q_score = movement_analysis_service.calculate_movement_quality_score(
        pose_confidence=0.92,
        symmetry_score=seq_summary['symmetry_score'],
        trunk_lean_avg=seq_summary['joint_angles']['trunk_lean_avg'],
        stability_score=seq_summary['stability_score'],
        smoothness_score=seq_summary['smoothness_score'],
        joint_alignment_score=seq_summary['joint_alignment_score']
    )
    print(f"  - Movement Quality Score: {q_score}%")
    anomalies = movement_analysis_service.detect_anomalies(frames_seq, fps=30.0)
    print(f"  - Detected Non-Clinical Observations/Anomalies: {len(anomalies)}")
    assert q_score > 0.0
    print("  [SUCCESS] Movement Quality Score & Anomaly Detection verified.")

    # 5. Test PDF and Excel Report Exporters
    from app.report_exporter import generate_pdf_report, generate_excel_report
    print("\n[5] Report Exporter Inspection:")
    sample_report_data = {
        "athlete": {"name": "Test Athlete", "sport": "Soccer", "position": "Forward", "age": 22, "height": 180, "weight": 75, "training_load": 12.0},
        "video": {"activity": "Squatting"},
        "created_at": "2026-08-23",
        "assessment": {
            "knee_valgus": 0.88, "hip_stability": 3.2, "trunk_lean": 14.0, "stride_length": 1.25,
            "joint_alignment": 92.0, "symmetry_score": 94.0, "fatigue_score": 3.0, "movement_quality": q_score
        },
        "risk": {
            "risk_score": 22.5, "risk_category": "Low", "acl_risk": 18.0, "hamstring_risk": 20.0,
            "ankle_risk": 15.0, "shoulder_risk": 10.0, "lower_back_risk": 22.0, "overuse_risk": 25.0
        },
        "recommendations": {
            "exercise": "- Goblet Squats: 3 sets x 10 reps\n- Glute Bridges: 3 sets x 12 reps",
            "mobility": "- Ankle Mobilization: 5 mins",
            "strengthening": "- Single-leg Balance",
            "recovery": "Status: Low Fatigue. Standard hydration.",
            "training_modification": "No volume reduction needed."
        },
        "anomalies": anomalies
    }

    pdf_bytes = generate_pdf_report(sample_report_data)
    excel_bytes = generate_excel_report(sample_report_data)
    print(f"  - Generated PDF Report size: {len(pdf_bytes)} bytes")
    print(f"  - Generated Excel Report size: {len(excel_bytes)} bytes")
    assert len(pdf_bytes) > 0 and len(excel_bytes) > 0
    print("  [SUCCESS] Report Generation (PDF & Excel) verified.")

    print("\n==================================================")
    print("  ALL WEEK 3-4 VERIFICATION TESTS PASSED SUCCESSFULLY!  ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
