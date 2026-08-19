# Sports Injury Risk Detection — Frontend Web Application

The frontend client for the **Sports Injury Risk Detection System**, providing an interactive web interface for athlete profile management, movement video uploads, risk visualization dashboards, and role-based views.

Built with **React 18**, **Vite**, **Lucide React Icons**, and a custom **Vanilla CSS Design System**.

---

## 📁 Directory Structure

```
frontend/
├── src/
│   ├── api/                      # Axios REST API services
│   │   ├── axios.js              # Base Axios instance & JWT request/response interceptors
│   │   ├── auth.js               # Login, register, and getCurrentUser services
│   │   ├── athletes.js           # Athlete profile CRUD services (/athletes/me)
│   │   ├── videos.js             # Multipart binary video upload service (/videos)
│   │   └── assessments.js        # Assessment retrieval services
│   ├── components/               # Reusable UI components
│   │   ├── Navbar.jsx            # Top navigation bar & brand branding
│   │   ├── Sidebar.jsx           # Dashboard navigation sidebar with role-aware links
│   │   ├── ProtectedRoute.jsx    # Client-side authentication guard wrapper
│   │   ├── Loading.jsx           # Loading spinner & skeleton placeholders
│   │   ├── RiskBadge.jsx         # Risk level visual indicators (Low / Moderate / High)
│   │   └── StatCard.jsx          # Dashboard analytical statistic cards
│   ├── context/                  # Application React Context
│   │   └── AuthContext.jsx       # Authentication state, token restore, login/logout providers
│   ├── pages/                    # Main application routes & page views
│   │   ├── Landing.jsx           # Public landing page with feature showcase
│   │   ├── Login.jsx             # User login form
│   │   ├── Register.jsx          # User account registration form
│   │   ├── Dashboard.jsx         # Athlete & staff analytics dashboard
│   │   ├── Profile.jsx           # Athlete profile management form & identity view
│   │   ├── VideoAnalysis.jsx     # Profile-gated video upload with progress bar & metadata summary
│   │   ├── Athletes.jsx          # Staff view for athlete roster monitoring
│   │   ├── Assessments.jsx       # Assessment history overview page
│   │   └── NotFound.jsx          # 404 fallback page
│   ├── App.jsx                   # Main Router component & route definitions
│   ├── main.jsx                  # React application entrypoint
│   └── index.css                 # Custom Vanilla CSS design tokens, components, and layouts
├── index.html                    # HTML5 entry document
├── vite.config.js                # Vite build & development server configuration
├── tailwind.config.js            # Base Tailwind configuration (utility reference)
├── postcss.config.js             # PostCSS processing configuration
└── package.json                  # Frontend dependencies and scripts
```

---

## 🚀 Key Features Implemented

1. **Authentication & Session Persistence**:
   - Client-side route protection (`ProtectedRoute.jsx`).
   - Token restoration on page refresh via `AuthContext`.
   - Automatic `Authorization: Bearer <token>` insertion via Axios request interceptor.
   - Automatic logout and token clearance on HTTP 401 response.

2. **Athlete Profile Management (`/profile`)**:
   - Read-only display of user identity (`name`, `email`, `role`, `user_id`, `athlete_id`).
   - Profile completeness status badge (`✓ Complete` vs `⚠ Incomplete`).
   - 2-column form for physical metrics (`sport`, `position`, `age`, `height`, `weight`).
   - Single-click upsert saving via `PUT /athletes/me`.

3. **Gated Video Analysis (`/analysis`)**:
   - **Profile Completeness Check**: Unlocks video upload only when all 5 physical fields are complete.
   - **Incomplete Banner**: Displays a warning and a quick-link button to `/profile` if profile data is missing.
   - **Binary Upload**: Uses `multipart/form-data` to submit raw video files up to 500 MB to `POST /videos`.
   - **Real-Time Progress Bar**: Displays upload progress (0–100%).
   - **Metadata Confirmation Card**: Displays returned PostgreSQL storage metadata (`original_filename`, `content_type`, `file_size`, `video_id`, `uploaded_at`).

4. **Staff Roster View (`/athletes`)**:
   - Searchable athlete roster list for Coaches, Physiotherapists, and Sports Scientists.

---

## ⚡ Setup & Run Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `frontend` root directory:
```ini
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

### 3. Start Development Server
```bash
npm run dev
```
The application will start locally at [http://localhost:5173](http://localhost:5173).

### 4. Build for Production
```bash
npm run build
```
The compiled production bundle will be output to `frontend/dist/`.
