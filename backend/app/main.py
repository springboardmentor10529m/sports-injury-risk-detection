import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="Sports Injury Risk Detection - Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://frontend",
        "http://sir_frontend",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
security = HTTPBearer(auto_error=False)

USER_DB = {
    "athlete@sportslab.ai": {
        "id": "USR-001",
        "firebase_uid": "fb_athlete_001",
        "name": "Aarav Sharma",
        "email": "athlete@sportslab.ai",
        "password": "password123",
        "role": "athlete",
        "sport": "Cricket",
        "position": "Fast Bowler",
    },
    "coach@sportslab.ai": {
        "id": "USR-002",
        "firebase_uid": "fb_coach_002",
        "name": "Priya Nair",
        "email": "coach@sportslab.ai",
        "password": "password123",
        "role": "coach",
        "sport": "Cricket",
        "position": "Head Coach",
    },
    "physio@sportslab.ai": {
        "id": "USR-003",
        "firebase_uid": "fb_physio_003",
        "name": "Mark Lee",
        "email": "physio@sportslab.ai",
        "password": "password123",
        "role": "physiotherapist",
        "sport": "Performance Rehab",
        "position": "Lead Physiotherapist",
    },
    "scientist@sportslab.ai": {
        "id": "USR-004",
        "firebase_uid": "fb_scientist_004",
        "name": "Zoya Khan",
        "email": "scientist@sportslab.ai",
        "password": "password123",
        "role": "scientist",
        "sport": "Biomechanics",
        "position": "Sports Scientist",
    },
    "admin@sportslab.ai": {
        "id": "USR-005",
        "firebase_uid": "fb_admin_005",
        "name": "Rohan Dsouza",
        "email": "admin@sportslab.ai",
        "password": "password123",
        "role": "admin",
        "sport": "Platform Ops",
        "position": "Administrator",
    },
}

DEFAULT_ATHLETES = [
    {
        "athlete_id": "ATH-1042",
        "name": "Aarav Sharma",
        "sport": "Cricket",
        "position": "Fast Bowler",
        "age": 24,
        "risk_score": 72,
        "risk_level": "High Risk",
        "movement_quality": 81,
        "injury_history": "Hamstring strain (last 4 months)",
        "training_load": 74,
        "fatigue_index": 68,
        "symmetry_index": 88,
        "latest_alert": "Knee valgus and asymmetrical landing detected",
    },
    {
        "athlete_id": "ATH-2156",
        "name": "Nia Patel",
        "sport": "Basketball",
        "position": "Guard",
        "age": 21,
        "risk_score": 48,
        "risk_level": "Moderate Risk",
        "movement_quality": 76,
        "injury_history": "Ankle soreness",
        "training_load": 62,
        "fatigue_index": 53,
        "symmetry_index": 91,
        "latest_alert": "Landing mechanics need monitoring",
    },
    {
        "athlete_id": "ATH-3308",
        "name": "Daniel Moss",
        "sport": "Football",
        "position": "Midfielder",
        "age": 26,
        "risk_score": 31,
        "risk_level": "Low Risk",
        "movement_quality": 90,
        "injury_history": "No prior major injury",
        "training_load": 58,
        "fatigue_index": 41,
        "symmetry_index": 95,
        "latest_alert": "Movement quality remains stable",
    },
]

DEFAULT_ALERTS = [
    {"title": "High-risk landing pattern", "severity": "high", "athlete": "ATH-1042", "message": "Excessive knee valgus observed in final two jumps."},
    {"title": "Training load warning", "severity": "medium", "athlete": "ATH-2156", "message": "Load increased 13% in the last 7 days."},
    {"title": "Recovery reminder", "severity": "low", "athlete": "ATH-3308", "message": "Mobility follow-up scheduled for Thursday."},
]

INFLUX_SCHEMA = {
    "measurement": "movement_metrics",
    "tags": ["athlete_id", "sport", "risk_level", "side", "session_id"],
    "fields": [
        "risk_score",
        "movement_quality",
        "knee_valgus",
        "hip_stability",
        "trunk_lean",
        "fatigue_index",
        "training_load",
        "stride_length",
        "landing_mechanics",
        "cadence",
        "symmetry_index",
    ],
    "timestamp_precision": "ns",
    "description": "Time-series stream for pose, biomechanics, and injury risk evaluation.",
}


def get_influx_client():
    url = os.getenv("INFLUX_URL")
    token = os.getenv("INFLUX_TOKEN")
    org = os.getenv("INFLUX_ORG")
    if not url or not token or not org:
        return None
    return InfluxDBClient(url=url, token=token, org=org)


