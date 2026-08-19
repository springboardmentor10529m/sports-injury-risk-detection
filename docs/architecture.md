# System Architecture & Technical Specification

This document details the architectural design, component flow, security model, and data management pipelines of the **Sports Injury Risk Detection System**.

---

## 🏗️ High-Level System Architecture

The application follows a decoupled client-server architecture with a Single Page Application (SPA) frontend, a RESTful FastAPI backend, and a PostgreSQL relational database.

```mermaid
graph TD
    subgraph Client Layer [Frontend - React SPA]
        A[Browser UI / React] -->|HTTPS Requests| B[Axios HTTP Client]
        B -->|Bearer JWT Header| C[Auth Context & LocalStorage]
        A -->|allowedRoles Check| R[ProtectedRoute & Role Guard]
    end

    subgraph API Layer [Backend - FastAPI]
        D[FastAPI Router] -->|Dependency Injection| E[get_current_user Auth Guard]
        E -->|Role Validation| F[require_role / require_roles Dependency]
        D -->|JSON / Multipart Payload| G[Pydantic v2 Schemas]
    end

    subgraph Service & ORM Layer
        G --> H[SQLAlchemy 2.0 ORM]
        H --> I[Session Management / Connection Pool]
    end

    subgraph Data Layer [Database - PostgreSQL]
        I --> J[(PostgreSQL Database)]
        J --> K[users table & user_role_enum]
        J --> L[athletes table]
        J --> M[videos table BYTEA]
    end

    B -->|REST Calls| D
```

---

## 🔐 1. Authentication & Security Flow (JWT & RBAC)

The system implements stateless JWT authentication combined with database-authoritative Role-Based Access Control (RBAC).

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Frontend (React)
    participant API as FastAPI Backend
    participant Security as Core Security (Argon2id/JWT)
    participant DB as PostgreSQL DB

    User->>Client: Enter Email & Password
    Client->>API: POST /api/v1/auth/login (OAuth2 Form Data)
    API->>DB: Query User by Email
    DB-->>API: Return User Record & Argon2 Hash
    API->>Security: verify_password(plaintext, hash)
    Security-->>API: Password Validated
    API->>Security: create_access_token(sub=user_id, role=role)
    Security-->>API: Signed JWT Bearer Token
    API-->>Client: Return TokenResponse { access_token, token_type }
    Client->>Client: Store access_token in localStorage

    Note over Client, DB: Subsequent Authenticated Requests
    Client->>API: GET /api/v1/athletes/me (Authorization: Bearer <token>)
    API->>Security: decode_access_token(token)
    Security-->>API: Validated Payload (sub=user_id)
    API->>DB: Query User by user_id (Authoritative State)
    DB-->>API: Return User Record
    API->>API: Verify Role Capabilities (require_role / require_roles)
    API-->>Client: Return Requested Resource (200 OK)
