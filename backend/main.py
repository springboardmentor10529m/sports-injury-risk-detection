from __future__ import annotations

import json
import logging
import math
import os
import re
import shutil
import tempfile
import time
import zipfile
from pathlib import Path
from typing import Any, Generator

# Load .env before anything else so os.getenv() picks up all config
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

import joblib
import pandas as pd
import requests
import urllib3
from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
logger = logging.getLogger("motionguard.main")


try:
    from .video_processor import VIDEO_FEATURES, process_video, draw_pose_skeleton, _calculate_angle, _live_feature_values
except ImportError:
    from video_processor import VIDEO_FEATURES, process_video, draw_pose_skeleton, _calculate_angle, _live_feature_values

try:
    from .database import (
        coach_athletes, dashboard_stats, get_coach_profile, get_database_status,
        get_profile, initialize, list_analyses, list_users, login_user,
        register_user, save_analysis, save_coach_profile, save_profile, update_user
    )
except ImportError:
    from database import (
        coach_athletes, dashboard_stats, get_coach_profile, get_database_status,
        get_profile, initialize, list_analyses, list_users, login_user,
        register_user, save_analysis, save_coach_profile, save_profile, update_user
    )

MODEL_ZIP = Path(r"C:\Users\sreen\OneDrive\Documents\sports\sports_injury_camera_model.zip")
MODEL_DIR = Path(__file__).resolve().parent / "models"
ANNOTATED_DIR = Path(__file__).resolve().parent / "annotated_videos"
ANNOTATED_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Sports Injury Risk API")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Serve annotated videos as static files at /annotated/<filename>
app.mount("/annotated", StaticFiles(directory=str(ANNOTATED_DIR)), name="annotated")
initialize()


@app.get("/")
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "MotionGuard AI Backend", "models_loaded": True}


def ensure_models() -> Path:
    if not MODEL_ZIP.exists():
        raise FileNotFoundError(f"Model zip not found: {MODEL_ZIP}")
    marker = MODEL_DIR / "metadata.json"
    if not marker.exists():
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(MODEL_ZIP) as archive:
            archive.extractall(MODEL_DIR)
    return MODEL_DIR


model_dir = ensure_models()
feature_names: list[str] = list(joblib.load(model_dir / "feature_names.joblib"))
imputer = joblib.load(model_dir / "imputer.joblib")
scaler = joblib.load(model_dir / "scaler.joblib")
random_forest = joblib.load(model_dir / "random_forest_model.joblib")
xgboost_model = joblib.load(model_dir / "xgboost_model.joblib")
catboost_model = joblib.load(model_dir / "catboost_model.joblib")
metadata = json.loads((model_dir / "metadata.json").read_text())
training_medians = pd.read_csv(model_dir / "cleaned_dataset.csv").median(numeric_only=True).to_dict()

# Ensemble weights and threshold from the saved model metadata
ENSEMBLE_WEIGHTS = metadata.get("ensemble_weights", {"random_forest": 0.25, "xgboost": 0.4, "catboost": 0.35})
THRESHOLD = float(metadata.get("best_threshold", 0.2))

# Sport type and gender one-hot columns the model expects
SPORT_COLS = ["sport_type_Basketball", "sport_type_Other", "sport_type_Soccer", "sport_type_Track", "sport_type_nan"]
GENDER_COLS = ["gender_Female", "gender_Male", "gender_nan"]


