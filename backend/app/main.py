from datetime import datetime, timedelta, timezone
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="Sports Injury Risk Detection - Backend")

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


def build_dashboard_payload() -> dict[str, Any]:
    summary = {
        "total_athletes": len(DEFAULT_ATHLETES),
        "high_risk": sum(1 for a in DEFAULT_ATHLETES if a["risk_level"] in {"High Risk", "Critical Risk"}),
        "average_risk_score": round(sum(a["risk_score"] for a in DEFAULT_ATHLETES) / len(DEFAULT_ATHLETES), 1),
        "alert_count": len(DEFAULT_ALERTS),
    }

    return {
        "summary": summary,
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


@app.get("/api/dashboard")
def dashboard():
    return build_dashboard_payload()


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

