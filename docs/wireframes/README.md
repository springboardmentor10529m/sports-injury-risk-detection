# UI / UX Wireframes (Low-Fidelity Layouts)

This document contains low-fidelity wireframe representations for the **Sports Injury Risk Detection System**.

These wireframes define page structure, layout hierarchy, navigation components, input controls, and user interaction flows without focusing on final visual styling.

---

## 🧭 Application Navigation & Shell Wireframe

```
+-----------------------------------------------------------------------------------+
|  [Logo] Sports Injury Risk Detection                     Dashboard  Profile  [Logout] |
+-----------------------------------------------------------------------------------+
|  +-----------------------+  +--------------------------------------------------+  |
|  | MENU                  |  | PAGE HEADER                                      |  |
|  | - Dashboard           |  | Category Eyebrow / Main Heading / Subtitle       |  |
|  | - Profile             |  +--------------------------------------------------+  |
|  | - Video Analysis      |  |                                                  |  |
|  | - Athletes Roster     |  | MAIN CONTENT PANEL AREA                          |  |
|  | - Assessments         |  | (Form / Stats Grid / Tables / Charts / Upload)   |  |
|  |                       |  |                                                  |  |
|  +-----------------------+  +--------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 1. Login Page Wireframe (`/login`)

```
+-----------------------------------------------------------------------------------+
|                                  [Brand Logo]                                     |
|                        Sports Injury Risk Detection System                        |
|                                                                                   |
|                   +--------------------------------------------+                  |
|                   | Sign In to Your Account                    |                  |
|                   | Access your biomechanical analysis & data  |                  |
|                   |                                            |                  |
|                   | Email Address                              |                  |
|                   | [ athlete@example.com                    ] |                  |
|                   |                                            |                  |
|                   | Password                                   |                  |
|                   | [ ******************                     ] |                  |
|                   |                                            |                  |
|                   | [  Sign In Button                        ] |                  |
|                   |                                            |                  |
|                   | Don't have an account? Register here       |                  |
|                   +--------------------------------------------+                  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Register Page Wireframe (`/register`)

