# FarmGuard AI

FarmGuard AI is a full-stack farm weather-risk monitoring application. It helps farmers and field officers register an account, create farm profiles, fetch weather forecasts, generate farm-specific risk assessments, request Gemini-powered advisories, and preview farmer alert messages.

The project is split into two sibling applications:

```txt
FarmGuard/
  backend/    Django REST API, weather/risk/AI services, tests
  frontend/   React + TypeScript + Vite dashboard
```

## Features

- JWT-based user registration, login, session restore, and logout
- Farm CRUD scoped to the authenticated user
- Dashboard summary with total farms and risk-level counts
- Open-Meteo weather snapshot fetching and caching
- Farm weather-risk scoring with drivers and recommended actions
- Gemini AI advisory generation
- Alert preview for SMS-style farmer notifications
- History views for weather snapshots, risk assessments, and AI insights
- Backend test suite with coverage configuration
- Frontend unit/integration tests with Vitest and Testing Library

## Tech Stack

Backend:

- Python
- Django
- Django REST Framework
- SimpleJWT
- SQLite for local development
- Open-Meteo API integration
- Gemini API integration
- Coverage.py

Frontend:

- React
- TypeScript
- Vite
- Vitest
- Testing Library
- jsdom

## Local Prerequisites

- Python 3.12+ recommended
- Node.js and npm
- A Gemini API key if you want AI insight generation to work locally

The weather feature uses Open-Meteo and does not require a frontend API key.

## Backend Setup

From the backend folder:

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The backend runs by default at:

```txt
http://127.0.0.1:8000
```

Health check:

```txt
GET http://127.0.0.1:8000/api/health/
```

## Backend Environment Variables

Create or update `backend/.env`:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

If `GEMINI_API_KEY` is missing, the AI insight endpoint returns an upstream-style error and the rest of the application still works.

## Frontend Setup

From the frontend folder:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs by default at:

```txt
http://127.0.0.1:5173
```

The frontend uses this API base URL by default:

```txt
http://127.0.0.1:8000/api
```

To point the frontend to a different backend, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## CORS

The backend is configured for the local Vite development origins:

```txt
http://127.0.0.1:5173
http://localhost:5173
```

If you use a different frontend host or port, update `backend/backend/settings.py`.

## Recommended Development Workflow

Start the backend:

```bash
cd backend
python manage.py runserver
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Then open:

```txt
http://127.0.0.1:5173
```

## Docker Setup

The project includes Docker support for both sub-applications:

- `backend/Dockerfile` builds the Django API and serves it with Gunicorn.
- `frontend/Dockerfile` builds the Vite React app and serves the static files with Nginx.
- `docker-compose.yml` runs both services together.

From the parent `FarmGuard/` folder:

```bash
docker compose build
docker compose up
```

Or run in the background:

```bash
docker compose up -d --build
```

Docker publishes:

```txt
Frontend: http://127.0.0.1:5173
Backend:  http://127.0.0.1:8000
```

The backend container reads environment variables from:

```txt
backend/.env
```

The Docker Compose setup stores SQLite data in a named Docker volume mounted at `/data` inside the backend container. The backend uses:

```txt
SQLITE_PATH=/data/db.sqlite3
```

Useful Docker commands:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
docker compose down -v
```

Use `docker compose down -v` only when you intentionally want to remove the persisted local SQLite volume.

Typical user flow:

1. Register or log in.
2. Create a farm profile with county, coordinates, crop type, acreage, and notes.
3. Open the farm detail page.
4. Fetch weather.
5. Generate a risk assessment.
6. Generate a Gemini advisory.
7. Preview the alert message.
8. Review history records.

## Core API Endpoints

All protected endpoints require:

```http
Authorization: Bearer <access_token>
```

