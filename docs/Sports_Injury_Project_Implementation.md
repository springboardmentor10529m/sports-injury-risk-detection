# Sports Injury Risk Detection
## Project Implementation Documentation

---

### 1. Project Overview
The **Sports Injury Risk Detection** platform is an enterprise-grade, multi-role athletic health and biomechanical monitoring system. Its primary objective is to empower sports organizations, athletic clubs, and medical staff to systematically track athlete physical readiness, evaluate injury risks, manage rehabilitation protocols, and oversee organization staffing.

The current implementation focuses on establishing a hardened, production-ready foundation:
- Secure multi-role authentication and authorization across four distinct roles: **Administrator**, **Coach**, **Physiotherapist**, and **Athlete**.
- Complete organization onboarding and membership coordination workflows (Athlete search & assignment, Coach invitations, Physiotherapist invitations).
- Normalized PostgreSQL persistence with sequential organization Member ID tracking and strict conflict-prevention mechanisms.
- Modular React frontend built on a consistent, accessible design system.

---

### 2. Current Implementation Status

| Stage | Feature / Capability | Implementation Details |
|---|---|---|
| **Completed** | Multi-Role Authentication | Salting & hashing via bcrypt, stateless JWT issuance, session validation (`/api/auth/me`), password recovery, role enforcement. |
| **Completed** | Role-Based Access Control (RBAC) | Frontend `ProtectedRoute` and `RoleRoute` guards; backend `verifyToken` and `requireRole(['admin'])` middleware. |
| **Completed** | Athlete Organization Assignment | Admin search for registered athletes by email, duplicate checks, sequential Member ID assignment, status toggling between `active` and `independent`. |
| **Completed** | Coach Invitation Workflow | Admin invitation form, email validation, duplicate account prevention, bcrypt password hashing, sequential ID generation, organization table display. |
| **Completed** | Physiotherapist Invitation Workflow | Admin invitation form, email validation, duplicate account prevention, bcrypt password hashing, sequential ID generation, organization table display. |
| **Completed** | Sequential Member ID Generation | Algorithmic suffix scanning generating normalized IDs (e.g., `ORG-DEV-001`, `ORG-DEV-002`) indexed in PostgreSQL. |
| **Completed** | Organization Member Removal | Safe unassignment resetting organization foreign keys while preserving athlete physical profiles and user accounts intact. |
| **Completed** | Automated Integration Testing | 45-point comprehensive integration test harness covering authentication, authorization, role enforcement, and member onboarding. |
| **Completed** | Production Frontend Build | Zero-error Vite production bundling. |
| **In Progress** | Athlete Profile & Biometric Sync | Profile editing with bi-directional synchronization of height, weight, and sport details to the PostgreSQL `athletes` table. |
| **In Progress** | Teams / Groups Coordination | Team grouping interfaces for assigning coaches and physiotherapists to specific athlete cohorts. |
| **In Progress** | Clinical Injury History Records | UI workspace connected to PostgreSQL `injury_history` table for tracking recovery milestones. |
| **Planned / Next Phase** | Computer Vision Pose Estimation | MediaPipe / OpenCV video processing pipeline extracting joint landmark coordinates from athlete movement videos. |
| **Planned / Next Phase** | ML Injury Risk Inference Models | Machine learning risk scoring models (ACL, hamstring, overuse risk) evaluated against biomechanical parameters. |
| **Planned / Next Phase** | NoSQL Telemetry Storage | MongoDB collections (`pose_data`, `ai_logs`) for high-frequency time-series joint landmarks. |
| **Planned / Next Phase** | Real-Time Risk Alerts | WebSockets / automated notification dispatch for athletes exceeding injury risk thresholds. |

---

### 3. System Architecture

The application adopts a decoupled, multi-tier client-server architecture with strict separation between user interfaces, application business logic, authorization boundaries, and relational data persistence.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT TIER                                      |
|                                                                                   |
|   React 18 Single Page Application (Vite Build)                                  |
|   ├── AuthContext (Global User State & Session Synchronization)                  |
|   ├── ProtectedRoute & RoleRoute (Client Route Guards)                            |
|   └── DashboardUI & Parameterized WorkspacePage Views                             |
+----------------------------------------+------------------------------------------+
                                         |
                                         | HTTP Requests with Bearer JWT Token
                                         v
