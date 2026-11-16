
def register_test_user(client):
    return client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "password": "TestPassword123!",
            "display_name": "Test User",
        },
    )


def test_register_user(client):
    response = register_test_user(client)

    assert response.status_code == 201

    data = response.json()

    assert data["email"] == "test@example.com"
    assert data["display_name"] == "Test User"
    assert data["is_active"] is True
    assert "password" not in data
    assert "password_hash" not in data


def test_duplicate_email_rejected(client):
    first_response = register_test_user(client)
    second_response = register_test_user(client)

    assert first_response.status_code == 201
    assert second_response.status_code == 409


def test_login_user(client):
    register_test_user(client)

    response = client.post(
        "/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"
    assert "access_token" not in response.json()

    cookie = response.headers["set-cookie"].lower()

    assert "httponly" in cookie
    assert "lifeos_access_token" in cookie


def test_incorrect_password_rejected(client):
    register_test_user(client)

    response = client.post(
        "/auth/login",
        json={
            "email": "test@example.com",
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401


def test_get_current_user(client):
    register_test_user(client)

    login_response = client.post(
        "/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPassword123!",
        },
    )

    assert login_response.status_code == 200

    # TestClient automatically retains the login cookie.
    response = client.get("/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"
    assert response.json()["display_name"] == "Test User"


def test_unauthenticated_user_cannot_access_me(client):
    response = client.get("/auth/me")

    assert response.status_code == 401

def test_logout_user(client):
    register_test_user(client)

    client.post(
        "/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPassword123!",
        },
    )

    account_response = client.get("/auth/me")
    assert account_response.status_code == 200

    logout_response = client.post("/auth/logout")
    assert logout_response.status_code == 204

    account_response = client.get("/auth/me")
    assert account_response.status_code == 401

def test_registration_starts_session(client):
    response = register_test_user(client)
    cookie = response.headers['set-cookie'].lower()
    assert 'httponly' in cookie
    assert 'samesite=lax' in cookie
    assert 'max-age=' in cookie
    assert client.get('/auth/me').json()['id'] == response.json()['id']


def test_email_matching_is_case_insensitive(client):
    register_test_user(client)
    duplicate = client.post('/auth/register', json={
        'email': 'TEST@example.com', 'password': 'TestPassword123!',
        'display_name': 'Another User',
    })
    assert duplicate.status_code == 409
    client.post('/auth/logout')
    response = client.post('/auth/login', json={
        'email': 'TEST@example.com', 'password': 'TestPassword123!',
    })
    assert response.status_code == 200
    assert client.get('/auth/me').status_code == 200


def test_registration_rejects_blank_name(client):
    response = client.post('/auth/register', json={
        'email': 'test@example.com', 'password': 'TestPassword123!',
        'display_name': '   ',
    })
    assert response.status_code == 422
    assert client.get('/auth/me').status_code == 401


def test_registration_trims_name(client):
    response = client.post('/auth/register', json={
        'email': 'test@example.com', 'password': 'TestPassword123!',
        'display_name': '  Test User  ',
    })
    assert response.status_code == 201
    assert response.json()['display_name'] == 'Test User'


def test_invalid_session_cookie_rejected(client):
    client.cookies.set('lifeos_access_token', 'invalid-token')
    assert client.get('/auth/me').status_code == 401


def test_expired_session_cookie_rejected(client):
    from datetime import datetime, timedelta, timezone
    import jwt
    from app.core.config import settings

    user = register_test_user(client).json()
    expired_token = jwt.encode({
        'sub': user['id'],
        'exp': datetime.now(timezone.utc) - timedelta(seconds=1),
    }, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    client.cookies.clear()
    client.cookies.set('lifeos_access_token', expired_token)
    assert client.get('/auth/me').status_code == 401


def test_unknown_user_cannot_login(client):
    response = client.post('/auth/login', json={
        'email': 'unknown@example.com', 'password': 'TestPassword123!',
    })
    assert response.status_code == 401
    assert client.get('/auth/me').status_code == 401


def test_inactive_account_cannot_login_or_use_existing_session(client):
    import uuid
    from app.database import get_db
    from app.main import app
    from app.models import User

    user_id = register_test_user(client).json()['id']
    get_test_db = app.dependency_overrides[get_db]
    sessions = get_test_db()
    db = next(sessions)
    try:
        user = db.get(User, uuid.UUID(user_id))
        user.is_active = False
        db.commit()
    finally:
        sessions.close()

    assert client.get('/auth/me').status_code == 401
    response = client.post('/auth/login', json={
        'email': 'test@example.com', 'password': 'TestPassword123!',
    })
    assert response.status_code == 401


def test_secure_cookie_configuration(client, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, 'cookie_secure', True)
    response = register_test_user(client)
    assert 'secure' in response.headers['set-cookie'].lower()
    logout = client.post('/auth/logout')
    assert 'secure' in logout.headers['set-cookie'].lower()
    assert 'max-age=0' in logout.headers['set-cookie'].lower()
