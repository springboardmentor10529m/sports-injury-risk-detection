"""Consistent database + queued-upload backup for the production Compose stack.

Run on the host: python scripts/backup.py --env-file .env.production
The frontend and worker are briefly stopped, then restored to their prior state.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess


def backup(compose, destination):
    destination.mkdir(parents=True, exist_ok=False, mode=0o700)
    running = subprocess.check_output(compose + ["ps", "--status", "running", "--services"], text=True).split()
    paused = [service for service in ("frontend", "worker") if service in running]
    try:
        if paused:
            subprocess.run(compose + ["stop", *paused], check=True)
        commands = {
            "database.dump": ["exec", "-T", "postgres", "pg_dump", "-U", "injuryguard", "-d", "injury_guard", "-Fc"],
            "uploads.tar.gz": ["exec", "-T", "backend", "tar", "-C", "/app/uploads", "-czf", "-", "."],
        }
        manifest = {"created_at": datetime.now(timezone.utc).isoformat(), "files": {}}
        for name, command in commands.items():
            target = destination / name
            with target.open("xb") as output:
                subprocess.run(compose + command, stdout=output, check=True)
            with target.open("rb") as source:
                manifest["files"][name] = hashlib.file_digest(source, "sha256").hexdigest()
        (destination / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        print(f"Backup complete: {destination}")
    finally:
        if paused:
            subprocess.run(compose + ["start", *paused], check=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", default=".env.production")
    parser.add_argument("--project", default="injuryguard-production")
    parser.add_argument("--override", help="Optional Compose override used for isolated verification")
    parser.add_argument("--destination", default="backups/" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
    args = parser.parse_args()
    command = ["docker", "compose", "--env-file", args.env_file, "-p", args.project, "-f", "compose.production.yml"]
    if args.override:
        command += ["-f", args.override]
    backup(command, Path(args.destination))
