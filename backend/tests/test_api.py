from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get('/health')
    assert response.status_code == 200
    payload = response.json()
    assert payload['status'] == 'ok'


def test_dashboard_endpoint():
    response = client.get('/api/dashboard')
    assert response.status_code == 200
    payload = response.json()
    assert 'summary' in payload
    assert 'athletes' in payload
    assert len(payload['athletes']) >= 1


def test_influx_schema_endpoint():
    response = client.get('/api/influx/schema')
    assert response.status_code == 200
    payload = response.json()
    assert 'measurement' in payload
    assert 'fields' in payload
    assert 'tags' in payload
