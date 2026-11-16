import uuid

import pytest


def register(client, email="owner@example.com"):
    response = client.post("/auth/register", json={
        "email": email, "password": "TestPassword123!", "display_name": "Task Owner",
    })
    assert response.status_code == 201
    return response.json()


def test_task_lifecycle(client):
    register(client)
    assert client.get("/tasks").json() == []
    response = client.post("/tasks", json={
        "title": "  Build LifeOS  ", "description": "Ship task management",
        "priority": "high", "estimated_minutes": 45, "due_date": "2026-11-20",
    })
    assert response.status_code == 201
    task = response.json()
    assert task["title"] == "Build LifeOS"
    assert task["status"] == "pending"
    assert task["created_at"]
    task_url = f'/tasks/{task["id"]}'
    assert client.get(task_url).json() == task
    assert client.get("/tasks").json() == [task]

    updated = client.patch(task_url, json={"status": "in_progress", "title": "Finish LifeOS"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "in_progress"
    assert updated.json()["description"] == "Ship task management"
    assert updated.json()["estimated_minutes"] == 45
    assert client.patch(task_url, json={"status": "completed"}).json()["status"] == "completed"
    assert client.patch(task_url, json={"status": "pending"}).json()["status"] == "pending"
    cleared = client.patch(task_url, json={"due_date": None, "description": None})
    assert cleared.json()["due_date"] is None
    assert cleared.json()["description"] is None
    assert client.get(task_url).json()["title"] == "Finish LifeOS"
    assert client.delete(task_url).status_code == 204
    assert client.get(task_url).status_code == 404
    assert client.get("/tasks").json() == []


def test_task_defaults(client):
    register(client)
    task = client.post("/tasks", json={"title": "Small step"}).json()
    assert task["status"] == "pending"
    assert task["priority"] == "medium"
    assert task["estimated_minutes"] == 30
    assert task["due_date"] is None
    assert task["description"] is None


def test_tasks_are_isolated_between_accounts(client):
    register(client)
    owner_task = client.post("/tasks", json={"title": "Private task"}).json()
    client.post("/auth/logout")
    register(client, "other@example.com")
    own_task = client.post("/tasks", json={"title": "Other user's task"}).json()
    assert client.get("/tasks").json() == [own_task]
    task_url = f'/tasks/{owner_task["id"]}'
    assert client.get(task_url).status_code == 404
    assert client.patch(task_url, json={"title": "Stolen"}).status_code == 404
    assert client.delete(task_url).status_code == 404
    client.post("/auth/login", json={"email": "owner@example.com", "password": "TestPassword123!"})
    assert client.get(task_url).json()["title"] == "Private task"
    assert client.get("/tasks").json() == [owner_task]


@pytest.mark.parametrize("method,path,payload", [
    ("get", "/tasks", None),
    ("post", "/tasks", {"title": "Not allowed"}),
    ("get", f"/tasks/{uuid.uuid4()}", None),
    ("patch", f"/tasks/{uuid.uuid4()}", {"status": "completed"}),
    ("delete", f"/tasks/{uuid.uuid4()}", None),
])
def test_tasks_require_authentication(client, method, path, payload):
    kwargs = {"json": payload} if payload is not None else {}
    assert getattr(client, method)(path, **kwargs).status_code == 401


@pytest.mark.parametrize("payload", [
    {"title": "   "}, {"title": "x" * 201}, {"description": "x" * 5001},
    {"status": "unknown"}, {"priority": "urgent"},
    {"estimated_minutes": 0}, {"estimated_minutes": -1},
    {"estimated_minutes": 10081}, {"estimated_minutes": 1.5},
    {"estimated_minutes": True}, {"due_date": "not-a-date"},
    {"user_id": str(uuid.uuid4())}, {"id": str(uuid.uuid4())},
    {"title": None}, {"status": None}, {"priority": None}, {"estimated_minutes": None},
])
def test_invalid_task_input_rejected_for_create_and_update(client, payload):
    register(client)
    task = client.post("/tasks", json={"title": "Valid task"}).json()
    assert client.post("/tasks", json={"title": "Valid task", **payload}).status_code == 422
    assert client.patch(f'/tasks/{task["id"]}', json=payload).status_code == 422
    assert client.get(f'/tasks/{task["id"]}').json() == task


def test_filters_combine_and_remain_scoped_to_user(client):
    register(client)
    high = client.post("/tasks", json={"title": "High", "priority": "high"}).json()
    client.post("/tasks", json={"title": "Done", "status": "completed", "priority": "high"})
    client.post("/tasks", json={"title": "Low", "priority": "low"})
    result = client.get("/tasks?status=pending&priority=high")
    assert result.status_code == 200
    assert result.json() == [high]
    assert client.get("/tasks?status=unknown").status_code == 422


def test_missing_task_returns_404(client):
    register(client)
    task_url = f"/tasks/{uuid.uuid4()}"
    assert client.get(task_url).status_code == 404
    assert client.patch(task_url, json={"title": "Missing"}).status_code == 404
    assert client.delete(task_url).status_code == 404
