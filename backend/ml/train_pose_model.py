import os
import math
import xml.etree.ElementTree as ET
import numpy as np
from typing import Dict, List, Tuple, Any
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, r2_score

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
XML_PATH = os.path.join(DATASET_DIR, "annotations.xml")
CSV_PATH = os.path.join(DATASET_DIR, "PoseEstimation", "fiile_info.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "pose_ml_model.joblib")

os.makedirs(MODEL_DIR, exist_ok=True)

def calculate_angle_2d(a: Tuple[float, float], b: Tuple[float, float], c: Tuple[float, float]) -> float:
    """Calculates angle in degrees at vertex B for 2D points A, B, C."""
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])

    norm_ba = math.hypot(ba[0], ba[1])
    norm_bc = math.hypot(bc[0], bc[1])
    if norm_ba == 0 or norm_bc == 0:
        return 0.0

    dot = ba[0] * bc[0] + ba[1] * bc[1]
    cosine = max(-1.0, min(1.0, dot / (norm_ba * norm_bc)))
    return math.degrees(math.acos(cosine))

def load_and_preprocess_dataset() -> Tuple[np.ndarray, np.ndarray, List[Dict[str, Any]]]:
    """
    Parses annotations.xml & fiile_info.csv from dataset archive.
    Extracts 18 keypoint features and target biomechanical joint metrics.
    """
    if not os.path.exists(XML_PATH):
        raise FileNotFoundError(f"Annotations XML file not found at '{XML_PATH}'")

    tree = ET.parse(XML_PATH)
    root = tree.getroot()

    features_list = []
    targets_list = []
    sample_records = []

    for img in root.findall(".//image"):
        img_id = img.get("id")
        img_name = img.get("name")
        width = float(img.get("width", 1.0))
        height = float(img.get("height", 1.0))

        # 18 keypoints dictionary initialized to center (0.5, 0.5)
        kp_dict = {i: (0.5, 0.5) for i in range(18)}

        for pts in img.findall("points"):
            label_str = pts.get("label")
            raw_coords = pts.get("points", "")
            if label_str and raw_coords:
                try:
                    lbl = int(label_str)
                    coords = [float(c) for c in raw_coords.split(",")]
                    if len(coords) >= 2 and 0 <= lbl < 18:
                        norm_x = max(0.0, min(1.0, coords[0] / width))
                        norm_y = max(0.0, min(1.0, coords[1] / height))
                        kp_dict[lbl] = (norm_x, norm_y)
                except ValueError:
                    pass

        # Flatten 18 keypoints (36 features: x0, y0, x1, y1, ..., x17, y17)
        feat_vector = []
        for i in range(18):
            feat_vector.extend([kp_dict[i][0], kp_dict[i][1]])

        # Derived Spatial Ratios
        sh_left, sh_right = kp_dict[5], kp_dict[6]
        hip_left, hip_right = kp_dict[11], kp_dict[12]
        knee_left, knee_right = kp_dict[13], kp_dict[14]
        ankle_left, ankle_right = kp_dict[15], kp_dict[16]

        # Calculate target knee valgus angle
        knee_angle_left = calculate_angle_2d(hip_left, knee_left, ankle_left)
        valgus_left = abs(180.0 - knee_angle_left)

        knee_angle_right = calculate_angle_2d(hip_right, knee_right, ankle_right)
        valgus_right = abs(180.0 - knee_angle_right)

        target_max_valgus = max(valgus_left, valgus_right)
        target_hip_stability = max(0.0, 100.0 - abs(hip_right[1] - hip_left[1]) * 200.0)
        target_trunk_lean = abs(math.degrees(math.atan2(sh_right[0] - hip_right[0], sh_right[1] - hip_right[1]))) if (sh_right[1] - hip_right[1]) != 0 else 0.0

        features_list.append(feat_vector)
        targets_list.append([target_max_valgus, target_hip_stability, target_trunk_lean])

        sample_records.append({
            "image_id": img_id,
            "image_name": img_name,
            "valgus_deg": round(target_max_valgus, 1),
            "hip_stability": round(target_hip_stability, 1),
            "trunk_lean": round(target_trunk_lean, 1)
        })

    return np.array(features_list), np.array(targets_list), sample_records

def train_pose_ml_pipeline() -> Dict[str, Any]:
    """
    Trains an ML Random Forest Regressor Pipeline on dataset features.
    Saves trained model to backend/ml/models/pose_ml_model.joblib.
    """
    X, y, records = load_and_preprocess_dataset()

    if len(X) == 0:
        raise ValueError("Dataset is empty. Could not extract features from XML annotations.")

    # Build Scikit-Learn ML Pipeline
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('model', RandomForestRegressor(n_estimators=100, random_state=42))
    ])

    pipeline.fit(X, y)
    y_pred = pipeline.predict(X)

    mse = float(mean_squared_error(y, y_pred))
    r2 = float(r2_score(y, y_pred))

    model_payload = {
        "pipeline": pipeline,
        "features_count": X.shape[1],
        "samples_count": len(X),
        "target_names": ["max_knee_valgus_deg", "hip_stability_index", "trunk_lean_deg"],
        "metrics": {
            "r2_score": round(r2, 4),
            "mse_loss": round(mse, 4)
        }
    }

    joblib.dump(model_payload, MODEL_PATH)
    print(f"ML Pose Pipeline trained successfully! Saved model to '{MODEL_PATH}'. Samples: {len(X)}, R2 Score: {r2:.4f}")

    return {
        "status": "success",
        "model_path": MODEL_PATH,
        "samples_trained": len(X),
        "features_count": X.shape[1],
        "metrics": {
            "r2_score": round(r2, 4),
            "mse_loss": round(mse, 4)
        },
        "sample_records": records[:5]
    }

if __name__ == "__main__":
    train_pose_ml_pipeline()
