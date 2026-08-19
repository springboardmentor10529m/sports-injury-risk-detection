# Sports Injury Risk Detection Platform

A modern web application built to assess, monitor, and manage sports injury risk. It supports separate roles for Athletes (submitting profiles and uploading performance videos) and Experts (coaches, physiotherapists, and administrators viewing dashboards, writing notes, and analyzing uploaded videos).

---

## Technical Stack
- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React, Axios.
- **Backend:** FastAPI, Python 3.11, SQLAlchemy, Uvicorn, PostgreSQL (production/Docker) & SQLite (local development fallback).
- **Deployment:** Docker & Docker Compose.

---

## How to Run the Application

You can run the application in two ways: **Docker Compose (Recommended)** or **Locally (Development mode)**.

### Method 1: Running with Docker Compose (Recommended)
This runs the entire stack (PostgreSQL Database, FastAPI Backend, and React Frontend) inside Docker containers.

1. Make sure you have **Docker** and **Docker Compose** installed on your system.
2. Run the following command in the root folder of the project:
   ```bash
   docker compose up --build
   ```
3. Once running, you can access:
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **Interactive API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Method 2: Running Locally (Without Docker)
To run the components individually for debugging or faster development, follow these steps:

#### 1. Backend Setup (FastAPI)
By default, running locally fallbacks to **SQLite** (a file named `sports_injury.db` will be created automatically).

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # On macOS/Linux:
   python3 -m venv venv
   source venv/bin/activate

   # On Windows:
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the backend development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   *The backend will be running at [http://localhost:8000](http://localhost:8000).*

#### 2. Frontend Setup (React & Vite)
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend will be running at [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal).*

---

## How to Commit and Push Your Changes
Follow these commands in your terminal to save and upload your progress:

1. **Check Status**: See which files you have modified or created:
   ```bash
   git status
   ```

2. **Stage Changes**: Add the files you want to commit.
   - To add everything:
     ```bash
     git add .
     ```
   - To add specific files:
     ```bash
     git add path/to/file.ext
     ```

3. **Commit Changes**: Save your staged files with a clear, descriptive message:
     ```bash
     git commit -m "feat: your commit message describing what you did"
     ```

4. **Pull Latest Changes**: Ensure your branch is updated with remote work and handle any conflicts:
     ```bash
     git pull --rebase origin akhilkumar-thallada
     ```

5. **Push to Remote**: Push your commits to GitHub:
     ```bash
     git push origin akhilkumar-thallada
     ```