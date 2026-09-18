# SportShield Backend API Server

FastAPI-powered asynchronous backend application providing video ingestion, computer vision pose tracking (Google MediaPipe), biomechanical feature calculations, machine learning classification (Scikit-learn Random Forest), and clinical deterministic injury risk estimation.

---

## 🛠️ Tech Stack & Key Libraries
- **FastAPI**: Asynchronous web framework & REST routing
- **Uvicorn**: ASGI web server
- **OpenCV (`opencv-python-headless`)**: Video decoding and frame sampling
- **Google MediaPipe (`mediapipe`)**: Deep learning PoseLandmarker task engine (33 3D skeletal landmarks)
- **Scikit-learn**: Supervised Random Forest Classifier for overall risk categorization & probability extraction
- **NumPy & Pandas**: Vector geometry, kinematic calculations, and dataset loading
- **SQLAlchemy**: ORM with PostgreSQL and SQLite fallback support
- **Pydantic**: Request/response payload validation

---

## 🚀 Quick Start

```bash
# 1. Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Initialize database
python init_db.py

# 4. Start API server
uvicorn main:app --reload --port 8000
```

- Swagger UI: `http://localhost:8000/docs`
- Redoc UI: `http://localhost:8000/redoc`

---

## 🧪 Diagnostic Verification
```bash
python verify_platform.py
```