def create_token(email: str) -> str:
    secret = os.getenv("APP_SECRET", "sports-injury-demo-secret")
    payload = {"email": email, "exp": int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp())}
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    signature = hmac.new(secret.encode(), payload_json, hashlib.sha256).digest()
    token = base64.urlsafe_b64encode(payload_json).decode().rstrip("=") + "." + base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return token


def verify_token(token: str):
    if not token:
        return None
    try:
        payload_part, sig_part = token.split(".", 1)
        payload = base64.urlsafe_b64decode(payload_part + "=" * (-len(payload_part) % 4))
        sig = base64.urlsafe_b64decode(sig_part + "=" * (-len(sig_part) % 4))
        secret = os.getenv("APP_SECRET", "sports-injury-demo-secret")
        expected = hmac.new(secret.encode(), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expected):
            return None
        claims = json.loads(payload.decode())
        if claims.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
            return None
        return claims
    except Exception:
        return None


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    claims = verify_token(credentials.credentials)
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = USER_DB.get(claims.get("email"))
    if not user:
        raise HTTPException(status_code=401, detail="Unknown user")
    return user


def build_dashboard_payload(role: str | None = None, user: dict | None = None) -> dict[str, Any]:
    summary = {
        "total_athletes": len(DEFAULT_ATHLETES),
        "high_risk": sum(1 for a in DEFAULT_ATHLETES if a["risk_level"] in {"High Risk", "Critical Risk"}),
        "average_risk_score": round(sum(a["risk_score"] for a in DEFAULT_ATHLETES) / len(DEFAULT_ATHLETES), 1),
        "alert_count": len(DEFAULT_ALERTS),
    }

    role_view = role or (user.get("role") if user else "athlete")
    connected_systems = {
        "firebase_uid": user.get("firebase_uid") if user else None,
        "firebase_collection": "users",
        "influx_measurement": "movement_metrics",
        "influx_bucket": os.getenv("INFLUX_BUCKET", "movement_metrics"),
        "ai_insights_status": "ready",
    }
    role_summary = {
        "athlete": {
            "heading": "Athlete movement dashboard",
            "focus": "Track injury risk, movement quality, and training readiness from your most recent video assessments.",
            "metrics": [
                {"label": "Risk score", "value": "72/100"},
                {"label": "Movement quality", "value": "81%"},
                {"label": "Recovery status", "value": "82%"},
            ],
            "insights": [
                "Landing mechanics show asymmetry during the final jump phase.",
                "Training load is trending upward with elevated fatigue markers.",
                "Recommended actions: mobility work, landing drill review, and reduced sprint volume.",
            ],
            "focus_areas": [
                "Injury risk score",
                "Performance trends",
                "Exercise recommendations",
                "Recovery tracking",
            ],
        },
        "coach": {
            "heading": "Coach team overview",
            "focus": "Monitor athlete risk distribution, performance trends, and intervention priorities across the squad.",
            "metrics": [
                {"label": "Team risk", "value": "31%"},
                {"label": "At-risk players", "value": "3"},
                {"label": "Load trend", "value": "+13%"},
            ],
            "insights": [
                "Two athletes are trending above threshold for landing-load stress.",
                "One player requires modified drills to protect hamstring recovery.",
                "Coach action: review sprint block and reduce unilateral explosive volume.",
            ],
            "focus_areas": [
                "Team risk overview",
                "Movement quality reports",
                "Training recommendations",
                "Athlete analytics",
            ],
        },
        "physiotherapist": {
            "heading": "Rehab and movement correction",
            "focus": "Track rehabilitation progress, landing symmetry, and return-to-play confidence for each athlete.",
            "metrics": [
                {"label": "Symmetry", "value": "88%"},
                {"label": "Mobility", "value": "84%"},
                {"label": "Return-to-play", "value": "72%"},
            ],
            "insights": [
                "Hip stability remains below target on the affected side.",
                "Landing mechanics improve after warm-up but regress near fatigue threshold.",
                "Planned intervention: progressive balance and single-leg control work.",
            ],
            "focus_areas": [
                "Rehabilitation tracking",
                "Movement correction analytics",
                "Injury monitoring",
                "Recovery reports",
            ],
        },
        "scientist": {
            "heading": "Biomechanics analytics",
            "focus": "Analyze pose quality, joint angles, asymmetry, and movement efficiency with high-resolution metrics.",
            "metrics": [
                {"label": "Knee valgus", "value": "16°"},
                {"label": "Stride efficiency", "value": "89%"},
                {"label": "Fatigue index", "value": "68"},
            ],
            "insights": [
                "Knee valgus increases during deceleration and cutting sequences.",
                "Asymmetry remains elevated during the final third of the drill cycle.",
                "Biomechanical model indicates an elevated ACL and hamstring loading risk profile.",
            ],
            "focus_areas": [
                "Biomechanical analytics",
                "Injury prediction insights",
                "Team performance trends",
                "Research reports",
            ],
        },
        "admin": {
            "heading": "Platform administration",
            "focus": "Review platform health, user access, system status, and report distribution across the organization.",
            "metrics": [
                {"label": "Active users", "value": "5"},
                {"label": "Platform health", "value": "98%"},
                {"label": "Deployments", "value": "3"},
            ],
            "insights": [
                "All role-based dashboards are operational and protected by auth checks.",
                "InfluxDB and app services are reporting healthy and connected.",
                "Platform readiness is strong; next milestone is report export and monitoring automation.",
            ],
            "focus_areas": [
                "User management",
                "Platform analytics",
                "System monitoring",
                "Report management",
            ],
        },
    }

    return {
        "user": user,
        "role": role_view,
        "summary": summary,
        "role_summary": role_summary.get(role_view, role_summary["athlete"]),
        "connected_systems": connected_systems,
        "athletes": DEFAULT_ATHLETES,
        "alerts": DEFAULT_ALERTS,
        "schema": INFLUX_SCHEMA,
        "workflow": [
            "User authentication & role access",
            "Athlete profile and training data",
            "Video ingestion and preprocessing",
            "Pose estimation and biomechanics analysis",
            "Risk scoring and corrective recommendations",
            "Coach/physio dashboards and reports",
        ],
    }