+-----------------------------------------------------------------------------------+
|                                  API / NETWORK                                    |
|                                                                                   |
|   frontend/src/services/authApi.js                                                |
|   └── Centralized request wrapper with automatic Authorization header injection   |
+----------------------------------------+------------------------------------------+
                                         |
                                         | RESTful JSON Over HTTP (Port 5000)
                                         v
+-----------------------------------------------------------------------------------+
|                                  SERVER TIER                                      |
|                                                                                   |
|   Express 4 Web Application (backend/src/server.js)                               |
|   ├── CORS Middleware (Cross-Origin Policy Enforcement)                           |
|   ├── Express JSON Body Parser                                                    |
|   ├── Route Dispatcher (backend/src/routes/authRoutes.js)                         |
|   ├── Middleware Layer (backend/src/middleware/authMiddleware.js)                 |
|   │   ├── verifyToken: Validates JWT signature & attaches req.user                |
|   │   └── requireRole: Rejects unauthorized roles with HTTP 403 Forbidden         |
|   └── Controller Layer (backend/src/controllers/authController.js)                |
|       ├── Business Logic Validation & Member ID Sequencing                        |
|       └── Sensitive Field Stripping (formatUserResponse)                          |
+----------------------------------------+------------------------------------------+
                                         |
                                         | Parameterized SQL Queries via pg Pool
                                         v
+-----------------------------------------------------------------------------------+
|                                 DATABASE TIER                                     |
|                                                                                   |
|   PostgreSQL Relational Database (sports_injury_db)                               |
|   ├── users (UUID PK, email UNIQUE, password_hash, user_role enum, org fields)    |
|   ├── athletes (UUID PK, user_id FK, height_cm, weight_kg, sport, gender)        |
|   ├── injury_history, videos, analysis_results, injury_predictions                |
|   └── Indexes: idx_users_org_member_id ON users(organization_id, member_id)       |
+-----------------------------------------------------------------------------------+
```

---

### 4. Frontend Implementation

The frontend is implemented using **React 18** and **React Router v6**, bundled with **Vite**. Styling relies on a custom CSS design system utilizing semantic CSS variables (`index.css`, `theme.css`) to maintain consistent typography, color palettes, and component responsiveness.

#### Key Pages and Components

1. **Authentication Components**:
   - `frontend/src/pages/auth/Login.jsx`: Multi-role login interface allowing users to select their target role (**Athlete**, **Coach**, **Physiotherapist**, **Administrator**). Dispatches login credentials to `authApi.login` and directs authenticated users to their respective dashboards.
   - `frontend/src/pages/auth/Register.jsx`: Public registration interface strictly scoped to **Athlete** accounts. Captures full name, email, password, height (cm), and weight (kg).
   - `frontend/src/pages/auth/ForgotPassword.jsx`: Recovery interface allowing registered users to verify account email and submit password reset requests.

2. **Routing and Route Protection**:
   - `frontend/src/components/routing/ProtectedRoute.jsx`: Enforces that an active authenticated session exists in `AuthContext`. Unauthenticated visits redirect to `/login`.
   - `frontend/src/components/routing/RoleRoute.jsx`: Validates the authenticated user's role against an allowed role whitelist. Unauthorized roles redirect to `/unauthorized`.
   - `frontend/src/App.jsx`: Declares the complete application routing graph.

3. **Dashboard and Navigation**:
   - `frontend/src/components/Sidebar.jsx`: Dynamically renders sidebar navigation links matching the authenticated user's role scope.
   - `frontend/src/components/DashboardUI.jsx`: Production UI component primitives including `DashboardShell`, `DataTable`, `Panel`, `SearchFilterBar`, `ActionButton`, `EmptyState`, and `StatusBadge`.
   - `frontend/src/pages/common/RoleDashboard.jsx`: Role-aware landing dashboard providing high-level operational statistics and activity summaries.

4. **Athlete Management**:
   - `frontend/src/pages/AddAthlete.jsx`: Administrator workflow allowing search of registered athlete accounts by email address. Displays athlete details, validates organizational membership status, and assigns the athlete to the admin's organization.
   - `frontend/src/pages/EditAthlete.jsx`: Profile editing view for adjusting athlete biometrics.
   - `frontend/src/pages/athlete/AthleteProfile.jsx`: Comprehensive profile view showing biometrics, assigned organization, and member ID.

5. **Staff Onboarding & Invitation**:
   - `frontend/src/pages/InviteMember.jsx`: Dedicated invitation interface supporting both **Coach** and **Physiotherapist** invitations. Displays organization parameters, collects required member details, validates email format, handles server conflict responses (409), and redirects back to the roster list with a success notification.

6. **Unified Workspace Engine**:
   - `frontend/src/pages/common/WorkspacePage.jsx`: Parameterized workspace controller managing views for `/admin/athletes`, `/admin/coaches`, and `/admin/physiotherapists`. Features live search filtering, real-time status badges, empty-state actions, and modal confirmations for member unassignment.

7. **API Service Layer**:
   - `frontend/src/services/authApi.js`: Centralized HTTP abstraction layer wrapping `fetch`. Automatically retrieves the session token from `localStorage` (`sports-injury-token`), appends `Authorization: Bearer <token>`, parses JSON responses, and standardizes error propagation.

---

### 5. Backend Implementation

The backend is built with **Node.js** and **Express 4**, organized according to the Controller-Service-Repository architecture pattern.

#### Architecture Files
- **Server Entrypoint** (`backend/src/server.js`): Configures Express, initializes flexible CORS policies for local dev origins (`http://localhost:5173`, `http://127.0.0.1:5173`), mounts route groups (`/api/auth`, `/api/admin`, `/api/users`, `/api`), and exposes health-check endpoints.
- **Route Definitions** (`backend/src/routes/authRoutes.js`): Declares Express router paths and maps them to controllers, attaching authentication and role middleware.
- **Controller Logic** (`backend/src/controllers/authController.js`): Implements business logic, database queries, password hashing, sequential member ID calculation, duplicate checks, and user response sanitization.
- **Middleware** (`backend/src/middleware/authMiddleware.js`): Exports `verifyToken` for JWT verification and `requireRole` for role-based permission checks.
- **Database Connection** (`backend/src/db/index.js`): Configures a `pg.Pool` instance using environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
- **Migrations Runner** (`backend/src/db/migrate.js`): Executes SQL migration files in sequence.
- **Database Seeder** (`backend/src/db/seed.js`): Upserts default demonstration accounts for testing.

