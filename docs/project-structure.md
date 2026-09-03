# Sports Injury Risk Detection - Project Directory Structure

This document outlines the organized source code directory structure of the repository. Generated build artifacts (`dist/`), local dependencies (`node_modules/`), and private configuration files (`.env`) are excluded.

```
sports-injury-risk-detection-official/
├── backend/
│   ├── package.json                        # Backend dependencies, scripts, and configuration
│   ├── src/
│   │   ├── controllers/
│   │   │   └── authController.js          # Authentication, user profile, and member onboarding controller
│   │   ├── db/
│   │   │   ├── index.js                   # PostgreSQL connection pool setup
│   │   │   ├── migrate.js                 # SQL migration runner
│   │   │   └── seed.js                    # Database seeder for demo accounts and organizations
│   │   ├── middleware/
│   │   │   └── authMiddleware.js          # JWT verification and role-based access control middleware
│   │   ├── routes/
│   │   │   └── authRoutes.js              # Express routing definitions for public and admin-protected endpoints
│   │   └── server.js                      # Express application initialization, CORS setup, and route mounting
│   └── tests/
│       └── auth.test.js                   # Automated HTTP integration test suite (45/45 passing)
│
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql         # Base PostgreSQL schema (users, athletes, injury history, predictions)
│   │   ├── 002_auth_schema.sql            # Auth extensions (password_hash, user_role enum, organization columns)
│   │   └── 003_org_member_id.sql          # Sequential organization_member_id column and indexing
│   └── mongodb_schema.js                  # Planned MongoDB collections for pose landmarks and AI telemetry logs
│
├── frontend/
│   ├── index.html                         # Single-page application root HTML template
│   ├── package.json                       # Frontend dependencies and Vite build scripts
│   ├── vite.config.js                     # Vite build configuration and plugins
│   └── src/
│       ├── App.css                        # Application layout styles
│       ├── App.jsx                        # React Router routing hierarchy and protected route registration
│       ├── index.css                      # Global design system tokens, typography, and base CSS variables
│       ├── main.jsx                       # React DOM root bootstrapping
│       ├── theme.css                      # Theme palette tokens (light and dark mode)
│       ├── components/
│       │   ├── DashboardUI.css            # Component styles for shells, panels, tables, and buttons
│       │   ├── DashboardUI.jsx            # Reusable UI primitives (DashboardShell, DataTable, Panel, StatCard)
│       │   ├── Logo.jsx                   # Application logo component
│       │   ├── Sidebar.jsx                # Role-aware responsive navigation sidebar
│       │   ├── ThemeToggle.jsx            # Theme switching utility component
│       │   ├── VideoUploadWorkspace.css   # Video upload workspace styling
│       │   ├── VideoUploadWorkspace.jsx   # UI workspace for video file selection and movement analysis previews
│       │   └── routing/
│       │       ├── ProtectedRoute.jsx     # Route guard requiring authenticated user session
│       │       └── RoleRoute.jsx          # Route guard restricting access to permitted user roles
│       ├── config/
│       │   ├── demoAccounts.js            # Development demo account profiles for testing
│       │   ├── organizationAccess.js      # Organization access permission helpers
│       │   └── roles.js                   # Canonical role definitions (ADMIN, COACH, PHYSIOTHERAPIST, ATHLETE)
│       ├── context/
│       │   └── AuthContext.jsx            # React Context providing global user state, login, and logout handlers
│       ├── pages/
│       │   ├── AddAthlete.jsx             # Admin workflow: search and assign registered athletes to organization
│       │   ├── AthletePages.css           # Form and profile detail grid styling
│       │   ├── Athletes.css               # Athlete management styles
│       │   ├── Dashboard.css              # Dashboard layout styling
│       │   ├── EditAthlete.jsx            # Athlete profile editing page
│       │   ├── Home.jsx                   # Landing page showcasing platform features
│       │   ├── InjuryHistory.css          # Clinical injury history table styles
│       │   ├── InviteMember.jsx           # Admin workflow: invite coaches and physiotherapists to organization
│       │   ├── Settings.css               # Organization and user settings styles
│       │   ├── athlete/
│       │   │   ├── AthleteDashboard.css   # Athlete dashboard layout styles
│       │   │   ├── AthleteDashboard.jsx   # Athlete personal risk and health overview
│       │   │   ├── AthleteProfile.css     # Athlete profile page styling
│       │   │   ├── AthleteProfile.jsx     # Athlete personal biometric profile view
│       │   │   └── InjuryHistory.jsx      # Athlete personal injury records table
│       │   ├── auth/
│       │   │   ├── ForgotPassword.jsx     # Password recovery page
│       │   │   ├── Login.jsx              # Multi-role authentication page with role selector
│       │   │   └── Register.jsx           # Public registration page for Athlete accounts
│       │   ├── coach/
│       │   │   ├── AthleteProfile.jsx     # Coach view of assigned athlete details
│       │   │   ├── Athletes.jsx           # Coach athlete roster list
│       │   │   └── CoachDashboard.jsx     # Coach performance and injury risk dashboard
│       │   └── common/
│       │       ├── ModulePlaceholder.jsx  # Fallback component for workspaces in active development
│       │       ├── OrganizationOverview.jsx# Organization statistics, teams, and member directory overview
│       │       ├── RoleDashboard.jsx      # Generic role-dispatched dashboard view
│       │       ├── Settings.jsx           # User and organization account settings
│       │       ├── Unauthorized.jsx       # 403 Forbidden role warning page
│       │       └── WorkspacePage.jsx      # Dynamic organizational workspace (Coaches, Physios, Athletes, Teams)
│       └── services/
│           └── authApi.js                 # Frontend API client communicating with Express backend endpoints
│
└── docs/
    ├── README.md                          # Documentation index and project milestone summary
    ├── Sports_Injury_Project_Implementation.md # Complete technical implementation document for mentors
    ├── project-structure.md               # This directory structure specification
    └── demo/
        └── athlete-demo.mp4               # Recorded video demonstration of athlete workflow
```
