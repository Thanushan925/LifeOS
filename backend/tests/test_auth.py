
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