"""
AI Sports Injury Risk Detection Platform
========================================
Run with: python app.py
"""
import sys
import os
import subprocess

root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    print("\n" + "=" * 55)
    print("  AI Sports Injury Risk Detection Platform")
    print("=" * 55)

    required = [
        "fastapi", "uvicorn", "sqlalchemy", "reportlab", "openpyxl",
        "python-jose", "python-multipart", "email-validator"
    ]

    print("[1/2] Checking dependencies...")
    subprocess.run(
        [sys.executable, "-m", "pip", "install"] + required + ["--quiet"],
        check=False
    )

    print("[2/2] Starting server at http://127.0.0.1:8000 ...")
    print("      Press Ctrl+C to stop.\n")

    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        app_dir=backend_dir,
        reload=False
    )