---

### 6. Authentication & Authorization

#### 1. Registration Flow
- **Public Registration Policy**: Public account registration is restricted exclusively to **Athlete** accounts (`role: 'athlete'`). Requests specifying other roles are rejected (`403 Forbidden`).
- **Validation**: Ensures name, email, and password are provided, and verifies that password matches confirmation.
- **Duplicate Email Enforcement**: Case-insensitive database check (`LOWER(email) = LOWER($1)`). Existing accounts trigger an immediate `400 Bad Request`.
- **Password Protection**: Passwords are encrypted using `bcrypt.hash` with 10 salt rounds before storage. Plaintext passwords are never saved.
- **Athlete Record Creation**: Atomically inserts corresponding rows into both the `users` and `athletes` tables.

#### 2. Login & Session Issuance
- **Role Verification**: Users submit email, password, and the role they are attempting to access. The system compares the submitted role against the user's stored database role:
  ```javascript
  if (user.role !== requestedRole) {
    return res.status(400).json({
      message: `This account is not registered as a ${expectedLabel} account.`
    });
  }
  ```
- **Organization Active Check**: Professional accounts (`coach`, `physiotherapist`, `admin`) are strictly required to have an assigned `organization_id` and `membership_status = 'active'` to log in (`403 Forbidden` otherwise).
- **JWT Token Issuance**: On successful bcrypt comparison (`bcrypt.compare`), a JSON Web Token is signed containing:
  - `id`: User UUID
  - `email`: Normalized user email
  - `role`: Database role enum string
  - Token validity is set to 7 days (`expiresIn: '7d'`).

#### 3. Token Verification & Role Guards
- Incoming requests to protected endpoints require an HTTP `Authorization: Bearer <token>` header.
- `verifyToken` validates the cryptographic signature using `jwt.verify`.
- `requireRole(['admin'])` verifies that `req.user.role === 'admin'`. Mismatched roles receive an immediate `403 Forbidden` response.

---

### 7. API Endpoints

The table below lists all verified endpoints currently implemented in the Express backend router (`backend/src/routes/authRoutes.js` and `backend/src/server.js`):

