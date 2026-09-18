"""Database persistence for MotionGuard with MongoDB support and resilient SQLite fallback."""
from __future__ import annotations

import hashlib
import json
import logging
import os
import sqlite3
import uuid
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

logger = logging.getLogger("motionguard.database")

DB_PATH = Path(__file__).resolve().parent / "motionguard.db"
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "motionguard")

_mongo_client = None
_mongo_db = None
_use_mongo = False


def _init_mongo():
    global _mongo_client, _mongo_db, _use_mongo
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        # Test connection
        client.admin.command("ping")
        _mongo_client = client
        _mongo_db = client[MONGODB_DB_NAME]
        _use_mongo = True
        logger.info(f"Connected to MongoDB at {MONGODB_URI} [DB: {MONGODB_DB_NAME}]")
    except Exception as exc:
        _use_mongo = False
        logger.warning(f"MongoDB not reachable ({exc}). Falling back to local SQLite at {DB_PATH}.")


def get_database_status() -> dict[str, Any]:
    return {
        "engine": "mongodb" if _use_mongo else "sqlite",
        "mongo_uri": MONGODB_URI if _use_mongo else None,
        "mongo_db": MONGODB_DB_NAME if _use_mongo else None,
        "sqlite_path": str(DB_PATH) if not _use_mongo else None,
    }


def _sqlite_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


DEFAULT_ATHLETE_PROFILE = {
    "userId": "demo-athlete-id",
    "height": "178",
    "weight": "72",
    "bmi": "22.7",
    "dominantSide": "Right",
    "gender": "Female",
    "bodyMeasurements": "",
    "primarySport": "Soccer",
    "secondarySport": "Athletics",
    "playingPosition": "Forward",
    "competitiveLevel": "Collegiate",
    "yearsExperience": "5 years",
    "trainingDaysPerWeek": "5 days/week",
    "averageTrainingDuration": "90 minutes",
    "hasPreviousInjury": False,
    "injuries": [],
    "coachEmail": "coach@motionguard.local",
    "coachId": "MG-COACH-101",
    "coachInvitationStatus": "Accepted",
}

DEFAULT_COACH_PROFILE = {
    "userId": "demo-coach-id",
    "name": "Coach Marcus",
    "email": "coach@motionguard.local",
    "phone": "+1 555-019-2834",
    "country": "United States",
    "specialty": "Soccer & Athletic Conditioning",
    "organization": "Metro Athletics Club",
    "certification": "USSF A-Senior / CSCS",
    "yearsExperience": "12 years",
    "coachId": "MG-COACH-101",
    "bio": "Specialized in biomechanical injury risk reduction and high-performance athletic development.",
}


