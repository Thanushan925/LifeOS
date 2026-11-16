# LifeOS

Personal weekly planning assistant built with React, TypeScript, Vite, FastAPI,
PostgreSQL, SQLAlchemy, and Alembic.

## Implemented

- Account registration, login, session restoration, and logout using HttpOnly cookies.
- Tasks: create, list, edit, complete/reopen, and delete, scoped to the signed-in account.
- Task status and priority filters, estimated duration, notes, and optional due dates.

Calendar integration and weekly planning are still in development.

## Run locally

Start PostgreSQL (for the Homebrew installation used by this project):

```sh
brew services start postgresql@18
```

In one terminal, start the backend after applying database migrations:

```sh
cd backend
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload
```

Backend configuration is loaded from `backend/.env`. It requires `DB_PASSWORD`
and `JWT_SECRET_KEY`; database host, port, name, and user have local development
defaults in `app/core/config.py`. Production HTTPS deployments should set
`COOKIE_SECURE=true` and configure allowed frontend origins.

In another terminal:

```sh
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` requests to the backend at
http://127.0.0.1:8000. API documentation is at http://localhost:8000/docs.

## Task API

All task endpoints require a signed-in session:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/tasks` | List your tasks; optional `status` and `priority` filters |
| POST | `/tasks` | Create a task |
| GET | `/tasks/{id}` | Get one of your tasks |
| PATCH | `/tasks/{id}` | Update selected fields |
| DELETE | `/tasks/{id}` | Permanently delete a task |

Status values: `pending`, `in_progress`, `completed`. Priority values: `low`,
`medium`, `high`. Estimated duration is 1–10,080 minutes (default 30).
Due dates are calendar dates (`YYYY-MM-DD`), not timestamps. Send `null` to clear
notes or a due date; omit a field from PATCH to keep its current value.

## Checks

Backend (from `backend` with the virtual environment active):

```sh
python -m pytest -q
alembic check
```

Backend tests use isolated in-memory SQLite databases. `alembic check` inspects
the configured PostgreSQL database for schema differences.

Frontend (from `frontend`, using the project's Node 25 environment):

```sh
npm test
npm run build
npm run lint
```
