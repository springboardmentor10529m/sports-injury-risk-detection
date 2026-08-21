# API Contracts

Base URL: `/api/v1`

## Authentication

All endpoints (except auth) require a JWT Bearer token in the Authorization header.

## Response Formats

**Success:** JSON payload specific to the endpoint.
**Error:** `{ "detail": "string", "error_code": "string", "status_code": int }`
**Pagination:** `{ "items": [], "total": int, "page": int, "per_page": int }`

## Endpoints Summary

| Method | Path | Roles Allowed | Description |
|---|---|---|---|
| POST | `/auth/login` | All | Authenticate user |
| GET | `/users/me` | All | Get current user profile |
| GET | `/athletes` | Admin, Coach, Physio, Scientist | List athletes |
| POST | `/videos/upload` | Athlete, Admin, Physio, Scientist | Upload a video |
| GET | `/videos/{id}` | All (if owner/permitted) | Get video details |
| POST | `/analysis/{video_id}/start` | System | Trigger analysis pipeline |
| GET | `/analysis/{video_id}/results` | All (if owner/permitted) | Get analysis results |
| GET | `/risk-scores/{athlete_id}` | All (if owner/permitted) | Get composite risk score |
