from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

load_dotenv()

app = FastAPI(title="Sports Injury Risk Detection - Backend")


def get_influx_client():
    url = os.getenv('INFLUX_URL')
    token = os.getenv('INFLUX_TOKEN')
    org = os.getenv('INFLUX_ORG')
    if not url or not token or not org:
        return None
    return InfluxDBClient(url=url, token=token, org=org)


@app.get('/health')
def health_check():
    return {"status": "ok", "service": "backend"}


@app.get('/api/info')
def info():
    return {"project": "Sports Injury Risk Detection", "description": "Backend skeleton - InfluxDB optional"}


class Athlete(BaseModel):
    athlete_id: str
    age: int | None = None
    sport: str | None = None


@app.post('/api/athlete')
def create_athlete(a: Athlete):
    """Create athlete record and write a simple metric to InfluxDB if configured."""
    client = get_influx_client()
    if client:
        write_api = client.write_api(write_options=SYNCHRONOUS)
        p = Point('athlete')\
            .tag('athlete_id', a.athlete_id)\
            .field('age', a.age if a.age is not None else 0)\
            .field('sport', a.sport if a.sport else '')\
            .time(None, WritePrecision.NS)
        try:
            bucket = os.getenv('INFLUX_BUCKET')
            if not bucket:
                raise ValueError('INFLUX_BUCKET not set')
            write_api.write(bucket=bucket, org=os.getenv('INFLUX_ORG'), record=p)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f'InfluxDB write failed: {e}')
    return {"status": "created", "athlete": a}