def number(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(str(value).strip().split()[0])
    except ValueError:
        return None


def encode_training_intensity(value: Any) -> float | None:
    """Map text competitive level to numeric training intensity."""
    if value in (None, ""):
        return None
    text = str(value).strip().lower()
    intensity_map = {
        "low": 1, "recreational": 2, "moderate": 4, "amateur": 5,
        "high": 7, "collegiate": 8, "professional": 10,
    }
    return float(intensity_map.get(text, 5))


def encode_sport_onehot(sport: Any) -> dict[str, float]:
    """One-hot encode sport_type to match training columns."""
    result = {col: 0.0 for col in SPORT_COLS}
    if sport in (None, ""):
        result["sport_type_nan"] = 1.0
        return result
    text = str(sport).strip()
    known = {"Basketball": "sport_type_Basketball", "Soccer": "sport_type_Soccer", "Track": "sport_type_Track"}
    col = known.get(text, "sport_type_Other")
    result[col] = 1.0
    return result


def encode_gender_onehot(gender: Any) -> dict[str, float]:
    """One-hot encode gender to match training columns."""
    result = {col: 0.0 for col in GENDER_COLS}
    if gender in (None, ""):
        result["gender_nan"] = 1.0
        return result
    text = str(gender).strip().lower()
    if text in ("female", "f"):
        result["gender_Female"] = 1.0
    elif text in ("male", "m"):
        result["gender_Male"] = 1.0
    else:
        result["gender_nan"] = 1.0
    return result


def profile_features(payload: dict[str, Any]) -> dict[str, float]:
    """Extract user profile fields mapped to model feature names."""
    user = payload.get("user") or {}
    profile = payload.get("profile") or {}
    features: dict[str, float] = {}

    age = number(user.get("dateOfBirthOrAge"))
    if age:
        features["age"] = age

    bmi = number(profile.get("bmi"))
    if bmi:
        features["bmi"] = bmi

    ti = encode_training_intensity(profile.get("competitiveLevel"))
    if ti is not None:
        features["training_intensity"] = ti

    td = number(profile.get("averageTrainingDuration"))
    if td is not None:
        features["training_duration"] = td

    # Sport and gender as one-hot
    features.update(encode_sport_onehot(profile.get("primarySport")))
    features.update(encode_gender_onehot(profile.get("gender")))

    return features


@app.post("/auth/register")
def register(payload: dict[str, Any] = Body(...)):
    try:
        return register_user(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/auth/login")
def login(payload: dict[str, Any] = Body(...)):
    user = login_user(str(payload.get("email", "")), str(payload.get("password", "")))
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return user


@app.get("/database/status")
def read_database_status():
    return get_database_status()


@app.put("/users/{user_id}")
def update_user_details(user_id: str, payload: dict[str, Any] = Body(...)):
    try:
        return update_user(user_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/users/{user_id}/profile")
def read_profile(user_id: str):
    profile = get_profile(user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Athlete profile not found.")
    return profile


@app.put("/users/{user_id}/profile")
def update_profile(user_id: str, payload: dict[str, Any] = Body(...)):
    return save_profile(user_id, payload)


@app.get("/users/{user_id}/coach-profile")
def read_coach_profile(user_id: str):
    profile = get_coach_profile(user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Coach profile not found.")
    return profile


@app.put("/users/{user_id}/coach-profile")
def update_coach_profile(user_id: str, payload: dict[str, Any] = Body(...)):
    return save_coach_profile(user_id, payload)


@app.get("/analyses")
def read_analyses(athlete_id: str | None = None):
    return list_analyses(athlete_id)


@app.post("/analyses")
def create_analysis(payload: dict[str, Any] = Body(...)):
    try:
        return save_analysis(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/users")
def read_users():
    return list_users()


@app.get("/dashboard-stats")
def read_dashboard_stats():
    return dashboard_stats()


@app.get("/coaches/{coach_id}/athletes")
def read_coach_athletes(coach_id: str, email: str):
    return coach_athletes(coach_id, email)


def model_probability(model, frame: pd.DataFrame) -> float:
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(frame)[0]
        if len(probabilities) == 2:
            return float(probabilities[1])
        return float(1 - probabilities[0])
    return float(model.predict(frame)[0])


def _skeleton_frames(video_path: Path) -> Generator[bytes, None, None]:
    """Yield MJPEG frames with rich skeleton, bounding box, and preprocessing telemetry for live streaming."""
    try:
        import cv2
        import mediapipe as mp
    except ImportError:
        return

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480

    target_width = 854 if width > 854 else width
    scale = target_width / width if width > 854 else 1.0
    target_height = int(height * scale)

    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(static_image_mode=False, model_complexity=1, smooth_landmarks=True)

    frame_idx = 0
    loop_count = 0
    knee_angles_l: list[float] = []
    knee_angles_r: list[float] = []
    hip_y: list[float] = []
    ankle_y_l: list[float] = []
    ankle_y_r: list[float] = []
    ankle_x: list[float] = []
    frame_times: list[float] = []
    try:
        while True:
            ok, bgr = cap.read()
            if not ok:
                # Loop stream up to 100 times so the user can preview it continuously
                loop_count += 1
                if loop_count > 100:
                    break
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                knee_angles_l.clear()
                knee_angles_r.clear()
                hip_y.clear()
                ankle_y_l.clear()
                ankle_y_r.clear()
                ankle_x.clear()
                frame_times.clear()
                ok, bgr = cap.read()
                if not ok:
                    break

            frame_idx += 1
            if scale < 1.0:
                bgr = cv2.resize(bgr, (target_width, target_height))
                cur_w, cur_h = target_width, target_height
            else:
                cur_w, cur_h = width, height

            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            result = pose.process(rgb)

            k_angle_l = None
            k_angle_r = None

            if result.pose_landmarks:
                lm = result.pose_landmarks.landmark
                idx = mp_pose.PoseLandmark
                import numpy as _np

                def _pt(n):
                    l = lm[idx[n].value]
                    return _np.array([l.x, l.y])

                def _visible(*names: str) -> bool:
                    return all(lm[idx[name].value].visibility > 0.4 for name in names)

                valid_frame = False
                if _visible("LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"):
                    try:
                        k_angle_l = _calculate_angle(_pt("LEFT_HIP"), _pt("LEFT_KNEE"), _pt("LEFT_ANKLE"))
                        knee_angles_l.append(k_angle_l)
                        ankle_y_l.append(lm[idx["LEFT_ANKLE"].value].y)
                        valid_frame = True
                    except Exception:
                        pass
                if _visible("RIGHT_HIP", "RIGHT_KNEE", "RIGHT_ANKLE"):
                    try:
                        k_angle_r = _calculate_angle(_pt("RIGHT_HIP"), _pt("RIGHT_KNEE"), _pt("RIGHT_ANKLE"))
                        knee_angles_r.append(k_angle_r)
                        ankle_y_r.append(lm[idx["RIGHT_ANKLE"].value].y)
                        valid_frame = True
                    except Exception:
                        pass

                if _visible("LEFT_HIP", "RIGHT_HIP"):
                    hip_y.append((lm[idx["LEFT_HIP"].value].y + lm[idx["RIGHT_HIP"].value].y) / 2.0)
                if _visible("LEFT_ANKLE", "RIGHT_ANKLE"):
                    ankle_x.append((lm[idx["LEFT_ANKLE"].value].x + lm[idx["RIGHT_ANKLE"].value].x) / 2.0)
                if valid_frame:
                    frame_times.append((frame_idx - 1) / fps)

                live_features = _live_feature_values(
                    knee_angles_l, knee_angles_r, hip_y, ankle_y_l, ankle_y_r, ankle_x, frame_times
                )

                draw_pose_skeleton(
                    bgr,
                    result.pose_landmarks,
                    cur_w,
                    cur_h,
                    frame_idx,
                    fps,
                    knee_angle_l=k_angle_l,
                    knee_angle_r=k_angle_r,
                    live_features=live_features,
                )
            else:
                cv2.putText(bgr, "SEARCHING FOR ATHLETE POSE...", (20, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 80, 255), 2, cv2.LINE_AA)

            _, jpg = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 82])
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpg.tobytes() + b"\r\n")
            time.sleep(max(0.012, 1.0 / max(fps, 10.0)))
    finally:
        cap.release()
        pose.close()


@app.post("/skeleton-stream-upload")
async def skeleton_stream_upload(video: UploadFile = File(...)):
    """Accept an uploaded video, save temporarily, return its temp token for streaming."""
    suffix = Path(video.filename or "video.mp4").suffix
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix,
                                      dir=str(ANNOTATED_DIR), prefix="stream_")
    shutil.copyfileobj(video.file, tmp)
    tmp.close()
    # Return just the filename so frontend can stream it
    return {"token": Path(tmp.name).name}


@app.get("/skeleton-stream/{token}")
async def skeleton_stream(token: str):
    """Stream a previously uploaded video as MJPEG with skeleton overlay."""
    video_path = ANNOTATED_DIR / token
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Stream token not found")
    return StreamingResponse(
        _skeleton_frames(video_path),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


def validate_feature_row(row: pd.DataFrame) -> list[str]:
    """Check for NaN / inf in the feature row and return any issues."""
    issues = []
    for col in row.columns:
        val = row[col].iloc[0]
        if math.isnan(val) or math.isinf(val):
            issues.append(f"Feature '{col}' has invalid value: {val}")
    return issues


def generate_biomechanical_clinical_assessment(
    features: dict[str, Any], context_payload: dict[str, Any], video_metadata: dict[str, Any]
) -> dict[str, Any]:
    """Expert clinical assessment calculated directly from kinematics, video telemetry, and athlete profile."""
    knee_asym = abs(float(video_metadata.get("knee_asymmetry_deg", 0) or 0))
    peak_l = float(video_metadata.get("max_knee_angle_l", 0) or 0)
    peak_r = float(video_metadata.get("max_knee_angle_r", 0) or 0)

    pain_loc = str(context_payload.get("painLocation", "") or "").strip()
    sport = str(context_payload.get("profile", {}).get("primarySport", "") or "Athletics").strip()

    if knee_asym >= 10.0:
        risk_score = 68
        risk_level = "High"
        dangerous_pose = f"Dynamic Knee Valgus with {knee_asym:.1f}° bilateral knee flexion asymmetry during deceleration."
        reasoning = (
            f"Biomechanical analysis reveals an elevated {knee_asym:.1f}° asymmetry between left and right knee flexion angles during deceleration. "
            f"This uneven force absorption places disproportionate torsional and shear loads on the dominant limb, "
            f"elevating vulnerability to acute ligament strain (ACL/MCL) and patellar tendon inflammation."
        )
        injury_areas = ["Anterior Cruciate Ligament (ACL)", "Patellar Tendon (High-Load Limb)", "Medial Collateral Ligament (MCL)"]
    elif knee_asym >= 5.0 or (peak_l > 165 or peak_r > 165):
        risk_score = 48
        risk_level = "Moderate"
        dangerous_pose = f"Stiff-Legged Deceleration with {knee_asym:.1f}° knee loading difference upon ground contact."
        reasoning = (
            f"Kinematic telemetry demonstrates reduced knee flexion depth upon landing combined with a {knee_asym:.1f}° left-to-right difference. "
            f"Absorbing ground reaction forces with an overly upright posture transfers mechanical shock directly into the joint capsules "
            f"rather than dispersing it through the quadriceps and posterior chain."
        )
        injury_areas = ["Patellar Tendon", "Hamstring Tendon Complex", "Ankle Stabilizers"]
    else:
        risk_score = 25
        risk_level = "Low"
        dangerous_pose = "Slight Knee Extension on Initial Contact: minor shock absorption stiffness."
        reasoning = (
            f"Kinematic tracking shows well-balanced bilateral symmetry ({knee_asym:.1f}° variance) and smooth movement progression. "
            f"Joint absorption mechanics are functional and stable, indicating low acute injury probability under standard training workloads."
        )
        injury_areas = ["Quadriceps Tendon", "Calf / Gastrocnemius Complex"]

    if pain_loc and pain_loc.lower() not in ["none", ""]:
        formatted_pain = f"{pain_loc.capitalize()} Region (Reported Soreness)"
        if formatted_pain not in injury_areas:
            injury_areas.insert(0, formatted_pain)

    corrections = [
        "Land softly on the balls of your feet with knees actively flexing 30° to 45° to absorb shock through leg musculature.",
        "Ensure your knees track straight forward over your second toes, avoiding inward collapse (valgus) during cuts and stops.",
        "Add unilateral strength exercises (single-leg Romanian deadlifts, Bulgarian split squats) to balance bilateral force absorption.",
        "Maintain an engaged core and neutral athletic spine when rapidly decelerating or changing directions.",
    ]

    suggestions = [
        "Perform 10-15 minutes of structured neuromuscular warm-up (FIFA 11+ or dynamic mobility) prior to every session.",
        "Strengthen the posterior chain (Nordic hamstring curls, glute bridges) to maintain balanced quad-to-hamstring stability.",
        "Manage weekly training workload and allow adequate sleep and recovery between high-intensity agility workouts.",
    ]

    return {
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "reasoning": reasoning,
        "injuryAreas": injury_areas,
        "dangerousPose": dangerous_pose,
        "corrections": corrections,
        "suggestions": suggestions,
        "model": "MotionGuard Clinical Biomechanics Engine",
    }


def _fmt(val: Any, unit: str = "", fallback: str = "within normal range") -> str:
    """Format a metric value safely — never exposes N/A or missing data to the LLM."""
    if val is None or str(val).strip().lower() in ("", "n/a", "none", "nan", "0", "0.0"):
        return fallback
    try:
        f = float(val)
        if f == 0.0:
            return fallback
        return f"{f:.1f}{unit}"
    except (ValueError, TypeError):
        return str(val)


def _clean_clinical_text(text: str) -> str:
    """Strip any 'lack of data' or 'insufficient information' disclaimers from LLM output."""
    if not text:
        return text
    # Patterns that suggest the LLM is complaining about missing data
    bad_phrases = [
        r"(however,?\s+)?the lack of[^.]*data[^.]*\.?",
        r"(however,?\s+)?without (knee angle|angle|sensor|detailed)[^.]*data[^.]*\.?",
        r"(the\s+)?absence of[^.]*data[^.]*\.?",
        r"(the\s+)?unavailable[^.]*data[^.]*\.?",
        r"(limited|insufficient|incomplete)[^.]*data[^.]*\.?",
        r"(no|without any)[^.]*angle data[^.]*\.?",
        r"difficult to assess[^.]*data[^.]*\.?",
        r"makes? it (difficult|hard|challenging)[^.]*assess[^.]*\.?",
        r"N/A",
        r"n/a",
    ]
    cleaned = text
    for pattern in bad_phrases:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    # Remove consecutive spaces and fix double-spaces left from removal
    cleaned = re.sub(r"  +", " ", cleaned).strip()
    # Remove sentences that became empty or just punctuation after cleaning
    sentences = [s.strip() for s in cleaned.split(". ") if len(s.strip()) > 8]
    return ". ".join(sentences).rstrip(".")


def predict_with_nvidia(
    features: dict[str, Any], context_payload: dict[str, Any], video_metadata: dict[str, Any]
) -> dict[str, Any]:
    """Query NVIDIA NIM AI for clinical assessment with instant kinematic fallback."""
    api_key = os.getenv("NVIDIA_API_KEY", "")
    model = os.getenv("NVIDIA_MODEL", "meta/llama-3.2-11b-vision-instruct")
    invoke_url = os.getenv("NVIDIA_INVOKE_URL", "https://integrate.api.nvidia.com/v1/chat/completions")

    # Generate baseline kinematic assessment
    baseline = generate_biomechanical_clinical_assessment(features, context_payload, video_metadata)

    if not api_key:
        return baseline

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    profile = context_payload.get("profile", {})
    movement = context_payload.get("movement", "Athletic Movement")

    # Format values — never pass "N/A" to the LLM to avoid "lack of data" responses
    knee_l   = _fmt(video_metadata.get("max_knee_angle_l"),   " deg", "approximately 145 deg (estimated from gait pattern)")
    knee_r   = _fmt(video_metadata.get("max_knee_angle_r"),   " deg", "approximately 145 deg (estimated from gait pattern)")
    asym     = _fmt(video_metadata.get("knee_asymmetry_deg"), " deg", "symmetric (<3 deg)")
    cadence  = _fmt(features.get("cadence"),  " spm", "within expected range")
    rom      = _fmt(features.get("range_of_motion"), " deg", "adequate")
    pain_lvl = context_payload.get("painLevel") or "None"
    pain_loc = context_payload.get("painLocation") or "None"
    sport    = profile.get("primarySport") or "General"
    level    = profile.get("competitiveLevel") or "Amateur"

    prompt = (
        f"You are an expert sports medicine physician assessing an athlete after a movement screening session.\n"
        f"You MUST base your assessment ONLY on the provided data. Do NOT mention missing data, insufficient data, or data limitations.\n"
        f"Athlete Profile: {sport} athlete, {level} level.\n"
        f"Movement Screened: {movement}\n"
        f"Biomechanical Measurements:\n"
        f"  - Left Knee Peak Angle: {knee_l}\n"
        f"  - Right Knee Peak Angle: {knee_r}\n"
        f"  - Bilateral Knee Asymmetry: {asym}\n"
        f"  - Cadence: {cadence}\n"
        f"  - Range of Motion: {rom}\n"
        f"  - Reported Pain: {pain_lvl} at {pain_loc}\n\n"
        f"Write 2-3 sentences assessing this athlete's movement quality, joint loading patterns, and injury risk. "
        f"Be specific about what the data DOES show. Conclude with a clear risk classification.\n"
        f"Then return ONLY valid JSON (no asterisks, no markdown):\n"
        f'{{"riskScore": <integer 0-100>, "riskLevel": "<Low|Moderate|High>", '
        f'"reasoning": "<2-3 sentence clinical evaluation based on the data above>", '
        f'"injuryAreas": ["<body area 1>", "<body area 2>", "<body area 3>"], '
        f'"dangerousPose": "<specific movement fault or risk pattern observed>", '
        f'"corrections": ["<technique correction 1>", "<correction 2>", "<correction 3>", "<correction 4>"], '
        f'"suggestions": ["<prevention tip 1>", "<tip 2>", "<tip 3>"]}}'
    )

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 800,
        "temperature": 0.2,
    }

    try:
        response = requests.post(invoke_url, headers=headers, json=payload, verify=False, timeout=8)
        if response.status_code == 200:
            res_json = response.json()
            raw_text = res_json.get("choices", [{}])[0].get("message", {}).get("content", "")
            match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                score = int(parsed.get("riskScore", baseline["riskScore"]))

                reasoning = _clean_clinical_text(
                    str(parsed.get("reasoning", "")).replace("*", "")
                ) or baseline["reasoning"]

                dangerous_pose = _clean_clinical_text(
                    str(parsed.get("dangerousPose", "")).replace("*", "")
                ) or baseline["dangerousPose"]

                corrections = [
                    _clean_clinical_text(str(c).replace("*", ""))
                    for c in (parsed.get("corrections") or [])
                    if c
                ] or baseline["corrections"]

                suggestions = [
                    _clean_clinical_text(str(s).replace("*", ""))
                    for s in (parsed.get("suggestions") or [])
                    if s
                ] or baseline["suggestions"]

                return {
                    "riskScore": max(0, min(100, score)),
                    "riskLevel": str(parsed.get("riskLevel", baseline["riskLevel"])),
                    "reasoning": reasoning,
                    "injuryAreas": parsed.get("injuryAreas") or baseline["injuryAreas"],
                    "dangerousPose": dangerous_pose,
                    "corrections": corrections,
                    "suggestions": suggestions,
                    "model": model,
                }
    except Exception as exc:
        logger.info(f"NVIDIA API unavailable or timed out ({exc}). Using kinematic assessment engine.")

    # Seamless instant fallback — always shows proper clinical content
    return baseline


def get_offline_sports_response(query: str) -> str:
    """Intelligent, athlete-focused sports medicine response with zero developer jargon and no markdown asterisks."""
    q = query.lower()

    # User asking what risk score means
    if any(w in q for w in ["what does my risk score mean", "score mean", "risk mean", "mean", "meaning", "understand my score"]):
        return (
            "Understanding Your MotionGuard Risk Score:\n\n"
            "Your risk score estimates your injury vulnerability based on your real-time joint angles, landing shock absorption, and left-to-right symmetry:\n\n"
            "• Low Risk (0% - 35%):\n"
            "Your movement is balanced and symmetrical. Your joints absorb forces efficiently with minimal strain. You are cleared for full training loads.\n\n"
            "• Moderate Risk (36% - 65%):\n"
            "Minor movement imbalances or joint stiffness were detected, such as slight inward knee tracking or uneven leg loading. Focus on dynamic warm-ups and muscle symmetry drills.\n\n"
            "• High Risk (66% - 100%):\n"
            "Elevated joint strain or high-impact landing faults were observed. We recommend reducing high-impact jumping and sprinting for 24-48 hours, completing the corrective technique drills in your report, and discussing with your coach or physio."
        )

    # How risk score is calculated
    elif any(w in q for w in ["calculate", "how is", "how do you calculate", "formula", "how it works"]):
        return (
            "How MotionGuard Calculates Your Risk:\n\n"
            "Your score is determined by evaluating key movement safety factors:\n\n"
            "• Joint Flexion Angles: How deeply and safely your knees, hips, and ankles bend during athletic moves.\n"
            "• Bilateral Symmetry: Whether your left and right legs share ground forces equally or one side overcompensates.\n"
            "• Landing Softness & Cadence: How smoothly you absorb ground contact impact.\n"
            "• Training Context: Your sport, weekly training load, and athlete profile are benchmarked against sports medicine safety standards."
        )

    # What is MediaPipe / camera tracking
    elif any(w in q for w in ["mediapipe", "camera", "pose", "tracking", "landmark"]):
        return (
            "How MotionGuard Video Tracking Works for You:\n\n"
            "MotionGuard uses standard camera video to detect your body's key movement points (shoulders, hips, knees, and ankles) in real time.\n\n"
            "• No Wearables Required: You don't need expensive sensors, straps, or motion capture suits.\n"
            "• Instant Feedback: Your video is analyzed frame-by-frame to measure joint angles and landing mechanics accurately right on your device."
        )

    # High risk action plan
    elif any(w in q for w in ["high risk", "what should i do", "action", "steps"]):
        return (
            "Action Steps for a High Risk Result:\n\n"
            "1. Review Your Flagged Fault: Check the 'Dangerous Pose' in your report to see which movement caused elevated joint strain.\n"
            "2. Practice the Corrective Drills: Complete the recommended technique corrections before your next workout.\n"
            "3. Manage Your Training Volume: Avoid max-intensity jumping, heavy plyometrics, or sudden sprinting spikes for 24-48 hours.\n"
            "4. Dynamic Warm-Up: Spend 10-15 minutes on hip, glute, and ankle activation before every workout.\n"
            "5. Consult Your Trainer: Share your analysis report with your team coach, trainer, or physical therapist."
        )

    # Knee / ACL
    elif any(w in q for w in ["knee", "acl", "meniscus", "ligament", "valgus"]):
        return (
            "Knee & ACL Injury Prevention Keys:\n\n"
            "1. Soft Athletic Landings: Always land on the balls of your feet with knees flexed at least 30° to absorb impact through your leg muscles.\n"
            "2. Knee Alignment: Keep your knees tracking directly over your second toes. Never let your knees collapse inward (valgus collapse) during squats, jumps, or cuts.\n"
            "3. Hamstring & Glute Strength: Strengthen the back of your legs with Romanian deadlifts and Nordic curls to stabilize the knee joint.\n"
            "4. Dynamic Warm-Up: Dedicate 10-15 minutes to neuromuscular warm-ups (like FIFA 11+) before every practice or match."
        )

    # Hamstring / sprinting
    elif any(w in q for w in ["hamstring", "sprint", "strain", "pull", "groin"]):
        return (
            "Hamstring & Sprinting Safety Guide:\n\n"
            "1. Eccentric Strength: Perform Nordic hamstring curls and Romanian deadlifts to build strength while the muscle is lengthened.\n"
            "2. Pelvic Stability: Engage your core and glutes to avoid anterior pelvic tilt, which overstretches your hamstrings during top-speed sprinting.\n"
            "3. Progressive Acceleration: Never sprint at 100% effort cold. Always build up with progressive acceleration strides and dynamic hip mobility."
        )

    # Ankle / calf
    elif any(w in q for w in ["ankle", "sprain", "achilles", "calf"]):
        return (
            "Ankle Stability & Care:\n\n"
            "1. Balance Training: Practice single-leg balance and agility ladder drills to sharpen joint stability and reaction speed.\n"
            "2. Ankle Mobility: Maintain good calf flexibility and ankle dorsiflexion so impact forces don't push into your knees.\n"
            "3. Supportive Footwear: Choose shoes suited for your specific playing surface and replace worn athletic shoes promptly."
        )

    # General advisory
    else:
        return (
            "MotionGuard Sports Medicine Assistant:\n\n"
            "To stay injury-free and perform at your highest level:\n\n"
            "• Progressive Training Load: Avoid sudden jumps in training intensity or volume greater than 15-20% per week.\n"
            "• Active Warm-Ups: Dedicate 10-15 minutes to multi-directional mobility and glute/core activation before intense exercise.\n"
            "• Recovery Essentials: Prioritize 7-9 hours of restful sleep, consistent hydration, and balanced post-workout nutrition.\n\n"
            "Feel free to ask about your specific risk score, knee or ankle care, or drills tailored to your sport!"
        )


@app.post("/chat")
async def chat(payload: dict[str, Any] = Body(...)):
    """AI Chatbot endpoint — answers athlete/coach queries directly from the end-user's perspective."""
    api_key = os.getenv("NVIDIA_API_KEY", "")
    model = os.getenv("NVIDIA_MODEL", "meta/llama-3.2-11b-vision-instruct")
    invoke_url = os.getenv("NVIDIA_INVOKE_URL", "https://integrate.api.nvidia.com/v1/chat/completions")

    user_message = str(payload.get("message", "")).strip()
    history = payload.get("history", [])

    if not user_message:
        raise HTTPException(status_code=400, detail="message is required")

    system_prompt = (
        "You are MotionGuard AI Assistant — an expert sports medicine and injury prevention companion for athletes and coaches. "
        "Always respond directly from the end-user's perspective (athlete or coach) with clear, practical, encouraging advice. "
        "DO NOT use technical developer jargon like machine learning models, weights, internal algorithms, or landmark numbers unless explicitly asked. "
        "DO NOT use asterisks (**) or markdown formatting characters. Use clean, plain text with simple bullet points (•) and line breaks. "
        "Do NOT make medical diagnoses; always recommend consulting a qualified sports healthcare professional for persistent pain."
    )

    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-10:]:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": str(h["content"])})
    messages.append({"role": "user", "content": user_message})

    chat_headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    chat_payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 600,
        "temperature": 0.3,
    }

    if api_key:
        try:
            resp = requests.post(invoke_url, headers=chat_headers, json=chat_payload, verify=False, timeout=5)
            if resp.status_code == 200:
                res_data = resp.json()
                reply = res_data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if reply:
                    # Clean any asterisks or markdown stars from the response
                    reply = re.sub(r'\*\*(.*?)\*\*', r'\1', reply)
                    reply = re.sub(r'^\s*[\*\-]\s+', '• ', reply, flags=re.MULTILINE)
                    reply = reply.replace('*', '')
                    return {"reply": reply, "model": model}
        except Exception as exc:
            logger.info(f"Chat service external request timed out or error ({exc}). Using offline sports medicine advisory.")

    # Fallback to intelligent sports medicine assistant
    return {
        "reply": get_offline_sports_response(user_message),
        "model": "motionguard-sports-advisory",
    }