@app.get("/health")
def health_check():
    client = get_influx_client()
    return {
        "status": "ok",
        "service": "backend",
        "influx_configured": bool(client),
    }


@app.get("/api/info")
def info():
    return {
        "project": "Sports Injury Risk Detection",
        "description": "Frontend and backend workflow for injury risk detection from athlete movement video.",
        "mode": "non-ai prototype",
        "features": [
            "Authentication & role-based access",
            "Athlete management",
            "Video ingestion workflow",
            "Pose + movement analytics",
            "Risk dashboards and alerts",
        ],
    }


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "athlete"
    sport: str | None = None
    position: str | None = None


@app.post("/api/auth/login")
def login(payload: dict):
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    user = USER_DB.get(email)
    if not user or user["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(email)
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "firebase_uid": user.get("firebase_uid"),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "sport": user["sport"],
            "position": user["position"],
        },
    }


@app.post("/api/auth/signup")
def signup(payload: SignupRequest):
    email = payload.email.strip().lower()
    if not payload.name.strip() or not email or not payload.password:
        raise HTTPException(status_code=400, detail="Name, email and password are required")
    if email in USER_DB:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    role = payload.role.strip().lower() or "athlete"
    user = {
        "id": f"USR-{len(USER_DB) + 1:03d}",
        "firebase_uid": f"fb_{role}_{len(USER_DB) + 1:03d}",
        "name": payload.name.strip(),
        "email": email,
        "password": payload.password,
        "role": role,
        "sport": payload.sport or "General Performance",
        "position": payload.position or "Athlete",
    }
    USER_DB[email] = user

    token = create_token(email)
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "firebase_uid": user["firebase_uid"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "sport": user["sport"],
            "position": user["position"],
        },
    }


@app.get("/api/auth/me")
def me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}


@app.get("/api/dashboard")
def dashboard(role: str | None = None, authorization: str | None = Header(default=None, alias="Authorization")):
    if role is None:
        return build_dashboard_payload("athlete", None)

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    token = authorization.replace("Bearer ", "", 1).strip()
    claims = verify_token(token)
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    current_user = USER_DB.get(claims.get("email"))
    if not current_user:
        raise HTTPException(status_code=401, detail="Unknown user")

    requested_role = role
    allowed_roles = {current_user["role"], "admin"}
    if requested_role not in allowed_roles and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="You do not have access to this role dashboard")

    return build_dashboard_payload(requested_role, current_user)


@app.get("/api/athletes")
def athletes():
    return {"athletes": DEFAULT_ATHLETES}