| Module | Method | Endpoint | Authentication | Purpose |
|---|---|---|---|---|
| **Health** | `GET` | `/health` / `/api/health` | Public | Service health and timestamp verification. |
| **Auth** | `POST` | `/api/auth/register` | Public (Athlete only) | Public registration of Athlete user accounts and profiles. |
| **Auth** | `POST` | `/api/auth/login` | Public | Authenticates credentials, validates role, and returns JWT. |
| **Auth** | `POST` | `/api/auth/logout` | Public | Confirms session termination for the client. |
| **Auth** | `POST` | `/api/auth/forgot-password` | Public | Verifies account existence for password recovery. |
| **Auth** | `POST` | `/api/auth/reset-password` | Public | Updates user password hash following reset verification. |
| **Session** | `GET` | `/api/auth/me` | Bearer JWT | Retrieves current authenticated user session details. |
| **Profile** | `PUT` | `/api/users/profile` | Bearer JWT | Updates contact info and athlete biometrics (height/weight/sport). |
| **Admin / Athletes** | `GET` | `/api/admin/athletes/search` | Bearer JWT (Admin only) | Searches for registered athlete accounts by email query. |
| **Admin / Athletes** | `GET` | `/api/admin/athletes` | Bearer JWT (Admin only) | Lists all active athletes belonging to the admin's organization. |
| **Admin / Athletes** | `POST` | `/api/admin/athletes/:userId/assign` | Bearer JWT (Admin only) | Assigns an athlete to the organization with a sequential Member ID. |
| **Admin / Athletes** | `POST` | `/api/admin/athletes/:userId/unassign` | Bearer JWT (Admin only) | Unassigns an athlete, resetting status to `independent`. |
| **Admin / Coaches** | `GET` | `/api/admin/coaches` | Bearer JWT (Admin only) | Lists all active coaches in the admin's organization. |
| **Admin / Coaches** | `POST` | `/api/admin/coaches/invite` | Bearer JWT (Admin only) | Invites and provisions a new coach with active organization membership. |
| **Admin / Coaches** | `POST` | `/api/admin/coaches/:userId/unassign` | Bearer JWT (Admin only) | Removes a coach from the admin's organization. |
| **Admin / Physio** | `GET` | `/api/admin/physiotherapists` | Bearer JWT (Admin only) | Lists all active physiotherapists in the admin's organization. |
| **Admin / Physio** | `POST` | `/api/admin/physiotherapists/invite` | Bearer JWT (Admin only) | Invites and provisions a new physiotherapist with active membership. |
| **Admin / Physio** | `POST` | `/api/admin/physiotherapists/:userId/unassign` | Bearer JWT (Admin only) | Removes a physiotherapist from the admin's organization. |

*Note: For maximum deployment flexibility, athlete, coach, and physiotherapist routes are registered under both `/api/admin/*` and direct route aliases.*

---

### 8. Endpoint Triggering Flow

#### A. User Login Flow
```
[User submits email, password, role]
       |
       v
[authApi.login({ email, password, role })]
       |
       v  HTTP POST /api/auth/login
[Express Router: authRoutes.js]
       |
       v
[Controller: authController.login]
       |
       v  SQL: SELECT * FROM users WHERE LOWER(email) = $1
[PostgreSQL Database]
       |
       v  Compare bcrypt hash & verify user.role === requestedRole
[JWT Issuance: jwt.sign({ id, email, role })]
       |
       v  HTTP 200 { user, token }
[Client receives payload]
       |
       v
[AuthContext: stores token & user in localStorage]
       |
       v
[Redirect to Role Dashboard]
```

#### B. Athlete Search Flow
```
[Admin types email on /admin/athletes/add and clicks "Search Athlete"]
       |
       v
[authApi.searchAthlete(email)]
       |
       v  HTTP GET /api/admin/athletes/search?email=...
[authMiddleware.verifyToken] -> validates Bearer JWT
       |
       v
[authMiddleware.requireRole(['admin'])] -> verifies req.user.role === 'admin'
       |
       v
[Controller: authController.searchAthleteByEmail]
       |
       v  SQL: SELECT ... FROM users JOIN athletes ON user_id WHERE email = $1
[PostgreSQL Database]
       |
       v  Sanitize record (exclude password_hash)
[HTTP 200 { athlete: formattedAthlete }]
       |
       v
[AddAthlete.jsx sets foundAthlete state -> displays review panel]
```

