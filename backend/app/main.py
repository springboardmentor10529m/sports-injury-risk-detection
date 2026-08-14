from fastapi import FastAPI

app = FastAPI(title="Sports Injury Risk Detection - Backend (Skeleton)")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "backend"}


@app.get("/api/info")
def info():
    return {
        "project": "Sports Injury Risk Detection",
        "description": "Backend skeleton - no AI or DB integration",
    }