```

### Key Security Mechanics:
1. **Password Hashing**: Passwords are saved strictly using the **Argon2id** algorithm (`argon2-cffi`).
2. **User Enumeration Defense**: The login handler executes constant-time hash verifications even when an email address is not found in the database.
3. **Database Authoritative Roles**: Roles (`Athlete`, `Coach`, `Physiotherapist`, `Sports Scientist`, `Administrator`) are re-verified against PostgreSQL on every request via `get_current_user` rather than trusting payload claims blindly.
4. **Forbidden Administrator Registration**: Self-registration for the `Administrator` role is explicitly rejected at the validation layer.

---

## 🛡️ 2. Dual-Layer RBAC Architecture

Security is enforced at two distinct layers:

### A. Backend Authorization (FastAPI Enforcement — True Security)
Every API endpoint validates permissions server-side:
* **Primary Auth Guard**: `get_current_user` extracts JWT `sub` (UUID) and fetches the authoritative `User` from PostgreSQL.
* **Role Dependency Factories**:
  * `require_role(allowed_role)`: Returns HTTP 403 Forbidden if `user.role != allowed_role`.
  * `require_roles(*allowed_roles)`: Returns HTTP 403 Forbidden if `user.role` is not in `allowed_roles`.
* **Resource-Level Authorization**:
  * `/athletes/me`, `POST /videos`: Resolves `athlete_id` strictly from `user.user_id` of the authenticated JWT.
  * `GET /athletes/{id}`: Athlete can only request their own profile; staff roles (`Coach`, `Physio`, `Scientist`, `Admin`) can view any profile.
  * `DELETE /athletes/{id}`: Restricted to `RoleEnum.ADMINISTRATOR`.

### B. Frontend Route & UI Adaptation (React — UX & Navigation)
* **Route Protection (`ProtectedRoute.jsx`)**: Checks `isAuthenticated` and optional `allowedRoles`. If an authenticated user attempts direct URL navigation to an unauthorized route (e.g. Athlete visiting `/athletes`), a clean `Access Restricted` UI is displayed with a navigation button back to `/dashboard`.
* **Role-Aware Sidebar (`Sidebar.jsx`)**: Filters sidebar links dynamically based on `user.role` (e.g. Roster page shown for Staff roles, Video Analysis shown for Athletes). Displays a role badge at the bottom.
* **Customized Dashboard (`Dashboard.jsx`)**: Adapts greeting, statistics, and quick-action buttons based on whether the user is an Athlete or Staff.

---

## 📹 3. Video Upload & Storage Flow

The platform handles video binary uploads directly through FastAPI and stores raw binary data in PostgreSQL using the `BYTEA` data type alongside metadata.

```mermaid
sequenceDiagram
    autonumber
    actor Athlete
    participant UI as Video Analysis Page
    participant API as POST /api/v1/videos
    participant Auth as Auth & Profile Guard
    participant DB as PostgreSQL (videos table)

    Athlete->>UI: Select Video File (.mp4, .mov, etc.)
    UI->>UI: Validate Client-Side File Selection
    UI->>API: POST /api/v1/videos (multipart/form-data)
    Note over UI, API: Includes Authorization: Bearer <token>

    API->>Auth: Verify JWT & Resolve Athlete Record
    Auth->>DB: Query Athlete by user_id
    DB-->>Auth: Athlete Record Found
    
    API->>API: Validate MIME Type (ALLOWED_CONTENT_TYPES)
    API->>API: Validate File Size (≤ 500 MB)
    API->>API: Read Binary Bytes into Memory

    API->>DB: INSERT INTO videos (athlete_id, original_filename, content_type, file_size, file_data, processing_status)
    DB-->>API: Transaction Committed & Video ID Generated
    API-->>UI: Return VideoUploadResponse (Metadata Only - No Binary Echo)
    UI->>Athlete: Display Progress (100%) & Confirmation Card
```

### Data Pipeline Details:
* **Server-Side Identity Derivation**: `user_id` and `athlete_id` are derived strictly from the authenticated JWT token — clients cannot pass or override target profile IDs.
* **Payload Validation**: MIME types are checked against an explicit whitelist (`video/mp4`, `video/quicktime`, `video/x-msvideo`, `video/webm`, `video/x-matroska`), and payloads above 500 MB return `HTTP 413 Payload Too Large`.
* **Zero-Echo Response**: The HTTP response contains file metadata (`video_id`, `original_filename`, `content_type`, `file_size`, `uploaded_at`), omitting binary contents to preserve bandwidth.

---

## 💻 Tech Stack Overview

| Layer | Technologies Used |
|---|---|
| **Frontend UI** | React 18, Vite, Lucide React Icons, Vanilla CSS Design System |
| **State & HTTP** | React Context API (`AuthContext`), Axios + Interceptors, React Router v6 |
| **Backend Framework** | Python 3.14+, FastAPI, Pydantic v2, Pydantic Settings |
| **Database & ORM** | PostgreSQL 14+, SQLAlchemy 2.0 (ORM & Mapped Types), Alembic Migrations |
| **Security & Auth** | Argon2id (`argon2-cffi`), PyJWT (`python-jose`), FastAPI OAuth2 Bearer |
| **File Processing** | `python-multipart` for streaming multipart binary parsing |