```
+-----------------------------------------------------------------------------------+
|                                  [Brand Logo]                                     |
|                        Sports Injury Risk Detection System                        |
|                                                                                   |
|                   +--------------------------------------------+                  |
|                   | Create an Account                          |                  |
|                   | Join the platform to start video analysis  |                  |
|                   |                                            |                  |
|                   | Full Name                                  |                  |
|                   | [ John Doe                               ] |                  |
|                   |                                            |                  |
|                   | Email Address                              |                  |
|                   | [ john@example.com                       ] |                  |
|                   |                                            |                  |
|                   | Password                                   |                  |
|                   | [ ******************                     ] |                  |
|                   |                                            |                  |
|                   | Account Role                               |                  |
|                   | [ Athlete | Coach | Physio | Scientist v ] |                  |
|                   |                                            |                  |
|                   | Phone Number (Optional)                    |                  |
|                   | [ +1234567890                            ] |                  |
|                   |                                            |                  |
|                   | [  Create Account Button                 ] |                  |
|                   |                                            |                  |
|                   | Already have an account? Login here        |                  |
|                   +--------------------------------------------+                  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Dashboard Page Wireframe (`/dashboard`)

```
+-----------------------------------------------------------------------------------+
| [Navbar: Brand, Navigation Links, Profile, Logout]                                |
+------------------+----------------------------------------------------------------+
| Sidebar          | Dashboard Overview                                             |
| - Dashboard (x)  | Welcome back, Athlete Name                                     |
| - Profile        +----------------------------------------------------------------+
| - Video Analysis | STATS CARDS GRID                                               |
| - Athletes       | [Total Videos] [Risk Score %] [Completed] [Active Alert]       |
| - Assessments    +--------------------------------+-------------------------------+
|                  | RECENT ASSESSMENTS PANEL       | OVERALL RISK OVERVIEW PANEL   |
|                  | - Athlete Name | Risk | Action  | [High Risk Bar  |||||| 65%]   |
|                  | - Athlete Name | Risk | Action  | [Moderate Risk  ||||   40%]   |
|                  | - Athlete Name | Risk | Action  | [Low Risk Bar   ||     15%]   |
|                  +--------------------------------+-------------------------------+
+------------------+----------------------------------------------------------------+
```

---

## 4. Athlete Profile Page Wireframe (`/profile`)

```
+-----------------------------------------------------------------------------------+
| [Navbar]                                                                          |
+------------------+----------------------------------------------------------------+
| Sidebar          | ACCOUNT / Your Profile                                         |
| - Profile (x)    | Manage your personal and physical athlete details              |
|                  +----------------------------------------------------------------+
|                  | PANEL: Account Information (Read-Only)                         |
|                  | Name: John Doe  | Email: john@example.com | Role: Athlete      |
|                  | Athlete ID: uuid-123...  | User ID: uuid-456...                   |
|                  | Profile Status: [ ✓ Complete / ⚠ Incomplete ]                  |
|                  +----------------------------------------------------------------+
|                  | PANEL: Athlete Details (Editable Form)                         |
|                  | Required before uploading movement videos                      |
|                  |                                                                |
|                  | Sport                           Position                       |
|                  | [ Football                   ]  [ Midfielder                 ] |
|                  |                                                                |
|                  | Age (yrs)      Height (cm)      Weight (kg)                    |
|                  | [ 24        ]  [ 178         ]  [ 72           ]               |
|                  |                                                                |
|                  | [  Save Profile Button  ]                                      |
|                  | (Displays Success / Error alert box below)                     |
|                  +----------------------------------------------------------------+
+------------------+----------------------------------------------------------------+
```

---

## 5. Video Analysis Page Wireframe (`/analysis`)

### State A: Profile Incomplete (Gate Triggered)
```
+-----------------------------------------------------------------------------------+
| [Navbar]                                                                          |
+------------------+----------------------------------------------------------------+
| Sidebar          | AI ANALYSIS / Video Movement Analysis                          |
| - Analysis (x)   +----------------------------------------------------------------+
|                  | ⚠ WARNING BANNER: Complete your athlete profile first          |
|                  | Video analysis requires Sport, Position, Age, Height, and      |
|                  | Weight to be on record. Please complete your profile first.    |
|                  |                                                                |
|                  | [  Complete Profile Button  ] ----> Navigates to /profile     |
|                  +----------------------------------------------------------------+
|                  | (Video upload area is LOCKED and hidden until complete)        |
+------------------+----------------------------------------------------------------+
```

### State B: Profile Complete (Upload Enabled)
```
+-----------------------------------------------------------------------------------+
| [Navbar]                                                                          |
+------------------+----------------------------------------------------------------+
| Sidebar          | AI ANALYSIS / Video Movement Analysis                          |
| - Analysis (x)   +----------------------------------------------------------------+
|                  | PANEL: Athlete Details Summary Header                          |
|                  | Sport: Football | Position: Midfielder | Age: 24 | H: 178 | W: 72  |
|                  +----------------------------------------------------------------+
|                  | PANEL: Upload Movement Video                                   |
|                  | Supported formats: MP4, MOV, AVI, WebM (Max 500 MB)            |
|                  |                                                                |
|                  | +------------------------------------------------------------+ |
|                  | |               [ Upload Cloud Video Icon ]                  | |
|                  | |            Drag & drop or Click to choose video            | |
|                  | |                 (Selected: sprint_test.mp4 - 14.2 MB)      | |
|                  | +------------------------------------------------------------+ |
|                  |                                                                |
|                  | [  Upload & Analyse Button  ]                                  |
|                  |                                                                |
|                  | [Progress Bar: ========================> 100%]                 |
|                  +----------------------------------------------------------------+
|                  | SUCCESS CARD: Video Saved to Database                          |
|                  | File: sprint_test.mp4 | Size: 14.2 MB | Type: video/mp4        |
|                  | Status: ✓ uploaded    | ID: uuid-789...| Date: 2026-08-19...   |
|                  +----------------------------------------------------------------+
+------------------+----------------------------------------------------------------+
```

---

## 6. Results Panel Wireframe (`/analysis` - Results View)

```
+-----------------------------------------------------------------------------------+
| PANEL: Biomechanical Analysis Results (PLANNED CV MODEL INTEGRATION)              |
+-----------------------------------------------------------------------------------+
|  [Overall Risk Score: 68%]             [Risk Level: HIGH RISK BADGE]              |
+------------------------------------+----------------------------------------------+
| KINEMATIC JOINT METRICS            | SKELETON OVERLAY / MOVEMENT FINDINGS         |
| - Knee Valgus Angle: 14.2° (High)  | - Excessive dynamic knee valgus during landing|
| - Hip Stability Score: 42/100      | - Asymmetric trunk lean during deceleration  |
| - Stride Length Asymmetry: 8.5%    | - Elevated impact force on right heel strike |
+------------------------------------+----------------------------------------------+
```

---

## 7. Recommendations Panel Wireframe (Planned Feature)

```
+-----------------------------------------------------------------------------------+
| PANEL: AI & Clinician Targeted Recommendations (PLANNED FEATURE)                   |
+-----------------------------------------------------------------------------------+
| PREVENTATIVE EXERCISES             | MOBILITY & RECOVERY PROTOCOL                 |
| - Single-leg stability squats      | - Foam rolling: IT-Band & Gluteus Medius     |
| - Glute medius band walks          | - Dynamic hip flexor mobility drills         |
| - Drop jump landing control        | - 48-hour high-impact jump load reduction    |
+------------------------------------+----------------------------------------------+
```

---

## 8. Reports & Assessments List Wireframe (`/assessments`)

```
+-----------------------------------------------------------------------------------+
| PANEL: Assessment History & Export Reports (PLANNED PDF EXPORTER)                  |
+-----------------------------------------------------------------------------------+
| [Search Box: Search assessments...     ]  [Filter: All Roles v]                   |
|                                                                                   |
| DATE       | ATHLETE NAME   | ACTIVITY    | RISK SCORE | STATUS     | ACTIONS     |
| 2026-08-19 | Alex Morgan    | Drop Jump   | 68% (High) | Completed  | [View Report|PDF]
| 2026-08-18 | Marcus Rashford| Sprint      | 22% (Low)  | Completed  | [View Report|PDF]
| 2026-08-15 | Sam Kerr       | Side Shuffle| 45% (Med)  | Processing | [View Details] |
+-----------------------------------------------------------------------------------+
```