@app.get("/api/athletes/{athlete_id}")
def athlete_detail(athlete_id: str):
    athlete = next((a for a in DEFAULT_ATHLETES if a["athlete_id"] == athlete_id), None)
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    trend_points = []
    base_time = datetime.now(timezone.utc) - timedelta(days=7)
    for i in range(7):
        point_time = base_time + timedelta(days=i)
        value = athlete["risk_score"] - 6 + (i % 3) * 2
        trend_points.append({"date": point_time.strftime("%Y-%m-%d"), "risk_score": max(18, min(94, value))})

    return {
        "athlete": athlete,
        "trend": trend_points,
        "recommendations": [
            "Add landing mechanics drills and single-leg balance work.",
            "Reduce sprint volume by 10% for the next training block.",
            "Monitor fatigue and recovery with weekly motion review.",
        ],
    }


@app.get("/api/influx/schema")
def influx_schema():
    return INFLUX_SCHEMA


@app.get("/api/influx/health")
def influx_health():
    client = get_influx_client()
    if not client:
        return {"configured": False, "bucket": None, "org": None, "message": "InfluxDB credentials not configured"}
    return {
        "configured": True,
        "bucket": os.getenv("INFLUX_BUCKET"),
        "org": os.getenv("INFLUX_ORG"),
        "url": os.getenv("INFLUX_URL"),
    }


@app.post("/api/influx/seed")
def seed_influx_demo():
    client = get_influx_client()
    if not client:
        raise HTTPException(status_code=400, detail="InfluxDB is not configured. Set INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, and INFLUX_BUCKET.")

    bucket = os.getenv("INFLUX_BUCKET")
    org = os.getenv("INFLUX_ORG")
    write_api = client.write_api(write_options=SYNCHRONOUS)

    start_time = datetime.now(timezone.utc) - timedelta(hours=12)
    count = 0

    for athlete in DEFAULT_ATHLETES:
        for i in range(8):
            point_time = start_time + timedelta(minutes=i * 20)
            point = (
                Point("movement_metrics")
                .tag("athlete_id", athlete["athlete_id"])
                .tag("sport", athlete["sport"])
                .tag("risk_level", athlete["risk_level"])
                .tag("side", "left" if i % 2 == 0 else "right")
                .tag("session_id", f"session-{i + 1}")
                .field("risk_score", athlete["risk_score"] + i)
                .field("movement_quality", athlete["movement_quality"] - (i % 3))
                .field("knee_valgus", 16 + i)
                .field("hip_stability", 82 + (i % 4))
                .field("trunk_lean", 8 + i * 0.8)
                .field("fatigue_index", athlete["fatigue_index"] + (i % 3) * 4)
                .field("training_load", athlete["training_load"] + i)
                .field("stride_length", 1.2 + (i * 0.08))
                .field("landing_mechanics", 82 + i)
                .field("cadence", 178 + i)
                .field("symmetry_index", athlete["symmetry_index"] - (i % 2))
                .time(point_time, WritePrecision.NS)
            )
            write_api.write(bucket=bucket, org=org, record=point)
            count += 1

    return {"status": "ok", "written_points": count, "bucket": bucket, "org": org}


class Athlete(BaseModel):
    athlete_id: str
    name: str
    sport: str
    position: str
    age: int | None = None
    injury_history: str | None = None


@app.post("/api/athlete")
def create_athlete(a: Athlete):
    payload = {
        "athlete_id": a.athlete_id,
        "name": a.name,
        "sport": a.sport,
        "position": a.position,
        "age": a.age,
        "risk_score": 42,
        "risk_level": "Moderate Risk",
        "movement_quality": 79,
        "injury_history": a.injury_history or "No prior major injury",
        "training_load": 60,
        "fatigue_index": 52,
        "symmetry_index": 90,
        "latest_alert": "New athlete intake stored successfully.",
    }
    DEFAULT_ATHLETES.insert(0, payload)

    client = get_influx_client()
    if client:
        bucket = os.getenv("INFLUX_BUCKET")
        org = os.getenv("INFLUX_ORG")
        write_api = client.write_api(write_options=SYNCHRONOUS)
        point = (
            Point("movement_metrics")
            .tag("athlete_id", a.athlete_id)
            .tag("sport", a.sport)
            .tag("risk_level", "Moderate Risk")
            .tag("side", "left")
            .tag("session_id", "baseline")
            .field("risk_score", 42)
            .field("movement_quality", 79)
            .field("knee_valgus", 15)
            .field("hip_stability", 80)
            .field("trunk_lean", 7)
            .field("fatigue_index", 52)
            .field("training_load", 60)
            .field("stride_length", 1.4)
            .field("landing_mechanics", 78)
            .field("cadence", 176)
            .field("symmetry_index", 90)
            .time(datetime.now(timezone.utc), WritePrecision.NS)
        )
        write_api.write(bucket=bucket, org=org, record=point)

    return {"status": "created", "athlete": payload}