#### C. Athlete Organization Assignment Flow
```
[Admin clicks "Add Athlete to Organization"]
       |
       v
[authApi.assignAthlete(targetUserId)]
       |
       v  HTTP POST /api/admin/athletes/:userId/assign
[authMiddleware: verifyToken + requireRole(['admin'])]
       |
       v
[Controller: authController.assignAthleteToOrganization]
       |
       +---> Duplicate Check: Rejects if active in same or another organization (409)
       |
       +---> Sequential ID Scan: Queries max suffix for targetOrgId
       |
       v  SQL: UPDATE users SET organization_id = $1, organization_member_id = $2,
               membership_status = 'active' WHERE user_id = $3
[PostgreSQL Database]
       |
       v  HTTP 200 { message: 'Athlete successfully added...', user }
[AddAthlete.jsx navigates to /admin/athletes with state.message]
       |
       v
[WorkspacePage renders success banner & calls authApi.getAthletes() to refresh table]
```

#### D. Coach Invitation Flow
```
[Admin fills name, email, password on /admin/coaches/invite & submits]
       |
       v
[authApi.inviteCoach({ name, email, password, phone })]
       |
       v  HTTP POST /api/admin/coaches/invite
[authMiddleware: verifyToken + requireRole(['admin'])]
       |
       v
[Controller: authController.inviteCoach]
       |
       +---> Input Validation: Verifies name and email regex (400 if invalid)
       |
       +---> Duplicate Check: Verifies email does not exist in users table (409 if conflict)
       |
       +---> Member ID Sequencing: Calculates next suffix (e.g. ORG-DEV-002)
       |
       +---> Bcrypt Hash: Hashes initial password
       |
       v  SQL: INSERT INTO users (name, email, password_hash, role='coach',
               organization_id, organization_member_id, membership_status='active', ...)
[PostgreSQL Database]
       |
       v  HTTP 201 { message: 'Coach invitation sent successfully.', coach }
[InviteMember.jsx navigates to /admin/coaches with state.message]
       |
       v
[WorkspacePage renders success banner & calls authApi.getCoaches() to update table]
```

#### E. Physiotherapist Invitation Flow
```
[Admin fills name, email, password on /admin/physiotherapists/invite & submits]
       |
       v
[authApi.invitePhysiotherapist({ name, email, password, phone })]
       |
       v  HTTP POST /api/admin/physiotherapists/invite
[authMiddleware: verifyToken + requireRole(['admin'])]
       |
       v
[Controller: authController.invitePhysiotherapist]
       |
       +---> Validates name and email regex (400)
       |
       +---> Checks for existing account with same email (409)
       |
       +---> Generates sequential Member ID
       |
       +---> Hashes initial password with bcrypt
       |
       v  SQL: INSERT INTO users (role='physiotherapist', membership_status='active', ...)
[PostgreSQL Database]
       |
       v  HTTP 201 { message: 'Physiotherapist invitation sent successfully.', physiotherapist }
[InviteMember.jsx navigates to /admin/physiotherapists with state.message]
       |
       v
[WorkspacePage renders success banner & calls authApi.getPhysiotherapists()]
```

#### F. Member Removal / Unassignment Flow
```
[Admin clicks "Remove" on member row in WorkspacePage -> modal confirmation]
       |
       v
[authApi.unassignAthlete / unassignCoach / unassignPhysiotherapist]
       |
       v  HTTP POST /api/admin/{resource}/:userId/unassign
[authMiddleware: verifyToken + requireRole(['admin'])]
       |
       v
[Controller unassign handler]
       |
       v  SQL: UPDATE users SET organization_id = NULL, organization_name = NULL,
               membership_status = 'independent' WHERE user_id = $1
[PostgreSQL Database]
       |
       v  HTTP 200 { message: '...removed successfully.', user }
[WorkspacePage displays success notification & re-fetches active roster]
```

---

### 9. Athlete Organization Assignment

The assignment workflow bridges public self-registered athletes and administrative organization rosters without data duplication:

1. **Email Search**: The administrator inputs the registered athlete's email on `/admin/athletes/add`.
2. **Identity Verification**: The backend retrieves the corresponding record from PostgreSQL and formats public biometrics (height, weight, sport) while omitting credential hashes.
3. **Duplicate Assignment Prevention**:
   - If the athlete is already active in the admin's organization, the system blocks the action with `409 Conflict` (*"Athlete already exists in this organization"*).
   - If the athlete is active in another organization, direct assignment is blocked with `409 Conflict` (*"This Athlete is already associated with another organization"*).
4. **Member ID Assignment**:
   - The system inspects existing organization members, identifies the highest existing numeric suffix (e.g., `ORG-DEV-001`), increments the counter, and assigns the next sequential ID (`ORG-DEV-002`).