def initialize() -> None:
    _init_mongo()

    # Always ensure SQLite schema exists as fallback / cache
    with _sqlite_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL, role TEXT NOT NULL, data TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS athlete_profiles (
                user_id TEXT PRIMARY KEY, data TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS coach_profiles (
                user_id TEXT PRIMARY KEY, data TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY, athlete_id TEXT NOT NULL, created_at TEXT NOT NULL,
                data TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_analyses_athlete ON analyses(athlete_id, created_at DESC);
        """)

    # Seed demo users if they don't exist
    demo_users = [
        {
            "id": "demo-athlete-id",
            "name": "Alex Morgan",
            "email": "athlete@motionguard.local",
            "password_hash": _hash_password("password123"),
            "role": "athlete",
            "data": {
                "id": "demo-athlete-id",
                "name": "Alex Morgan",
                "email": "athlete@motionguard.local",
                "role": "athlete",
                "country": "United States",
                "dateOfBirthOrAge": "24",
                "phone": "+1 555-014-9922",
                "emailVerified": True,
            },
        },
        {
            "id": "demo-coach-id",
            "name": "Coach Marcus",
            "email": "coach@motionguard.local",
            "password_hash": _hash_password("password123"),
            "role": "coach",
            "data": {
                "id": "demo-coach-id",
                "name": "Coach Marcus",
                "email": "coach@motionguard.local",
                "role": "coach",
                "country": "United States",
                "phone": "+1 555-019-2834",
                "emailVerified": True,
            },
        },
        {
            "id": "demo-admin-id",
            "name": "System Admin",
            "email": "admin@motionguard.local",
            "password_hash": _hash_password("password123"),
            "role": "admin",
            "data": {
                "id": "demo-admin-id",
                "name": "System Admin",
                "email": "admin@motionguard.local",
                "role": "admin",
                "emailVerified": True,
            },
        },
    ]

    # Seed in SQLite
    with _sqlite_conn() as conn:
        for u in demo_users:
            conn.execute(
                "INSERT OR IGNORE INTO users (id, name, email, password_hash, role, data) VALUES (?, ?, ?, ?, ?, ?)",
                (u["id"], u["name"], u["email"], u["password_hash"], u["role"], json.dumps(u["data"])),
            )
        conn.execute(
            "INSERT OR IGNORE INTO athlete_profiles (user_id, data) VALUES (?, ?)",
            ("demo-athlete-id", json.dumps(DEFAULT_ATHLETE_PROFILE)),
        )
        conn.execute(
            "INSERT OR IGNORE INTO coach_profiles (user_id, data) VALUES (?, ?)",
            ("demo-coach-id", json.dumps(DEFAULT_COACH_PROFILE)),
        )

    # Seed in MongoDB if active
    if _use_mongo and _mongo_db is not None:
        try:
            _mongo_db.users.create_index("email", unique=True)
            _mongo_db.athlete_profiles.create_index("userId", unique=True)
            _mongo_db.coach_profiles.create_index("userId", unique=True)
            _mongo_db.analyses.create_index([("athleteId", 1), ("createdAt", -1)])

            for u in demo_users:
                _mongo_db.users.update_one(
                    {"email": u["email"]},
                    {"$setOnInsert": {**u["data"], "password_hash": u["password_hash"]}},
                    upsert=True,
                )
            _mongo_db.athlete_profiles.update_one(
                {"userId": "demo-athlete-id"},
                {"$setOnInsert": DEFAULT_ATHLETE_PROFILE},
                upsert=True,
            )
            _mongo_db.coach_profiles.update_one(
                {"userId": "demo-coach-id"},
                {"$setOnInsert": DEFAULT_COACH_PROFILE},
                upsert=True,
            )
        except Exception as err:
            logger.error(f"Error seeding MongoDB: {err}")


def register_user(payload: dict[str, Any]) -> dict[str, Any]:
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    name = str(payload.get("name", "")).strip()
    role = str(payload.get("role", "")).strip()

    if not email or not password or not name:
        raise ValueError("Name, email, and password are required.")
    if role not in {"athlete", "coach", "admin"}:
        raise ValueError("Role must be athlete, coach, or admin.")

    user_id = str(uuid.uuid4())
    public_data = {key: value for key, value in payload.items() if key != "password"}
    public_data.update({"id": user_id, "name": name, "email": email, "role": role, "emailVerified": False})
    pwd_hash = _hash_password(password)

    if _use_mongo and _mongo_db is not None:
        existing = _mongo_db.users.find_one({"email": email})
        if existing:
            raise ValueError("An account with this email already exists.")
        _mongo_db.users.insert_one({**public_data, "password_hash": pwd_hash})
    else:
        with _sqlite_conn() as conn:
            try:
                conn.execute(
                    "INSERT INTO users (id, name, email, password_hash, role, data) VALUES (?, ?, ?, ?, ?, ?)",
                    (user_id, name, email, pwd_hash, role, json.dumps(public_data)),
                )
            except sqlite3.IntegrityError as exc:
                raise ValueError("An account with this email already exists.") from exc

    # If it's an athlete, also initialize a blank or default profile so it's ready
    if role == "athlete":
        save_profile(user_id, {
            "userId": user_id,
            "height": payload.get("height", ""),
            "weight": payload.get("weight", ""),
            "bmi": "",
            "dominantSide": "",
            "gender": payload.get("gender", ""),
            "primarySport": payload.get("primarySport", ""),
            "playingPosition": "",
            "competitiveLevel": "Amateur",
            "yearsExperience": "",
            "trainingDaysPerWeek": "",
            "averageTrainingDuration": "",
            "hasPreviousInjury": False,
            "injuries": [],
            "coachEmail": "",
            "coachId": "",
            "coachInvitationStatus": "Pending",
        })
    elif role == "coach":
        save_coach_profile(user_id, {
            "userId": user_id,
            "name": name,
            "email": email,
            "specialty": "",
            "organization": "",
            "certification": "",
            "yearsExperience": "",
            "coachId": f"MG-COACH-{user_id[:6].upper()}",
            "bio": "",
        })

    return public_data


def login_user(email: str, password: str) -> dict[str, Any] | None:
    norm_email = email.strip().lower()
    pwd_hash = _hash_password(password)

    if _use_mongo and _mongo_db is not None:
        user_doc = _mongo_db.users.find_one({"email": norm_email})
        if user_doc and user_doc.get("password_hash") == pwd_hash:
            user_doc.pop("password_hash", None)
            user_doc.pop("_id", None)
            return user_doc
        return None

    with _sqlite_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (norm_email,)).fetchone()
    if row is None or row["password_hash"] != pwd_hash:
        return None
    data = json.loads(row["data"])
    data.update({"id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"]})
    return data


def get_user(user_id: str) -> dict[str, Any] | None:
    if _use_mongo and _mongo_db is not None:
        doc = _mongo_db.users.find_one({"id": user_id})
        if doc:
            doc.pop("password_hash", None)
            doc.pop("_id", None)
            return doc
        return None

    with _sqlite_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        return None
    data = json.loads(row["data"])
    data.update({"id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"]})
    return data


def update_user(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    allowed = {"name", "country", "dateOfBirthOrAge", "phone", "emailVerified"}
    updates = {k: v for k, v in payload.items() if k in allowed}

    if _use_mongo and _mongo_db is not None:
        _mongo_db.users.update_one({"id": user_id}, {"$set": updates})
        return get_user(user_id) or payload

    with _sqlite_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise ValueError("User not found.")
        data = json.loads(row["data"])
        data.update(updates)
        new_name = updates.get("name", row["name"])
        conn.execute(
            "UPDATE users SET name = ?, data = ? WHERE id = ?",
            (new_name, json.dumps(data), user_id),
        )
    return {**data, "id": user_id, "name": new_name, "email": row["email"], "role": row["role"]}


def get_profile(user_id: str) -> dict[str, Any] | None:
    if _use_mongo and _mongo_db is not None:
        doc = _mongo_db.athlete_profiles.find_one({"userId": user_id})
        if doc:
            doc.pop("_id", None)
            return doc
        # Return fallback for demo athlete
        if user_id == "demo-athlete-id":
            return DEFAULT_ATHLETE_PROFILE
        return None

    with _sqlite_conn() as conn:
        row = conn.execute("SELECT data FROM athlete_profiles WHERE user_id = ?", (user_id,)).fetchone()
    if row:
        return json.loads(row["data"])
    if user_id == "demo-athlete-id":
        return DEFAULT_ATHLETE_PROFILE
    return None


def save_profile(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    value = {**payload, "userId": user_id}

    if _use_mongo and _mongo_db is not None:
        _mongo_db.athlete_profiles.update_one(
            {"userId": user_id},
            {"$set": value},
            upsert=True,
        )

    # Always mirror to SQLite for backup
    with _sqlite_conn() as conn:
        conn.execute(
            "INSERT INTO athlete_profiles (user_id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) "
            "ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP",
            (user_id, json.dumps(value)),
        )
    return value


def get_coach_profile(user_id: str) -> dict[str, Any] | None:
    if _use_mongo and _mongo_db is not None:
        doc = _mongo_db.coach_profiles.find_one({"userId": user_id})
        if doc:
            doc.pop("_id", None)
            return doc
        if user_id == "demo-coach-id":
            return DEFAULT_COACH_PROFILE
        return None

    with _sqlite_conn() as conn:
        row = conn.execute("SELECT data FROM coach_profiles WHERE user_id = ?", (user_id,)).fetchone()
    if row:
        return json.loads(row["data"])
    if user_id == "demo-coach-id":
        return DEFAULT_COACH_PROFILE
    return None


def save_coach_profile(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    value = {**payload, "userId": user_id}

    if _use_mongo and _mongo_db is not None:
        _mongo_db.coach_profiles.update_one(
            {"userId": user_id},
            {"$set": value},
            upsert=True,
        )

    with _sqlite_conn() as conn:
        conn.execute(
            "INSERT INTO coach_profiles (user_id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) "
            "ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP",
            (user_id, json.dumps(value)),
        )
    return value


def save_analysis(payload: dict[str, Any]) -> dict[str, Any]:
    analysis_id = str(payload.get("id") or uuid.uuid4())
    athlete_id = str(payload.get("athleteId", ""))
    if not athlete_id:
        raise ValueError("athleteId is required.")
    value = {**payload, "id": analysis_id, "athleteId": athlete_id}

    if _use_mongo and _mongo_db is not None:
        _mongo_db.analyses.update_one(
            {"id": analysis_id},
            {"$set": value},
            upsert=True,
        )

    with _sqlite_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO analyses (id, athlete_id, created_at, data) VALUES (?, ?, CURRENT_TIMESTAMP, ?)",
            (analysis_id, athlete_id, json.dumps(value)),
        )
    return value


def list_analyses(athlete_id: str | None = None) -> list[dict[str, Any]]:
    if _use_mongo and _mongo_db is not None:
        query = {"athleteId": athlete_id} if athlete_id else {}
        cursor = _mongo_db.analyses.find(query).sort("createdAt", -1)
        results = []
        for doc in cursor:
            doc.pop("_id", None)
            results.append(doc)
        if results:
            return results
        # If specific athlete_id produced no results, fallback to all analyses if any exist
        if athlete_id:
            fallback_cursor = _mongo_db.analyses.find({}).sort("createdAt", -1)
            for doc in fallback_cursor:
                doc.pop("_id", None)
                results.append(doc)
            if results:
                return results

    with _sqlite_conn() as conn:
        if athlete_id:
            rows = conn.execute("SELECT data FROM analyses WHERE athlete_id = ? ORDER BY created_at DESC", (athlete_id,)).fetchall()
            if not rows:
                # If specific athlete_id produced no records, fallback to all analyses in db
                rows = conn.execute("SELECT data FROM analyses ORDER BY created_at DESC").fetchall()
        else:
            rows = conn.execute("SELECT data FROM analyses ORDER BY created_at DESC").fetchall()
    return [json.loads(row["data"]) for row in rows]


def list_users() -> list[dict[str, Any]]:
    if _use_mongo and _mongo_db is not None:
        users = []
        for doc in _mongo_db.users.find():
            doc.pop("_id", None)
            doc.pop("password_hash", None)
            users.append(doc)
        return users

    with _sqlite_conn() as conn:
        rows = conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    users = []
    for row in rows:
        data = json.loads(row["data"])
        data.update({"id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"]})
        users.append(data)
    return users


def dashboard_stats() -> dict[str, int]:
    if _use_mongo and _mongo_db is not None:
        total_users = _mongo_db.users.count_documents({})
        athletes = _mongo_db.users.count_documents({"role": "athlete"})
        coaches = _mongo_db.users.count_documents({"role": "coach"})
        analyses = _mongo_db.analyses.count_documents({})
        return {"totalUsers": total_users, "athletes": athletes, "coaches": coaches, "analyses": analyses}

    with _sqlite_conn() as conn:
        total_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        athletes = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'athlete'").fetchone()[0]
        coaches = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'coach'").fetchone()[0]
        analyses = conn.execute("SELECT COUNT(*) FROM analyses").fetchone()[0]
    return {"totalUsers": total_users, "athletes": athletes, "coaches": coaches, "analyses": analyses}


def coach_athletes(coach_id: str, coach_email: str) -> list[dict[str, Any]]:
    all_profiles: list[dict[str, Any]] = []
    all_users: dict[str, dict[str, Any]] = {}
    analyses_list: list[dict[str, Any]] = []

    if _use_mongo and _mongo_db is not None:
        for p in _mongo_db.athlete_profiles.find():
            p.pop("_id", None)
            all_profiles.append(p)
        for u in _mongo_db.users.find({"role": "athlete"}):
            u.pop("_id", None)
            u.pop("password_hash", None)
            all_users[u["id"]] = u
        for a in _mongo_db.analyses.find():
            a.pop("_id", None)
            analyses_list.append(a)
    else:
        with _sqlite_conn() as conn:
            p_rows = conn.execute("SELECT user_id, data FROM athlete_profiles").fetchall()
            all_profiles = [json.loads(r["data"]) for r in p_rows]
            u_rows = conn.execute("SELECT * FROM users WHERE role = 'athlete'").fetchall()
            for r in u_rows:
                ud = json.loads(r["data"])
                ud.update({"id": r["id"], "name": r["name"], "email": r["email"], "role": r["role"]})
                all_users[r["id"]] = ud
            a_rows = conn.execute("SELECT athlete_id, data FROM analyses ORDER BY created_at DESC").fetchall()
            analyses_list = [json.loads(r["data"]) for r in a_rows]

    latest: dict[str, dict[str, Any]] = {}
    for a in analyses_list:
        aid = a.get("athleteId")
        if aid and aid not in latest:
            latest[aid] = a

    result = []
    for profile in all_profiles:
        uid = profile.get("userId")
        linked = (
            profile.get("coachId") == coach_id
            or str(profile.get("coachEmail", "")).lower() == coach_email.lower()
            # If demo coach, also include demo athlete by default for rich preview
            or (coach_id == "demo-coach-id" and uid == "demo-athlete-id")
        )
        if not linked:
            continue
        user = all_users.get(uid) or {
            "id": uid,
            "name": "Alex Morgan" if uid == "demo-athlete-id" else "Athlete",
        }
        analysis = latest.get(uid, {})
        result.append({
            "id": user["id"],
            "name": user.get("name", "Athlete"),
            "sport": profile.get("primarySport") or "Soccer",
            "position": profile.get("playingPosition") or "Forward",
            "risk": analysis.get("riskLevel", "Low"),
            "riskScore": analysis.get("riskScore"),
            "lastAnalysis": analysis.get("date", "No analysis"),
            "status": profile.get("coachInvitationStatus", "Accepted"),
        })
    return result
