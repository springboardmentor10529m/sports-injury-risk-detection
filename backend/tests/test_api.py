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


def test_auth_login_success_for_athlete():
    response = client.post('/api/auth/login', json={'email': 'athlete@sportslab.ai', 'password': 'password123'})
    assert response.status_code == 200
    payload = response.json()
    assert payload['user']['role'] == 'athlete'
    assert 'token' in payload


def test_role_dashboard_requires_authentication():
    response = client.get('/api/dashboard?role=coach')
    assert response.status_code == 401


def test_signup_creates_user_with_uid():
    response = client.post(
        '/api/auth/signup',
        json={
            'name': 'Liam Green',
            'email': 'liam.green@example.com',
            'password': 'SecurePass123',
            'role': 'coach',
            'sport': 'Hockey',
            'position': 'Assistant Coach',
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload['user']['email'] == 'liam.green@example.com'
    assert payload['user']['firebase_uid']
    assert 'token' in payload