5. **Database Update**: The athlete's existing row in `users` is updated with `organization_id`, `organization_name`, `organization_member_id`, and `membership_status = 'active'`. No duplicate user or athlete rows are generated.
6. **Reassignment Tolerance**: If an athlete was previously removed (setting status to `independent`), they can be re-assigned without primary key or foreign key conflict.

---

### 10. Coach Invitation Workflow

Because coaches possess elevated privileges to view athlete data, they cannot self-register through public portals:

1. **Admin Initiation**: The administrator accesses `/admin/coaches` and clicks **Invite Coach**, routing to `/admin/coaches/invite`.
2. **Input Validation**:
   - Full Name (required, non-empty string).
   - Email Address (required, validated against standard email regex).
   - Initial Password (optional, defaults to `Coach@123` if omitted; minimum 6 characters).
   - Phone Number (optional).
3. **Authorization**: The request header contains the admin's Bearer JWT; `requireRole(['admin'])` verifies administrative status.
4. **Conflict Prevention**: If the email address is already present in `users`, the endpoint returns `409 Conflict` detailing whether the user already exists in the organization or platform.
5. **Sequential Member ID Generation**: Generates the next sequential ID for the organization (e.g., `ORG-DEV-00X`).
6. **Persistence**: Inserts the new coach row into PostgreSQL with role `'coach'` and `membership_status = 'active'`.
7. **Client Feedback**: Navigates back to `/admin/coaches` displaying a green success banner; the newly provisioned coach appears in the active roster table.

---

### 11. Physiotherapist Invitation Workflow

The physiotherapist invitation workflow operates identically to the coach workflow, with role-specific parameters:

1. **Admin Initiation**: Navigates from `/admin/physiotherapists` to `/admin/physiotherapists/invite`.
2. **Form Entry & Validation**: Collects name, email, phone, and initial password (defaults to `Physio@123` if omitted).
3. **Backend Authorization & Duplicate Checking**: Verifies administrative permissions and verifies email uniqueness in PostgreSQL.
4. **Member ID Sequencing**: Assigns the next sequential identifier in the organization sequence.
5. **Persistence**: Inserts record into `users` table with role `'physiotherapist'` and `membership_status = 'active'`.
6. **Client Synchronization**: Redirects to the Physiotherapists workspace, showing the updated table containing the new professional.

---

### 12. Database Integration

The application uses **PostgreSQL** as its primary system of record. Connections are managed via a connection pool (`pg.Pool`) configured in `backend/src/db/index.js`.

#### Relational Schema Migrations

The database schema is constructed through sequential SQL migrations in `database/migrations/`:

1. **`001_initial_schema.sql`**:
   - Defines custom enum type `user_role`: `'athlete'`, `'coach'`, `'physiotherapist'`, `'sports_scientist'`, `'administrator'`.
   - Creates `users` table (`user_id UUID PRIMARY KEY`, `name`, `email UNIQUE`, `password`, `role`, `phone`, `profile_image`, `created_at`).
   - Creates `athletes` table (`athlete_id UUID PRIMARY KEY`, `user_id UUID UNIQUE REFERENCES users(user_id)`, `height_cm`, `weight_kg`, `sport`, `gender`, `date_of_birth`).
   - Declares related tables: `injury_history`, `videos`, `analysis_results`, `injury_predictions`, `recommendations`, `notifications`, `reports`, `performance_records`.

2. **`002_auth_schema.sql`**:
   - Enables `pgcrypto` extension for automatic UUID generation (`DEFAULT gen_random_uuid()`).
   - Adds `'admin'` value to `user_role` enum.
   - Renames `password` column to `password_hash` to clearly communicate encryption semantics.
   - Adds organization columns to `users`: `organization_id`, `organization_name`, `membership_status` (default `'independent'`), `address`, and `updated_at`.

3. **`003_org_member_id.sql`**:
   - Adds `organization_member_id VARCHAR` to `users`.
   - Creates composite index: `CREATE INDEX idx_users_org_member_id ON users(organization_id, organization_member_id)`.
   - Normalizes development seed records to `ORG-DEV` and `ORG-DEV-001`.

---

### 13. Security Implementation