Public endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health/` | Backend health check |
| `POST` | `/api/auth/register/` | Create user and return JWT tokens |
| `POST` | `/api/auth/login/` | Authenticate and return JWT tokens |
| `POST` | `/api/auth/token/refresh/` | Refresh access token |

Authenticated endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/me/` | Current authenticated user |
| `GET` | `/api/farms/dashboard/` | Dashboard summary and farm list |
| `GET` | `/api/farms/` | List farms |
| `POST` | `/api/farms/` | Create farm |
| `GET` | `/api/farms/{id}/` | Retrieve farm |
| `PATCH` | `/api/farms/{id}/` | Partially update farm |
| `PUT` | `/api/farms/{id}/` | Fully update farm |
| `DELETE` | `/api/farms/{id}/` | Delete farm |
| `GET` | `/api/farms/{id}/weather/` | Fetch or reuse cached weather |
| `GET` | `/api/farms/{id}/weather/?refresh=true` | Force fresh weather |
| `POST` | `/api/farms/{id}/risk/` | Generate risk assessment |
| `POST` | `/api/farms/{id}/generate-insight/` | Generate Gemini advisory |
| `GET` | `/api/farms/{id}/alert-preview/` | Preview simulated alert |
| `GET` | `/api/weather-snapshots/` | Weather snapshot history |
| `GET` | `/api/risk-assessments/` | Risk assessment history |
| `GET` | `/api/ai-insights/` | AI advisory history |

For more backend API details, see:

```txt
backend/ENDPOINTS.md
```

## Important Data Flow

The weather/risk/AI workflow is intentionally ordered:

```txt
Farm
  -> WeatherSnapshot
  -> RiskAssessment
  -> AIInsight
  -> Alert Preview
```

Risk generation requires at least one weather snapshot. AI insight generation requires at least one risk assessment with a weather snapshot attached.

The frontend farm detail page automatically hydrates existing saved weather, risk, AI insight, and alert-preview data when a farm is opened. Users do not need to manually refresh just to see previously generated records.

## Backend Tests

From `backend/`:

```bash
python manage.py test
```

Coverage:

```bash
python -m coverage run manage.py test
python -m coverage report
```

The backend coverage configuration is in:

```txt
backend/.coveragerc
```

Current backend coverage target is 90%.

## Frontend Tests

From `frontend/`:

```bash
npm run test
```

Coverage:

```bash
npm run test:coverage
```

The frontend test suite uses Vitest, jsdom, Testing Library, and user-event. It covers authentication, session restore, dashboard loading, farm creation, farm detail hydration, weather/risk/AI/alert actions, history loading, and advisory formatting helpers.

Coverage thresholds are configured in:

```txt
frontend/vitest.config.ts
```

Current frontend coverage gate:

- Lines: 70%
- Statements: 70%
- Functions: 70%
- Branches: 60%

## Build and Lint

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Backend:

```bash
cd backend
python manage.py test
```

## AI Advisory Formatting

Gemini responses are requested as plain text, not Markdown. The backend also cleans common formatting artifacts before saving the response.

The frontend parses advisory text into readable section cards:

1. Situation Summary
2. Crop-Specific Weather Fit
3. Key Risks
4. Recommended Actions
5. SMS Alert Version

This keeps older saved advisories readable even if Gemini returned Markdown-style text.

## Known Development Notes

- Farm alert preview currently uses the farm owner's `phone_number`. The `Farm.contact_phone` field was removed from the backend model.
- History endpoints are available for frontend display and debugging.
- The frontend stores JWT tokens in `localStorage` under:
  - `farmguard_access`
  - `farmguard_refresh`
- If the frontend cannot call the backend in the browser, check that:
  - Django is running on port `8000`
  - Vite is running on port `5173`
  - CORS origins in `backend/backend/settings.py` include the frontend origin

## Repository Structure

```txt
FarmGuard/
  README.md
  backend/
    backend/
      settings.py
      urls.py
    core/
    farms/
      models.py
      serializers.py
      views.py
      urls.py
      tests.py
    services/
      open_meteo.py
      risk_engine.py
      gemini.py
    users/
      models.py
      serializers.py
      views.py
      urls.py
      tests.py
    ENDPOINTS.md
    manage.py
    requirements.txt
  frontend/
    src/
      App.tsx
      App.css
      advisory.ts
      App.test.tsx
      test/
        setup.ts
    package.json
    vite.config.ts
    vitest.config.ts
```

## Quick Verification Checklist

Use this after pulling changes or setting up a new environment:

```bash
cd backend
python manage.py test
```

```bash
cd frontend
npm run lint
npm run build
npm run test:coverage
```

Then manually verify:

1. Register a user.
2. Create a farm.
3. Open the farm detail page.
4. Fetch weather.
5. Generate risk.
6. Generate AI insight.
7. Preview alert.
8. Navigate away and reopen the farm detail page to confirm saved data appears automatically.