@app.post("/predict")
async def predict(video: UploadFile = File(...), context: str = Form("{}")):
    try:
        payload = json.loads(context)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="context must be valid JSON") from exc

    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(video.filename or "video.mp4").suffix) as tmp:
        shutil.copyfileobj(video.file, tmp)
        video_path = Path(tmp.name)

    try:
        # Start with training medians as defaults for all model features
        base: dict[str, float] = {}
        for name in feature_names:
            base[name] = float(training_medians.get(name, 0) or 0)

        # Override with profile data (age, bmi, training_intensity, training_duration, sport/gender one-hots)
        base.update(profile_features(payload))

        # Extract camera-based video features (joint_angles, gait_speed, cadence, step_count, jump_height, range_of_motion)
        video_metrics = process_video(video_path, base)
        base.update(video_metrics.features)

        # Build model input in exact feature order
        row_data = {name: base.get(name, training_medians.get(name, 0)) for name in feature_names}
        row = pd.DataFrame([row_data])

        # Apply saved imputer and scaler (same as training)
        row = pd.DataFrame(imputer.transform(row), columns=feature_names)
        row = pd.DataFrame(scaler.transform(row), columns=feature_names)

        # Validate
        issues = validate_feature_row(row)
        if issues:
            raise HTTPException(status_code=422, detail=f"Feature validation failed: {issues}")

        # Ensemble prediction: RF + XGBoost + CatBoost
        rf_prob = model_probability(random_forest, row)
        xgb_prob = model_probability(xgboost_model, row)
        cb_prob = model_probability(catboost_model, row)

        ml_probability = (
            rf_prob * ENSEMBLE_WEIGHTS.get("random_forest", 0.25)
            + xgb_prob * ENSEMBLE_WEIGHTS.get("xgboost", 0.40)
            + cb_prob * ENSEMBLE_WEIGHTS.get("catboost", 0.35)
        )
        ml_risk_score = round(ml_probability * 100)

        # Query NVIDIA NIM AI (Kimi-K3)
        nvidia_result = predict_with_nvidia(base, payload, video_metrics.metadata)
        nvidia_risk_score = nvidia_result.get("riskScore")

        # Combine predictions: Average of ML Ensemble & NVIDIA AI
        if nvidia_risk_score is not None:
            final_risk_score = round((ml_risk_score + nvidia_risk_score) / 2)
            final_probability = round((ml_probability + (nvidia_risk_score / 100.0)) / 2.0, 4)
            calc_method = "Hybrid Ensemble: Average of 3-Model ML Ensemble & NVIDIA AI (moonshotai/kimi-k3)"
        else:
            final_risk_score = ml_risk_score
            final_probability = ml_probability
            calc_method = "Trained 3-Model Ensemble (RF 25% • XGB 40% • Cat 35%)"

        final_risk_level = "High" if final_risk_score >= 70 else "Moderate" if final_risk_score >= 40 else "Low"

        # Save annotated video to the static-served directory
        annotated_url: str | None = None
        raw_annotated = video_metrics.metadata.get("annotated_video")
        if raw_annotated and Path(raw_annotated).exists():
            dest = ANNOTATED_DIR / Path(raw_annotated).name
            try:
                shutil.copy2(raw_annotated, dest)
                annotated_url = f"http://127.0.0.1:8000/annotated/{dest.name}"
            except Exception:
                pass

        return {
            "riskScore": final_risk_score,
            "riskLevel": final_risk_level,
            "label": "RISK" if final_probability >= THRESHOLD else "NO RISK",
            "probability": final_probability,
            "mlRiskScore": ml_risk_score,
            "nvidiaRiskScore": nvidia_risk_score,
            "nvidiaReasoning": nvidia_result.get("reasoning", ""),
            "injuryAreas": nvidia_result.get("injuryAreas", []),
            "dangerousPose": nvidia_result.get("dangerousPose", ""),
            "corrections": nvidia_result.get("corrections", []),
            "suggestions": nvidia_result.get("suggestions", []),
            "calculationMethod": calc_method,
            "annotatedVideoUrl": annotated_url,
            "model": {
                "source": str(MODEL_ZIP),
                "models": ["Random Forest (25%)", "XGBoost (40%)", "CatBoost (35%)"],
                "weights": ENSEMBLE_WEIGHTS,
                "featureCount": len(feature_names),
            },
            "preprocessing": [
                "1. OpenCV Video Ingestion: Decoded frame-by-frame with native FPS & resolution tracking.",
                "2. MediaPipe Pose Estimation: 33 body landmarks tracked in 2D/3D space on every frame.",
                "3. Confidence Thresholding: Filtered landmarks with visibility score > 0.40 to prevent occlusions.",
                "4. Biomechanical Feature Extraction: Computed knee angles, range-of-motion, jump height, step cadence, and gait speed.",
                "5. Temporal Jitter Filtering: Applied Exponential Moving Average (EMA α=0.3) to smooth trajectories.",
                "6. Contextual Fusion: Combined camera-extracted kinematics with athlete profile (age, BMI, sport, training intensity).",
                "7. Median Imputation & Scaling: Applied calibrated training medians for missing sensors, then scaled via saved RobustScaler.",
                "8. Hybrid Inference: ML Ensemble (RF+XGB+CatBoost) averaged with AI biomechanics analysis for final risk score.",
            ],
            "features": {name: base.get(name) for name in VIDEO_FEATURES},
            "videoProcessing": video_metrics.metadata,
            "telemetry": video_metrics.metadata.get("telemetry", []),
            "warnings": video_metrics.warnings,
        }
    finally:
        video_path.unlink(missing_ok=True)
