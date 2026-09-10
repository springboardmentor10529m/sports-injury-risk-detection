# Production preparation verification — 2026-09-09

Scope: a private internship installation for 3–4 invited users, one API process,
one video worker and PostgreSQL. This is a locally verified deployment package;
no public host, DNS name or publicly trusted certificate has been provisioned.

## Verified behavior

| Check | Evidence |
| --- | --- |
| Backend regressions | 63 focused tests pass on Windows and inside the final Linux production image. |
| Production image builds | Backend and static frontend/Caddy images build successfully. |
| PostgreSQL startup | Isolated production Compose project initializes schema; readiness passes. |
| Registration and login | Email/role-scoped invitations, JSON login and authenticated profile access pass. |
| Video processing | Two uploads of the original full movement clip complete with pose, biomechanics, risk and recommendations. |
| Pose quality | No-person clip returns `insufficient_data`, with no risk score or recommendations. |
| Corrupt upload | Final-image check returns a safe `failed` outcome without a risk result or internal filesystem path. |
| Recovery | A running job completes after restarting the worker. |
| Concurrency | Two simultaneous uploads are admitted; excess pending work returns HTTP 429. |
| Ownership | Another athlete cannot retrieve the first athlete's video or pose data. |
| Browser | Headless Edge login, file upload, Result pose canvas, risk category, recommendations and history pass. No browser console errors, page exceptions or HTTP 5xx were recorded. |
| Backup and restore | Backup hashes verify; restore into a new test database matches 2 users and 12 analyses. Two queued video files restore into a separate directory. Queued jobs complete after restarting the worker. |
| Dependencies | npm production audit: zero reported vulnerabilities. Updated backend container dependency audit: zero known vulnerabilities. |
| Memory | Observed worker peak approximately 459 MiB for the short test clips. Longer or different clips can use more resources. |
| Git | Work remains uncommitted and unstaged on `samitha-muthyala`; existing experiments are preserved. No push or main-branch changes. |
| Existing ML artifact | Working file and HEAD Git object hashes match (`83af32fccfb5754eb1ed8f87e5b61932f1f801ca`). Random Forest training tests were excluded because they overwrite the artifact. |

The verification stack uses its own `injuryguard-verification` project, database,
volumes and loopback-only port 8180. Existing development containers and their
data were not used for mutations. Video fixtures were read from the existing
uploads directory; test copies were uploaded into the isolated stack.
The temporary verification stack is stopped after the checks; its volumes and
ignored backup artifacts are retained for inspection.

## Changed files

| Area | Files |
| --- | --- |
| Deployment | `compose.production.yml`, `.env.production.example`, `.gitignore`, `backend/Dockerfile.production`, `backend/.dockerignore`, `frontend/Dockerfile.production`, `frontend/.dockerignore`, `frontend/Caddyfile` |
| Runtime/configuration | `backend/app/core/config.py`, `backend/app/core/database.py`, `backend/app/core/schema.py`, `backend/app/core/request_limits.py`, `backend/app/main.py` |
| Authentication | `backend/app/core/security.py`, `backend/app/routers/auth.py`, `backend/app/schemas.py`, `backend/app/invite.py`, `backend/app/services/notifications.py` |
| Video queue and processing | `backend/app/routers/video.py`, `backend/app/worker.py`, `backend/app/services/jobs.py`, `backend/app/services/pipeline.py`, `backend/app/services/pose_estimation.py`, `backend/app/video_processing/frame_extractor.py` |
| Frontend integration | `frontend/src/api/client.js`, `frontend/src/pages/Analyze.jsx`, `frontend/src/pages/Register.jsx`, `frontend/src/pages/StaffRegister.jsx`, `frontend/src/pages/Result.jsx` |
| Dependencies/tests | `backend/requirements.txt`, `backend/requirements-dev.txt`, `backend/tests/test_production.py`, `backend/tests/test_security_and_api.py`, `.github/workflows/production-checks.yml` |
| Operations/docs | `scripts/backup.py`, `docs/PRODUCTION.md`, `docs/PRODUCTION_VERIFICATION.md` |

The existing development Dockerfiles and `docker-compose.yml` are preserved.
The local `.venv` directory contains ignored test tools, fixtures, reports and
temporary verification credentials. These must not be staged or published.

## Remaining deployment steps and limits

1. Supply a suitable host and hostname. An institution-provided Linux x86-64 VM
   or an existing always-on machine is a practical option without a hosting fee.
2. Set real production secrets and allowed emails; generate invitations and
   deliver them privately. Do not reuse verification credentials.
3. Launch the production stack on that host and verify public HTTPS, connectivity,
   browser behavior and representative clips there. Public certificate issuance
   and renewal have not been tested against a real domain.
4. Schedule backups, keep a protected copy off the host and monitor service health
   and disk usage. Only the local backup/restore drill has been performed.
5. Existing frontend lint warnings (8) and a roughly 736 kB JavaScript bundle
   warning remain. Backend tests report dependency/API deprecation warnings.
   CI is configured but has not been run on GitHub because nothing was pushed.
6. This is a controlled, single-server installation. Public self-service password
   recovery, email verification, athlete approval of staff links, high availability
   and broad sports/clinical validation are outside this release. Do not open
   registration to an unrestricted public audience.

Deployment and operating instructions: [PRODUCTION.md](PRODUCTION.md).
