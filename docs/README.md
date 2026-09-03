# Sports Injury Risk Detection - Project Documentation

## Project Overview
The **Sports Injury Risk Detection** platform is a full-stack, multi-role athletic health and injury prevention system. It provides role-based workspaces for **Administrators**, **Coaches**, **Physiotherapists**, and **Athletes** to manage athletic populations, monitor biomechanical health, coordinate organization membership, and track injury histories.

## Current Milestone
**Milestone 1 & 2 Completed: Enterprise Authentication, Role-Based Access Control, Organization Membership & Staff Onboarding Workflows.**

- Robust PostgreSQL-backed authentication system utilizing salted bcrypt password hashing and stateless JWT session management.
- Complete Administrator workflows for searching and assigning registered athletes, inviting coaches, and inviting physiotherapists with sequential organization Member IDs and conflict-free duplicate prevention.
- Production-ready React frontend with role-specific navigation, interactive data tables, search filters, modal confirmations, and responsive form validation.
- Verified test suite with **45/45 passing automated integration tests** and zero-warning production Vite builds.

## Technology Stack
- **Frontend**: React 18, React Router v6, Vanilla CSS (Design System Tokens), Vite 8.
- **Backend**: Node.js, Express 4, JSON Web Tokens (`jsonwebtoken`), Bcrypt (`bcryptjs`), CORS.
- **Database**: PostgreSQL (`pg` Connection Pool), SQL schema migrations.
- **Testing**: Node.js native HTTP integration test harness (`tests/auth.test.js`).

## Documentation Index
1. [Technical Implementation Documentation](./Sports_Injury_Project_Implementation.md) - In-depth technical architecture, complete API endpoints, flow diagrams, database schemas, security, error handling, test results, and next-phase roadmap.
2. [Project Structure Reference](./project-structure.md) - Curated directory tree of meaningful backend, frontend, database, and documentation files.

## Demonstration Media
- **Athlete Walkthrough Video**: Stored locally in [`docs/demo/athlete-demo.mp4`](./demo/athlete-demo.mp4).
