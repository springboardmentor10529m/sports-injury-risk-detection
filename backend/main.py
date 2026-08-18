from fastapi import FastAPI
from database.database import test_database_connection

app = FastAPI(
    title="Sports Injury Risk Detection API",
    description="Backend API for Sports Injury Risk Detection from Video",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "Sports Injury Risk Detection API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.get("/db-test")
def database_test():
    if test_database_connection():
        return {
            "status": "success",
            "message": "PostgreSQL database connection successful"
        }

    return {
        "status": "error",
        "message": "PostgreSQL database connection failed"
    }