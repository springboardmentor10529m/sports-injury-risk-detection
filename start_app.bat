@echo off
echo ============================================
echo   AI Sports Injury Risk Detection Platform
echo ============================================
echo.

cd /d "%~dp0backend"

echo [1/3] Activating virtual environment...
call venv\Scripts\activate.bat

echo [2/3] Installing required packages...
pip install reportlab openpyxl fastapi uvicorn sqlalchemy python-jose passlib python-multipart aiofiles --quiet

echo [3/3] Starting server at http://127.0.0.1:8000 ...
echo.
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