1. **Cryptographic Password Storage**: Passwords are never stored in plaintext. Passwords are encrypted using salted bcrypt hashing (`bcrypt.hash(password, 10)`).
2. **Stateless JWT Authorization**: User sessions are tracked via signed JSON Web Tokens using a server-side secret key (`JWT_SECRET`).
3. **Role-Based Endpoint Protection**: Every administrative endpoint is guarded by `verifyToken` and `requireRole(['admin'])`. Unauthorized attempts are rejected with `403 Forbidden`.
4. **SQL Injection Defense**: All database queries strictly utilize parameterized queries (`$1, $2, ...`), preventing SQL injection vectors.
5. **Credential Sanitization**: The controller's `formatUserResponse` function removes `password_hash` and sensitive database internals before returning user objects to the client.
6. **Cross-Origin Resource Sharing (CORS)**: Configured in `backend/src/server.js` to accept requests from authorized frontend origins (`http://localhost:5173`, `http://127.0.0.1:5173`).
7. **Environment Variable Segregation**: Secrets, database credentials, and port configurations are kept in `.env` files and excluded from source control.

---

### 14. Error Handling

The application provides descriptive, actionable error responses across both layers:

| Error Condition | HTTP Code | Handled In | User Experience / Response |
|---|---|---|---|
| **Missing Credentials** | `400 Bad Request` | Backend / Frontend | *"Email, password, and selected role are required."* |
| **Password Mismatch** | `400 Bad Request` | Frontend / Backend | *"Password and confirm password must match."* |
| **Invalid Email Format** | `400 Bad Request` | Frontend / Backend | *"Please provide a valid email address."* |
| **Role Mismatch on Login** | `400 Bad Request` | Backend | *"This account is not registered as a [Role] account."* |
| **Incorrect Password** | `401 Unauthorized` | Backend | *"The email address or password is incorrect."* |
| **Account Not Found** | `401 / 404` | Backend | *"No registered account was found for this email address."* |
| **Missing / Expired Token**| `401 Unauthorized` | Middleware | *"Authentication required. No token provided."* / *"Invalid or expired session token."* |
| **Public Register Non-Athlete** | `403 Forbidden` | Backend | *"Public registration is restricted to Athlete accounts only."* |
| **Unauthorized Role Route** | `403 Forbidden` | Middleware | *"Access denied for your role scope."* / Redirects to `/unauthorized`. |
| **Inactive Organization Member** | `403 Forbidden` | Backend | *"Professional access requires an active organization membership."* |
| **Duplicate Account Email** | `409 Conflict` | Backend / Frontend | *"An account with this email address already exists."* |
| **Duplicate Athlete in Org** | `409 Conflict` | Backend / Frontend | *"Athlete already exists in this organization."* |
| **Athlete in Other Org** | `409 Conflict` | Backend / Frontend | *"This Athlete is already associated with another organization."* |
| **Server / Database Error** | `500 Server Error` | Backend / Frontend | *"Failed to process request due to a server error."* |

---

### 15. Testing & Verification

The project includes an automated HTTP integration test suite (`backend/tests/auth.test.js`) executed with Node.js against the running Express application and live PostgreSQL database.

#### Automated Test Execution Results
All **45/45 tests pass**:

