# Small production deployment (3–4 invited internship users)

This configuration serves the real application with PostgreSQL, a sequential video
worker, persistent storage and HTTPS. It is a single-server deployment with planned
maintenance downtime, not a highly available service or a clinically validated
injury prediction system. The separate Random Forest experiment is unchanged.

## Host and cost

Use a Linux **x86-64** machine with Docker Compose v2, approximately 4 GB RAM,
2 CPU cores and at least 10 GB of free disk for images, database and backups.
These are starting requirements; measure usage on the chosen host. The tested
MediaPipe wheel is architecture-specific: do not assume an ARM free VM works.

The most practical zero-hosting-fee option is an institution-provided VM or an
existing always-on computer with permission to host it. Public access also needs
a DNS hostname and incoming TCP 80/443. Electricity, connectivity and an optional
domain may still have costs. Free cloud capacity and uptime are not guaranteed.
Oracle's Always Free compute may be reclaimed when idle; verify architecture,
capacity and current eligibility before selecting it:
https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

## First deployment

Work from the approved `samitha-muthyala` checkout. Do not combine the production
Compose file with `docker-compose.yml`; development containers and volumes are separate.

1. Copy `.env.production.example` to `.env.production` on the server. Generate
   independent random passwords, e.g. `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
   Set `POSTGRES_PASSWORD`, `JWT_SECRET_KEY`, `APP_DOMAIN` (hostname only), and
   `REGISTRATION_EMAILS` (the exact invited emails). Keep the file private; never
   put these secrets in frontend build variables or Git.
2. Point DNS to the server. Permit 80/443 publicly and restrict SSH to the operator.
   The database and API have no host ports. Caddy handles certificates and renewals:
   https://caddyserver.com/docs/automatic-https
3. Validate and launch:

   ```sh
   docker compose --env-file .env.production -f compose.production.yml config --quiet
   docker compose --env-file .env.production -f compose.production.yml up -d --build
   docker compose --env-file .env.production -f compose.production.yml ps
   ```

   The one-shot `migrate` service initializes the current schema and extends the
   existing video-status enum before API/worker startup. This is additive setup,
   not a general migration framework. Future column changes require explicit,
   versioned migration scripts and a restore-tested backup before rollout.
4. Bootstrap the first administrator interactively:

   ```sh
   docker compose --env-file .env.production -f compose.production.yml exec backend python scripts/create_admin.py
   ```

5. Generate a 48-hour invitation for each allowed email and its approved role:

   ```sh
   docker compose --env-file .env.production -f compose.production.yml exec backend python -m app.invite athlete@example.com athlete
   ```

   Deliver the code privately. The recipient enters it on registration. Codes
   cannot be used to log in, claim a different email or select a different role.
   Supported roles: `athlete`, `coach`, `physiotherapist`, `sports_scientist`.
   Empty `REGISTRATION_EMAILS` closes registration. This controlled onboarding
   does not implement public email verification or automated password recovery.
   Staff can access athletes they link by email; invite only trusted internship
   staff. An athlete-approval workflow is required before wider public enrollment.

## Processing and resource limits

- 50 MB files, 30-second clips, at most 300 sampled frames, resized to 1280 pixels.
  Frames stream into pose estimation so the entire decoded video is not held in memory.
- Two unfinished analyses per athlete and ten globally. Queue admission is
  serialized in PostgreSQL, including concurrent uploads.
- One dedicated worker, one subprocess per video, ten-minute timeout. The worker
  takes a PostgreSQL advisory lock so another worker cannot consume the same queue.
  Interrupted nonterminal jobs are cleared and reprocessed after restart.
- Production raw uploads are retained for authenticated video/pose-overlay playback.
  Monitor storage and back up these videos along with the database. Setting
  `DELETE_PROCESSED_UPLOADS=true` removes terminal uploads and disables their playback.
  Previously deleted videos must be uploaded again; reports remain in PostgreSQL.
- Storage is capped at admission (2 GB plus disk free-space reserve). Container
  memory/CPU and log rotation limits are defined in the production Compose file.
- Authentication endpoints share 30 POST attempts per minute in the single API
  process. This small-installation limit resets on restart. Do not scale the API
  or worker without revisiting locking, distributed throttling and storage.
- General pipeline failures return a safe message; detailed errors remain in logs.

## Operations and backup

Check `/api/health` for API liveness and `/api/ready` for schema/database/model
readiness. Worker health must also be checked through Compose status and logs:

```sh
docker compose --env-file .env.production -f compose.production.yml logs --tail 100 backend worker
docker stats --no-stream
python scripts/backup.py --env-file .env.production
```

The backup script briefly stops the frontend and worker, snapshots PostgreSQL and
queued uploads, writes SHA-256 hashes, then restarts only services that were
running. Run it daily and before upgrades. Copy the backup securely off the host;
the local copy alone does not protect against disk loss. Keep backup access limited
because it includes personal profile and movement data. A directory without a
manifest is an incomplete backup and must not be used.

For a restore drill, create a **new database or isolated Compose project**, restore
`database.dump` using `pg_restore --exit-on-error --no-owner`, and restore the upload
archive into that project's uploads volume. Use the same `/app/uploads` mount path.
Confirm user/video counts and ownership checks before any real recovery. Never run
`pg_restore --clean` against the live database or `docker compose down -v` to upgrade.

For an upgrade: back up, build the new images, run additive migrations, recreate
services, then verify readiness and a short video. Keep the previous image IDs and
backup so code/database can be restored together if compatibility changes.

## Release checks

Install `backend/requirements-dev.txt` in a separate test environment. Run:

```sh
cd backend
python -m pytest tests/test_biomechanics.py tests/test_pose_estimation.py tests/test_pipeline.py tests/test_risk_scoring.py tests/test_production.py tests/test_security_and_api.py
cd ../frontend
npm ci
npm run build
npm run lint
npm audit --omit=dev
```

`test_ml_model.py` retrains and overwrites a model artifact, so it is intentionally
excluded from deployment regression tests. No Random Forest integration is needed.

Before inviting real users, verify on the actual hostname: trusted HTTPS, browser
console, registration/login, two valid clips, no-person and corrupt clips, history,
cross-account denial, worker restart, backup restoration and resource usage. Keep
an operator available to handle failed jobs and account requests. The current
assessment and recommendations must not be presented as medical diagnosis or
validated injury probability across all sports.