```text
========================================
   RUNNING AUTHENTICATION BACKEND TESTS 
========================================

Connected to backend server on port 5000.

✓ [PASS] Health Check API
✓ [PASS] Admin Seed Login
✓ [PASS] Coach Seed Login
✓ [PASS] Physiotherapist Seed Login
✓ [PASS] Role Mismatch Rejection
✓ [PASS] Wrong Password Rejection
✓ [PASS] Athlete Public Registration (No Session Created)
✓ [PASS] Explicit Athlete Login
✓ [PASS] Duplicate Email Rejection
✓ [PASS] GET /api/auth/me Session Check
✓ [PASS] PostgreSQL Bcrypt Password Hash Verification
✓ [PASS] Forgot Password Unknown Email Rejection (404)
✓ [PASS] Forgot Password Email Verification (200)
✓ [PASS] Reset Password API (No Auto-Login Token)
✓ [PASS] Old Password Rejection Post-Reset
✓ [PASS] New Password Login Success
✓ [PASS] Non-Admin Access to Admin Endpoints Rejection (403)
✓ [PASS] Search Unknown Email Rejection (404)
✓ [PASS] Search Non-Athlete Email Rejection (400)
✓ [PASS] Admin Search Registered Athlete Success (No Password Hash Returned)
✓ [PASS] First-time Admin Assign Athlete to Organization (HTTP 200 SUCCESS)
✓ [PASS] Duplicate Athlete Assignment Rejection (HTTP 409 Conflict)
✓ [PASS] Athlete user_id Unchanged & No Duplicate Users Row Created on 409
✓ [PASS] Existing Member ID Unchanged on Duplicate Attempt
✓ [PASS] Athlete athlete_id Unchanged & No Duplicate Athletes Row Created
✓ [PASS] Second Athlete Assignment Receives Next Sequential Member ID
✓ [PASS] Admin Fetch Organization Athletes List (Height & Weight from PostgreSQL)
✓ [PASS] Non-Admin Access to Organization Athletes List Rejection (403)
✓ [PASS] Admin Unassign Athlete (Set membership_status = independent, Clear Organization)
✓ [PASS] Previously Unassigned Athlete Re-Adding Allowed (HTTP 200 SUCCESS)
✓ [PASS] PostgreSQL users & athletes Rows Intact (No Duplicate or Deleted Rows)
✓ [PASS] Athlete Can Still Log In Post-Operation
✓ [PASS] Non-Admin Access to Coach Invite Rejection (403)
✓ [PASS] Admin Invite Coach Missing Name/Email Rejection (400)
✓ [PASS] Admin Invite Coach Invalid Email Rejection (400)
✓ [PASS] Admin Invite Coach Success (HTTP 201)
✓ [PASS] Duplicate Coach Email Invitation Rejection (HTTP 409 Conflict)
✓ [PASS] Admin Invite Physiotherapist Success (HTTP 201)
✓ [PASS] Duplicate Physiotherapist Email Invitation Rejection (HTTP 409 Conflict)
✓ [PASS] Admin Fetch Organization Coaches List (HTTP 200)
✓ [PASS] Admin Fetch Organization Physiotherapists List (HTTP 200)
✓ [PASS] Newly Invited Coach Login Verification (HTTP 200)
✓ [PASS] Newly Invited Physiotherapist Login Verification (HTTP 200)
✓ [PASS] Admin Unassign Coach (HTTP 200)
✓ [PASS] Admin Unassign Physiotherapist (HTTP 200)

========================================
   TEST RESULTS: 45/45 PASSED
========================================
```

#### Production Build Verification
The frontend was validated using `npm run build` (`vite build`):
- Modules transformed: 56
- Build time: 1.39s
- Syntax or bundling errors: **0**

---

### 16. Current Limitations

1. **Video Analysis Pipeline**: The Video Analysis component (`VideoUploadWorkspace.jsx`) currently operates as an interactive frontend preview workspace. It does not yet connect to an active computer vision inference pipeline.
2. **Email Delivery Service**: The invitation workflow and password recovery currently register and verify accounts in PostgreSQL directly; external SMTP/SES transactional email dispatch is not yet configured.
3. **Clinical Reports**: The reports workspace presents structured report templates; dynamic PDF compilation is planned for the next milestone.

---

### 17. Next Development Phase

The next major project phase will focus on integrating the **Biomechanical Computer Vision Pipeline**:

1. **MediaPipe / OpenCV Pose Estimation Service**:
   - Implement a background processing microservice (Python / FastApi) that accepts uploaded movement videos.
   - Extract 33 3D skeletal landmark coordinates per frame across movement sequences (squats, jumps, sprint strides).
2. **Biomechanical Angle & Symmetry Extraction**:
   - Compute real-time joint kinematic angles: Knee Valgus angle, Hip Stability index, Trunk Lean angle, Joint Alignment symmetry.
3. **Machine Learning Risk Prediction**:
   - Feed temporal joint angle sequences into trained classification models to predict risk scores for ACL strain, Hamstring tear, and Patellofemoral overuse.
4. **MongoDB Landmark Storage**:
   - Activate the `database/mongodb_schema.js` collections (`pose_data` and `ai_logs`) for high-throughput storage of frame-by-frame joint coordinates.
5. **Real-Time Clinical Alerts**:
   - Establish WebSocket channels to notify coaches and physiotherapists immediately when an athlete's movement quality drops below safety thresholds.

---

### 18. Conclusion

This milestone establishes a secure, tested, and scalable foundation for the Sports Injury Risk Detection platform:
- Robust multi-role authentication with strict role-matching validation.
- Complete organization management workflows for Athletes, Coaches, and Physiotherapists with sequential Member ID tracking.
- PostgreSQL database persistence with foreign-key integrity and conflict-prevention mechanisms.
- 45/45 automated integration test passes and zero-error production frontend builds.

The system is ready for the integration of the Machine Learning and video analysis inference pipeline in the next milestone.
