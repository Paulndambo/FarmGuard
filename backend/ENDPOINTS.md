# FarmGuard AI Backend API Endpoints

This document describes the REST API exposed by the **FarmGuard AI Django REST backend**.

It is written for a frontend developer or AI agent building a frontend dashboard for the backend.

The backend provides:

- User registration and JWT authentication
- Farm CRUD
- Farm dashboard summary
- Open-Meteo weather forecast integration
- Weather snapshot caching
- Farm-level weather risk scoring
- Gemini-generated AI farm advisory
- SMS-style alert preview
- Read-only history endpoints for weather snapshots, risk assessments, and AI insights

---

## 1. Base URL

### Local development

```txt
http://127.0.0.1:8000
```

### API prefix

```txt
/api/
```

Example full URL:

```txt
http://127.0.0.1:8000/api/farms/
```

For production, replace the local base URL with the deployed backend URL.

Example:

```txt
https://your-backend.onrender.com/api/farms/
```

---

## 2. Authentication Overview

The backend uses **JWT authentication** through Django REST Framework SimpleJWT.

Most endpoints require this header:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

The frontend should store:

- `access` token for authenticated API calls
- `refresh` token for obtaining a new access token when the current one expires

Recommended frontend auth flow:

```txt
Register or login
→ Store access and refresh tokens
→ Send access token in Authorization header
→ If access token expires, call token refresh endpoint
→ Retry failed request with new access token
```

---

## 3. Common Headers

### JSON requests

```http
Content-Type: application/json
Accept: application/json
```

### Authenticated JSON requests

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <ACCESS_TOKEN>
```

---

## 4. Standard Error Patterns

### 400 Bad Request

Usually caused by invalid request body, missing required fields, or invalid workflow order.

Example:

```json
{
  "error": "No weather snapshot found. Call GET /api/farms/{id}/weather/ first."
}
```

### 401 Unauthorized

Usually caused by missing, expired, or invalid JWT token.

Example:

```json
{
  "detail": "Authentication credentials were not provided."
}
```

or:

```json
{
  "detail": "Given token not valid for any token type",
  "code": "token_not_valid",
  "messages": [
    {
      "token_class": "AccessToken",
      "token_type": "access",
      "message": "Token is invalid or expired"
    }
  ]
}
```

### 404 Not Found

Usually caused by requesting a farm or object that does not exist or does not belong to the authenticated user.

Example:

```json
{
  "detail": "Not found."
}
```

### 502 Bad Gateway

Usually caused by an upstream failure from Open-Meteo or Gemini.

Example:

```json
{
  "error": "Gemini rate limit exceeded.",
  "provider": "gemini",
  "status_code": 429,
  "details": {
    "error": {
      "message": "Quota exceeded"
    }
  }
}
```

---

# 5. Recommended Frontend Workflow

A normal dashboard flow should look like this:

```txt
1. POST /api/auth/register/ or POST /api/auth/login/
2. Store access and refresh tokens
3. GET /api/me/
4. GET /api/farms/dashboard/
5. POST /api/farms/ to create farm, if no farm exists
6. GET /api/farms/{farm_id}/weather/
7. POST /api/farms/{farm_id}/risk/
8. POST /api/farms/{farm_id}/generate-insight/
9. GET /api/farms/{farm_id}/alert-preview/
```

Important: risk generation depends on a weather snapshot.

Therefore, the frontend should call:

```txt
GET /api/farms/{id}/weather/
```

before:

```txt
POST /api/farms/{id}/risk/
```

AI insight generation depends on a risk assessment.

Therefore, the frontend should call:

```txt
POST /api/farms/{id}/risk/
```

before:

```txt
POST /api/farms/{id}/generate-insight/
```

---

# 6. Public Endpoints

These endpoints do **not** require authentication.

---

## 6.1 Health Check

Checks whether the backend is running.

### Endpoint

```http
GET /api/health/
```

### Auth required

No.

### cURL

```bash
curl http://127.0.0.1:8000/api/health/
```

### Sample response

```json
{
  "status": "ok",
  "service": "FarmGuard AI Backend",
  "time": "2026-06-16T10:45:22.112319Z"
}
```

### Frontend usage

Use this endpoint for deployment checks or simple backend availability tests.

---

# 7. Authentication Endpoints

---

## 7.1 Register User

Creates a new user account and returns JWT tokens immediately.

### Endpoint

```http
POST /api/auth/register/
```

### Auth required

No.

### Request body

```json
{
  "first_name": "Paul",
  "last_name": "Ndambo",
  "username": "paul",
  "email": "paul@example.com",
  "password": "StrongPass123!",
  "password_confirm": "StrongPass123!"
}
```

### Field notes

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `first_name` | string | No | User's first name |
| `last_name` | string | No | User's last name |
| `username` | string | Yes | Must be unique |
| `email` | string | Recommended | Must be unique if provided |
| `password` | string | Yes | Minimum 8 characters and must pass Django validators |
| `password_confirm` | string | Yes | Must match `password` |

### cURL

```bash
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Paul",
    "last_name": "Ndambo",
    "username": "paul",
    "email": "paul@example.com",
    "password": "StrongPass123!",
    "password_confirm": "StrongPass123!"
  }'
```

### Sample success response

```json
{
  "message": "User registered successfully.",
  "user": {
    "id": 1,
    "username": "paul",
    "email": "paul@example.com",
    "first_name": "Paul",
    "last_name": "Ndambo",
    "full_name": "Paul Ndambo",
    "date_joined": "2026-06-16T10:46:02.557119Z"
  },
  "tokens": {
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token-here",
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access-token-here"
  }
}
```

### Sample validation error

```json
{
  "email": [
    "A user with this email already exists."
  ]
}
```

or:

```json
{
  "password_confirm": [
    "Passwords do not match."
  ]
}
```

### Frontend usage

After successful registration:

1. Save `tokens.access`
2. Save `tokens.refresh`
3. Redirect user to dashboard
4. Call `GET /api/me/` or `GET /api/farms/dashboard/`

---

## 7.2 Login

Authenticates an existing user and returns JWT access and refresh tokens.

### Endpoint

```http
POST /api/auth/login/
```

### Auth required

No.

### Request body

SimpleJWT default login uses `username` and `password`.

```json
{
  "username": "paul",
  "password": "StrongPass123!"
}
```

### cURL

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "paul",
    "password": "StrongPass123!"
  }'
```

### Sample success response

```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token-here",
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access-token-here"
}
```

### Sample invalid credentials response

```json
{
  "detail": "No active account found with the given credentials"
}
```

### Frontend usage

After login:

1. Save `access` token
2. Save `refresh` token
3. Redirect to dashboard
4. Use the access token for all protected API calls

---

## 7.3 Refresh Access Token

Generates a new access token using a valid refresh token.

### Endpoint

```http
POST /api/auth/token/refresh/
```

### Auth required

No access token required, but a valid refresh token is required in the request body.

### Request body

```json
{
  "refresh": "REFRESH_TOKEN_HERE"
}
```

### cURL

```bash
curl -X POST http://127.0.0.1:8000/api/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "REFRESH_TOKEN_HERE"
  }'
```

### Sample success response

```json
{
  "access": "NEW_ACCESS_TOKEN_HERE"
}
```

### Sample invalid refresh response

```json
{
  "detail": "Token is invalid or expired",
  "code": "token_not_valid"
}
```

### Frontend usage

When a protected request returns `401`, the frontend should:

1. Call this endpoint with the saved refresh token
2. Store the new access token
3. Retry the original request
4. If refresh fails, log the user out

---

## 7.4 Get Current User

Returns the currently authenticated user.

### Endpoint

```http
GET /api/me/
```

### Auth required

Yes.

### Headers

```http
Authorization: Bearer <ACCESS_TOKEN>
```

### cURL

```bash
curl http://127.0.0.1:8000/api/me/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

### Sample response

```json
{
  "user": {
    "id": 1,
    "username": "paul",
    "email": "paul@example.com",
    "first_name": "Paul",
    "last_name": "Ndambo",
    "full_name": "Paul Ndambo",
    "date_joined": "2026-06-16T10:46:02.557119Z"
  }
}
```

### Frontend usage

Use this endpoint to:

- Restore authenticated user state after page refresh
- Show user profile information in the navbar/sidebar
- Confirm the access token is valid

---

# 8. Farm Endpoints

All farm endpoints require authentication.

The backend scopes farms to the logged-in user.

This means:

```txt
User A only sees User A's farms.
User B only sees User B's farms.
```

The frontend must include:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

---

## 8.1 List Farms

Returns farms owned by the authenticated user.

### Endpoint

```http
GET /api/farms/
```

### Auth required

Yes.

### cURL

```bash
curl http://127.0.0.1:8000/api/farms/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

### Sample response

```json
[
  {
    "id": 1,
    "name": "Kapkimolwa Farm",
    "county": "Bomet",
    "crop_type": "tea",
    "land_acres": "2.50",
    "latest_risk_score": 73.0,
    "latest_risk_level": "HIGH",
    "updated_at": "2026-06-16T11:02:17.210773Z"
  },
  {
    "id": 2,
    "name": "Juja Demo Plot",
    "county": "Kiambu",
    "crop_type": "vegetables",
    "land_acres": "1.00",
    "latest_risk_score": 25.0,
    "latest_risk_level": "LOW",
    "updated_at": "2026-06-16T11:10:04.883771Z"
  }
]
```

### Frontend usage

Use this endpoint for:

- Farm list page
- Farm selector dropdown
- Sidebar farm navigation

For a richer dashboard, prefer:

```txt
GET /api/farms/dashboard/
```

---

## 8.2 Create Farm

Creates a farm owned by the authenticated user.

### Endpoint

```http
POST /api/farms/
```

### Auth required

Yes.

### Request body

```json
{
  "name": "Kapkimolwa Farm",
  "county": "Bomet",
  "latitude": -0.7812,
  "longitude": 35.3416,
  "crop_type": "tea",
  "land_acres": 2.5,
  "contact_phone": "+254700000000",
  "notes": "Tea farm near a river valley"
}
```

### Field notes

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `name` | string | Yes | Farm name |
| `county` | string | Yes | County or region |
| `latitude` | decimal | Yes | Used for Open-Meteo forecast |
| `longitude` | decimal | Yes | Used for Open-Meteo forecast |
| `crop_type` | string | No | Example: `tea`, `maize`, `coffee`, `avocado`, `vegetables`, `mixed`, `other` |
| `land_acres` | decimal | No | Farm size |
| `contact_phone` | string | No | Used for alert preview |
| `notes` | string | No | Extra context for Gemini insight |

### cURL

```bash
curl -X POST http://127.0.0.1:8000/api/farms/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kapkimolwa Farm",
    "county": "Bomet",
    "latitude": -0.7812,
    "longitude": 35.3416,
    "crop_type": "tea",
    "land_acres": 2.5,
    "contact_phone": "+254700000000",
    "notes": "Tea farm near a river valley"
  }'
```

### Sample success response

```json
{
  "id": 1,
  "owner": "paul",
  "name": "Kapkimolwa Farm",
  "county": "Bomet",
  "latitude": "-0.7812000",
  "longitude": "35.3416000",
  "crop_type": "tea",
  "land_acres": "2.50",
  "contact_phone": "+254700000000",
  "notes": "Tea farm near a river valley",
  "latest_risk_score": 0.0,
  "latest_risk_level": "UNKNOWN",
  "created_at": "2026-06-16T11:00:11.282109Z",
  "updated_at": "2026-06-16T11:00:11.282145Z"
}
```

### Frontend usage

After creating a farm, the frontend should usually call:

```txt
GET /api/farms/{id}/weather/
```

to fetch the first weather snapshot.

---

## 8.3 Retrieve Farm Details

Returns full details for a single farm.

### Endpoint

```http
GET /api/farms/{farm_id}/
```

### Auth required

Yes.

### cURL

```bash
curl http://127.0.0.1:8000/api/farms/1/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

### Sample response

```json
{
  "id": 1,
  "owner": "paul",
  "name": "Kapkimolwa Farm",
  "county": "Bomet",
  "latitude": "-0.7812000",
  "longitude": "35.3416000",
  "crop_type": "tea",
  "land_acres": "2.50",
  "contact_phone": "+254700000000",
  "notes": "Tea farm near a river valley",
  "latest_risk_score": 73.0,
  "latest_risk_level": "HIGH",
  "created_at": "2026-06-16T11:00:11.282109Z",
  "updated_at": "2026-06-16T11:08:22.982145Z"
}
```

### Frontend usage

Use this endpoint for:

- Farm detail page
- Editing farm profile
- Loading selected farm metadata before weather/risk calls

---

## 8.4 Update Farm

Updates all fields for a farm.

### Endpoint

```http
PUT /api/farms/{farm_id}/
```

### Auth required

Yes.

### Request body

Send the full farm object.

```json
{
  "name": "Kapkimolwa Farm Updated",
  "county": "Bomet",
  "latitude": -0.7812,
  "longitude": 35.3416,
  "crop_type": "tea",
  "land_acres": 3.0,
  "contact_phone": "+254711111111",
  "notes": "Updated farm notes"
}
```

### cURL

```bash
curl -X PUT http://127.0.0.1:8000/api/farms/1/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kapkimolwa Farm Updated",
    "county": "Bomet",
    "latitude": -0.7812,
    "longitude": 35.3416,
    "crop_type": "tea",
    "land_acres": 3.0,
    "contact_phone": "+254711111111",
    "notes": "Updated farm notes"
  }'
```

### Sample response

```json
{
  "id": 1,
  "owner": "paul",
  "name": "Kapkimolwa Farm Updated",
  "county": "Bomet",
  "latitude": "-0.7812000",
  "longitude": "35.3416000",
  "crop_type": "tea",
  "land_acres": "3.00",
  "contact_phone": "+254711111111",
  "notes": "Updated farm notes",
  "latest_risk_score": 73.0,
  "latest_risk_level": "HIGH",
  "created_at": "2026-06-16T11:00:11.282109Z",
  "updated_at": "2026-06-16T11:14:55.441203Z"
}
```

### Frontend usage

Use this endpoint for full edit forms.

If the user edits latitude or longitude, the frontend should call:

```txt
GET /api/farms/{id}/weather/?refresh=true
```

after saving to get weather for the new location.

---

## 8.5 Partial Update Farm

Updates selected fields for a farm.

### Endpoint

```http
PATCH /api/farms/{farm_id}/
```

### Auth required

Yes.

### Request body

Only include fields being changed.

```json
{
  "contact_phone": "+254722222222"
}
```

### cURL

```bash
curl -X PATCH http://127.0.0.1:8000/api/farms/1/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_phone": "+254722222222"
  }'
```

### Sample response

```json
{
  "id": 1,
  "owner": "paul",
  "name": "Kapkimolwa Farm Updated",
  "county": "Bomet",
  "latitude": "-0.7812000",
  "longitude": "35.3416000",
  "crop_type": "tea",
  "land_acres": "3.00",
  "contact_phone": "+254722222222",
  "notes": "Updated farm notes",
  "latest_risk_score": 73.0,
  "latest_risk_level": "HIGH",
  "created_at": "2026-06-16T11:00:11.282109Z",
  "updated_at": "2026-06-16T11:16:12.117661Z"
}
```

---

## 8.6 Delete Farm

Deletes a farm owned by the authenticated user.

### Endpoint

```http
DELETE /api/farms/{farm_id}/
```

### Auth required

Yes.

### cURL

```bash
curl -X DELETE http://127.0.0.1:8000/api/farms/1/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

### Sample success response

```txt
HTTP 204 No Content
```

### Frontend usage

After deletion:

1. Remove farm from local state
2. Redirect to dashboard or farm list
3. Refresh `GET /api/farms/dashboard/`

---

# 9. Dashboard Endpoint

---

## 9.1 Farm Dashboard Summary

Returns summary counts and the authenticated user's farm list.

### Endpoint

```http
GET /api/farms/dashboard/
```

### Auth required

Yes.

### cURL

```bash
curl http://127.0.0.1:8000/api/farms/dashboard/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

### Sample response

```json
{
  "summary": {
    "total_farms": 3,
    "high_risk_farms": 1,
    "medium_risk_farms": 1,
    "low_risk_farms": 1,
    "unknown_risk_farms": 0
  },
  "farms": [
    {
      "id": 1,
      "name": "Kapkimolwa Farm",
      "county": "Bomet",
      "crop_type": "tea",
      "land_acres": "2.50",
      "latest_risk_score": 73.0,
      "latest_risk_level": "HIGH",
      "updated_at": "2026-06-16T11:08:22.982145Z"
    },
    {
      "id": 2,
      "name": "Juja Demo Plot",
      "county": "Kiambu",
      "crop_type": "vegetables",
      "land_acres": "1.00",
      "latest_risk_score": 42.0,
      "latest_risk_level": "MEDIUM",
      "updated_at": "2026-06-16T11:11:04.771245Z"
    },
    {
      "id": 3,
      "name": "Machakos Maize Plot",
      "county": "Machakos",
      "crop_type": "maize",
      "land_acres": "5.00",
      "latest_risk_score": 18.0,
      "latest_risk_level": "LOW",
      "updated_at": "2026-06-16T11:12:33.413882Z"
    }
  ]
}
```

### Frontend usage

This is the recommended endpoint for the main dashboard.

Suggested dashboard cards:

- Total farms
- High-risk farms
- Medium-risk farms
- Low-risk farms
- Unknown-risk farms

Suggested farm table columns:

- Farm name
- County
- Crop type
- Land acres
- Risk score
- Risk level
- Last updated
- View details button

---

# 10. Weather Endpoint

---

## 10.1 Fetch Weather for Farm

Fetches weather forecast data for a farm using Open-Meteo.

The backend uses the farm's latitude and longitude.

Weather snapshots are cached for 30 minutes.

### Endpoint

```http
GET /api/farms/{farm_id}/weather/
```

### Auth required

Yes.

### Query parameters

| Parameter | Required | Default | Description |
|---|---:|---:|---|
| `refresh` | No | `false` | If `true`, bypasses 30-minute cache and fetches fresh Open-Meteo data |

### cURL

```bash
curl http://127.0.0.1:8000/api/farms/1/weather/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

### Force refresh cURL

```bash
curl "http://127.0.0.1:8000/api/farms/1/weather/?refresh=true" \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

### Sample response when fresh data is fetched

```json
{
  "cached": false,
  "snapshot": {
    "id": 1,
    "farm": 1,
    "source": "open_meteo",
    "raw_response": {
      "latitude": -0.75,
      "longitude": 35.375,
      "generationtime_ms": 0.10502338409423828,
      "utc_offset_seconds": 10800,
      "timezone": "Africa/Nairobi",
      "timezone_abbreviation": "GMT+3",
      "elevation": 1947.0,
      "current_units": {
        "time": "iso8601",
        "interval": "seconds",
        "temperature_2m": "°C",
        "relative_humidity_2m": "%",
        "precipitation": "mm",
        "rain": "mm",
        "wind_speed_10m": "km/h"
      },
      "current": {
        "time": "2026-06-16T14:00",
        "interval": 900,
        "temperature_2m": 22.4,
        "relative_humidity_2m": 68,
        "precipitation": 0.0,
        "rain": 0.0,
        "wind_speed_10m": 10.2
      },
      "daily_units": {
        "time": "iso8601",
        "temperature_2m_max": "°C",
        "temperature_2m_min": "°C",
        "precipitation_sum": "mm",
        "rain_sum": "mm",
        "wind_speed_10m_max": "km/h"
      },
      "daily": {
        "time": [
          "2026-06-16",
          "2026-06-17",
          "2026-06-18"
        ],
        "temperature_2m_max": [
          24.1,
          25.2,
          24.8
        ],
        "temperature_2m_min": [
          13.5,
          14.1,
          13.9
        ],
        "precipitation_sum": [
          2.1,
          12.4,
          4.8
        ],
        "rain_sum": [
          2.1,
          12.4,
          4.8
        ],
        "wind_speed_10m_max": [
          16.5,
          22.1,
          18.4
        ]
      }
    },
    "current_temperature": 22.4,
    "max_temperature": 25.2,
    "min_temperature": 13.5,
    "max_rainfall": 12.4,
    "max_wind_speed": 22.1,
    "created_at": "2026-06-16T11:04:11.312904Z"
  }
}
```

### Sample response when cached data is returned

```json
{
  "cached": true,
  "snapshot": {
    "id": 1,
    "farm": 1,
    "source": "open_meteo",
    "raw_response": {
      "latitude": -0.75,
      "longitude": 35.375,
      "timezone": "Africa/Nairobi",
      "current": {
        "time": "2026-06-16T14:00",
        "temperature_2m": 22.4,
        "relative_humidity_2m": 68,
        "precipitation": 0.0,
        "rain": 0.0,
        "wind_speed_10m": 10.2
      }
    },
    "current_temperature": 22.4,
    "max_temperature": 25.2,
    "min_temperature": 13.5,
    "max_rainfall": 12.4,
    "max_wind_speed": 22.1,
    "created_at": "2026-06-16T11:04:11.312904Z"
  }
}
```

### Frontend usage

Use this endpoint on the farm detail page.

Recommended UI components:

- Current temperature card
- Current humidity card, from `raw_response.current.relative_humidity_2m`
- Current wind speed card
- Max rainfall card
- Max wind speed card
- 7-day forecast chart, from `raw_response.daily`
- Cached/fresh badge, using the top-level `cached` boolean

Important fields for frontend charts:

```txt
snapshot.raw_response.daily.time
snapshot.raw_response.daily.temperature_2m_max
snapshot.raw_response.daily.temperature_2m_min
snapshot.raw_response.daily.rain_sum
snapshot.raw_response.daily.precipitation_sum
snapshot.raw_response.daily.wind_speed_10m_max
```

---

# 11. Risk Assessment Endpoint

---

## 11.1 Generate Risk Assessment

Generates a farm-level risk score from the latest weather snapshot.

This endpoint requires that weather has already been fetched for the farm.

### Endpoint

```http
POST /api/farms/{farm_id}/risk/
```

### Auth required

Yes.

### Prerequisite

Call this first:

```http
GET /api/farms/{farm_id}/weather/
```

### Request body

No body required.

### cURL

```bash
curl -X POST http://127.0.0.1:8000/api/farms/1/risk/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

### Sample success response

```json
{
  "assessment": {
    "id": 1,
    "farm": 1,
    "weather_snapshot": 1,
    "score": 42.0,
    "level": "MEDIUM",
    "drivers": [
      "Moderate to heavy rainfall is expected.",
      "Moderate wind risk detected."
    ],
    "recommended_actions": [
      "Monitor waterlogging risk and schedule field activity around rain periods.",
      "Inspect vulnerable crops and light structures."
    ],
    "created_at": "2026-06-16T11:06:44.920144Z"
  },
  "weather_summary": {
    "current_temperature": 22.4,
    "current_humidity": 68,
    "current_rain": 0.0,
    "current_wind_speed": 10.2,
    "max_temperature": 25.2,
    "min_temperature": 13.5,
    "max_rainfall": 12.4,
    "total_rainfall": 19.3,
    "max_wind_speed": 22.1
  }
}
```

### Sample error response when no weather exists

```json
{
  "error": "No weather snapshot found. Call GET /api/farms/{id}/weather/ first."
}
```

### Risk levels

| Score range | Level |
|---:|---|
| `0–39` | `LOW` |
| `40–69` | `MEDIUM` |
| `70–100` | `HIGH` |

### Risk drivers currently considered

The backend risk engine considers:

- Very heavy rainfall
- Moderate/heavy rainfall
- Hot and dry conditions
- Strong wind
- Moderate wind
- High temperatures
- Low humidity combined with heat

### Frontend usage

Use this endpoint after fetching weather.

Recommended UI:

- Risk score gauge
- Risk level badge
- Risk drivers list
- Recommended actions list
- Weather summary cards

After successful risk generation, the farm's `latest_risk_score` and `latest_risk_level` are updated.

The dashboard will reflect the new risk level.

---

# 12. Gemini AI Insight Endpoint

---

## 12.1 Generate AI Insight

Generates a farmer-friendly advisory using Gemini.

This endpoint uses:

- Farm details
- Latest risk assessment
- Weather summary
- Risk drivers
- Recommended actions

### Endpoint

```http
POST /api/farms/{farm_id}/generate-insight/
```

### Auth required

Yes.

### Prerequisite

Call these first:

```http
GET  /api/farms/{farm_id}/weather/
POST /api/farms/{farm_id}/risk/
```

### Request body

No body required.

### cURL

```bash
curl -X POST http://127.0.0.1:8000/api/farms/1/generate-insight/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

### Sample success response

```json
{
  "id": 1,
  "farm": 1,
  "risk_assessment": 1,
  "model": "gemini-2.5-flash",
  "prompt": "You are an agricultural weather-risk assistant.\n\nAnalyze the following farm and weather-risk data...",
  "response": "1. Situation Summary\nKapkimolwa Farm in Bomet is facing moderate weather risk over the forecast period. Rainfall and wind are the main concerns.\n\n2. Key Risks\n- Possible waterlogging in low-lying sections.\n- Field activities such as spraying may be affected by rain.\n- Light structures and young crops may be affected by wind.\n\n3. Recommended Actions\n- Check drainage before the rainfall period.\n- Avoid fertilizer or pesticide application immediately before rain.\n- Inspect vulnerable crops and secure light farm structures.\n\n4. SMS Alert Version\nFarmGuard Alert: Moderate weather risk for Kapkimolwa Farm. Rain and wind expected. Check drainage, avoid spraying before rain, and secure vulnerable crops.",
  "created_at": "2026-06-16T11:08:18.382003Z"
}
```

### Sample error response when no risk assessment exists

```json
{
  "error": "No risk assessment found. Call POST /api/farms/{id}/risk/ first."
}
```

### Sample upstream Gemini error

```json
{
  "error": "Gemini rate limit exceeded.",
  "provider": "gemini",
  "status_code": 429,
  "details": {
    "error": {
      "message": "Quota exceeded"
    }
  }
}
```

### Frontend usage

Use this endpoint after the risk assessment is generated.

Recommended UI:

- AI insight card
- Situation summary section
- Key risks section
- Recommended actions section
- SMS alert version section

Important: The `prompt` is returned mostly for transparency/debugging. The frontend should usually display only `response`.

---

# 13. Alert Preview Endpoint

---

## 13.1 Get Alert Preview

Returns a simulated SMS-style farmer alert based on the latest risk assessment.

If an AI insight exists, it is also returned.

This endpoint does **not** send an SMS.

### Endpoint

```http
GET /api/farms/{farm_id}/alert-preview/
```

### Auth required

Yes.

### Prerequisite

Call this first:

```http
POST /api/farms/{farm_id}/risk/
```

Optional but recommended:

```http
POST /api/farms/{farm_id}/generate-insight/
```

### cURL

```bash
curl http://127.0.0.1:8000/api/farms/1/alert-preview/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

### Sample response without AI insight

```json
{
  "mode": "simulation",
  "to": "+254700000000",
  "message": "FarmGuard Alert: Kapkimolwa Farm in Bomet is currently MEDIUM risk. Score: 42.0. Action: Monitor waterlogging risk and schedule field activity around rain periods.",
  "ai_insight_available": false,
  "latest_ai_insight": null
}
```

### Sample response with AI insight

```json
{
  "mode": "simulation",
  "to": "+254700000000",
  "message": "FarmGuard Alert: Kapkimolwa Farm in Bomet is currently MEDIUM risk. Score: 42.0. Action: Monitor waterlogging risk and schedule field activity around rain periods.",
  "ai_insight_available": true,
  "latest_ai_insight": "1. Situation Summary\nKapkimolwa Farm in Bomet is facing moderate weather risk over the forecast period...\n\n4. SMS Alert Version\nFarmGuard Alert: Moderate weather risk for Kapkimolwa Farm. Rain and wind expected. Check drainage, avoid spraying before rain, and secure vulnerable crops."
}
```

### Sample error response when no risk assessment exists

```json
{
  "error": "No risk assessment found. Call POST /api/farms/{id}/risk/ first."
}
```

### Frontend usage

Use this endpoint for an alert preview panel.

Recommended UI:

- Destination phone number
- Short generated alert message
- Badge showing `simulation`
- AI insight availability status
- Optional expanded AI insight

Because `mode` is currently `"simulation"`, the frontend should not show "SMS sent". It should show "Preview only" or "Simulation".

---

# 14. History / Read-only Endpoints

These endpoints are useful for debugging, analytics pages, or frontend history views.

Depending on the current backend implementation, these endpoints may return all records visible to the authenticated user or all records globally if not yet scoped. For production, they should be scoped to the authenticated user's farms.

---

## 14.1 List Weather Snapshots

Returns stored weather snapshots.

### Endpoint

```http
GET /api/weather-snapshots/
```

### Auth required

Yes.

### cURL

```bash
curl http://127.0.0.1:8000/api/weather-snapshots/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

### Sample response

```json
[
  {
    "id": 1,
    "farm": 1,
    "source": "open_meteo",
    "raw_response": {
      "latitude": -0.75,
      "longitude": 35.375,
      "timezone": "Africa/Nairobi",
      "current": {
        "time": "2026-06-16T14:00",
        "temperature_2m": 22.4,
        "relative_humidity_2m": 68,
        "precipitation": 0.0,
        "rain": 0.0,
        "wind_speed_10m": 10.2
      }
    },
    "current_temperature": 22.4,
    "max_temperature": 25.2,
    "min_temperature": 13.5,
    "max_rainfall": 12.4,
    "max_wind_speed": 22.1,
    "created_at": "2026-06-16T11:04:11.312904Z"
  }
]
```

### Frontend usage

Possible uses:

- Weather history table
- Debugging Open-Meteo responses
- Comparing cached snapshots
- Showing last weather fetch time

---

## 14.2 List Risk Assessments

Returns stored risk assessments.

### Endpoint

```http
GET /api/risk-assessments/
```

### Auth required

Yes.

### cURL

```bash
curl http://127.0.0.1:8000/api/risk-assessments/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

### Sample response

```json
[
  {
    "id": 1,
    "farm": 1,
    "weather_snapshot": 1,
    "score": 42.0,
    "level": "MEDIUM",
    "drivers": [
      "Moderate to heavy rainfall is expected.",
      "Moderate wind risk detected."
    ],
    "recommended_actions": [
      "Monitor waterlogging risk and schedule field activity around rain periods.",
      "Inspect vulnerable crops and light structures."
    ],
    "created_at": "2026-06-16T11:06:44.920144Z"
  }
]
```

### Frontend usage

Possible uses:

- Risk history chart
- Timeline of farm risk changes
- Historical risk level badges
- Audit/debug view

---

## 14.3 List AI Insights

Returns stored Gemini-generated AI insights.

### Endpoint

```http
GET /api/ai-insights/
```

### Auth required

Yes.

### cURL

```bash
curl http://127.0.0.1:8000/api/ai-insights/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

### Sample response

```json
[
  {
    "id": 1,
    "farm": 1,
    "risk_assessment": 1,
    "model": "gemini-2.5-flash",
    "prompt": "You are an agricultural weather-risk assistant...",
    "response": "1. Situation Summary\nKapkimolwa Farm in Bomet is facing moderate weather risk...",
    "created_at": "2026-06-16T11:08:18.382003Z"
  }
]
```

### Frontend usage

Possible uses:

- AI advisory history
- Farm advisory timeline
- Debugging prompt/response quality

Recommended display:

- Show `response`
- Hide `prompt` by default
- Add "View prompt" button only for developer/debug mode

---

# 15. Frontend Data Model Guide

This section helps a frontend agent understand how the backend entities relate.

---

## 15.1 Entity Relationships

```txt
User
 └── Farm
      ├── WeatherSnapshot
      ├── RiskAssessment
      │    └── AIInsight
      └── Alert Preview generated from latest RiskAssessment and AIInsight
```

---

## 15.2 Farm Object

```json
{
  "id": 1,
  "owner": "paul",
  "name": "Kapkimolwa Farm",
  "county": "Bomet",
  "latitude": "-0.7812000",
  "longitude": "35.3416000",
  "crop_type": "tea",
  "land_acres": "2.50",
  "contact_phone": "+254700000000",
  "notes": "Tea farm near a river valley",
  "latest_risk_score": 42.0,
  "latest_risk_level": "MEDIUM",
  "created_at": "2026-06-16T11:00:11.282109Z",
  "updated_at": "2026-06-16T11:08:22.982145Z"
}
```

### Frontend notes

- `latitude`, `longitude`, and `land_acres` may arrive as strings because they are Django Decimal fields.
- Convert them to numbers in the frontend only when needed.
- `latest_risk_level` can be:
  - `UNKNOWN`
  - `LOW`
  - `MEDIUM`
  - `HIGH`

---

## 15.3 Weather Snapshot Object

```json
{
  "id": 1,
  "farm": 1,
  "source": "open_meteo",
  "raw_response": {},
  "current_temperature": 22.4,
  "max_temperature": 25.2,
  "min_temperature": 13.5,
  "max_rainfall": 12.4,
  "max_wind_speed": 22.1,
  "created_at": "2026-06-16T11:04:11.312904Z"
}
```

### Frontend notes

For summary cards, use top-level snapshot fields:

```txt
current_temperature
max_temperature
min_temperature
max_rainfall
max_wind_speed
```

For charts, use:

```txt
raw_response.daily.time
raw_response.daily.temperature_2m_max
raw_response.daily.temperature_2m_min
raw_response.daily.rain_sum
raw_response.daily.precipitation_sum
raw_response.daily.wind_speed_10m_max
```

---

## 15.4 Risk Assessment Object

```json
{
  "id": 1,
  "farm": 1,
  "weather_snapshot": 1,
  "score": 42.0,
  "level": "MEDIUM",
  "drivers": [
    "Moderate to heavy rainfall is expected."
  ],
  "recommended_actions": [
    "Monitor waterlogging risk and schedule field activity around rain periods."
  ],
  "created_at": "2026-06-16T11:06:44.920144Z"
}
```

### Frontend notes

Recommended components:

- Risk gauge
- Risk badge
- Driver list
- Recommended action list

Badge colors can be mapped as:

```txt
UNKNOWN → gray
LOW     → green
MEDIUM  → amber/orange
HIGH    → red
```

---

## 15.5 AI Insight Object

```json
{
  "id": 1,
  "farm": 1,
  "risk_assessment": 1,
  "model": "gemini-2.5-flash",
  "prompt": "You are an agricultural weather-risk assistant...",
  "response": "1. Situation Summary\n...",
  "created_at": "2026-06-16T11:08:18.382003Z"
}
```

### Frontend notes

The frontend should primarily display:

```txt
response
```

The `prompt` field is useful for debugging and transparency, but it should not be the main user-facing content.

---

# 16. Suggested Frontend Pages

A frontend agent can build the dashboard around these pages.

---

## 16.1 Login Page

Uses:

```txt
POST /api/auth/login/
```

Required fields:

- Username
- Password

On success:

- Save tokens
- Redirect to dashboard

---

## 16.2 Register Page

Uses:

```txt
POST /api/auth/register/
```

Required fields:

- First name
- Last name
- Username
- Email
- Password
- Confirm password

On success:

- Save tokens
- Redirect to dashboard

---

## 16.3 Dashboard Page

Uses:

```txt
GET /api/me/
GET /api/farms/dashboard/
```

Show:

- Welcome message
- Total farms
- High-risk farms
- Medium-risk farms
- Low-risk farms
- Farm table/list

---

## 16.4 Farm Detail Page

Uses:

```txt
GET /api/farms/{id}/
GET /api/farms/{id}/weather/
POST /api/farms/{id}/risk/
POST /api/farms/{id}/generate-insight/
GET /api/farms/{id}/alert-preview/
```

Show:

- Farm metadata
- Weather cards
- Forecast chart
- Risk score
- Risk drivers
- Recommended actions
- AI advisory
- Alert preview

---

## 16.5 Create/Edit Farm Page

Uses:

```txt
POST /api/farms/
PATCH /api/farms/{id}/
PUT /api/farms/{id}/
```

Fields:

- Name
- County
- Latitude
- Longitude
- Crop type
- Land acres
- Contact phone
- Notes

---

## 16.6 History Page

Uses:

```txt
GET /api/weather-snapshots/
GET /api/risk-assessments/
GET /api/ai-insights/
```

Show:

- Weather snapshot history
- Risk assessment history
- AI insight history

---

# 17. Suggested Frontend API Client Pseudocode

```js
const API_BASE_URL = "http://127.0.0.1:8000/api";

function getAccessToken() {
  return localStorage.getItem("access");
}

async function apiRequest(path, options = {}) {
  const token = getAccessToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // optionally call refresh flow here
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw {
      status: response.status,
      data,
    };
  }

  return data;
}
```

Example usage:

```js
const dashboard = await apiRequest("/farms/dashboard/");

const weather = await apiRequest(`/farms/${farmId}/weather/`);

const risk = await apiRequest(`/farms/${farmId}/risk/`, {
  method: "POST",
});

const insight = await apiRequest(`/farms/${farmId}/generate-insight/`, {
  method: "POST",
});
```

---

# 18. Complete Manual Test Flow

This section can be used by another AI agent or developer to verify the backend end-to-end.

---

## Step 1: Health check

```bash
curl http://127.0.0.1:8000/api/health/
```

Expected:

```json
{
  "status": "ok",
  "service": "FarmGuard AI Backend",
  "time": "2026-06-16T10:45:22.112319Z"
}
```

---

## Step 2: Register

```bash
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Paul",
    "last_name": "Ndambo",
    "username": "paul",
    "email": "paul@example.com",
    "password": "StrongPass123!",
    "password_confirm": "StrongPass123!"
  }'
```

Copy the returned `access` token.

---

## Step 3: Get current user

```bash
curl http://127.0.0.1:8000/api/me/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

---

## Step 4: Create farm

```bash
curl -X POST http://127.0.0.1:8000/api/farms/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kapkimolwa Farm",
    "county": "Bomet",
    "latitude": -0.7812,
    "longitude": 35.3416,
    "crop_type": "tea",
    "land_acres": 2.5,
    "contact_phone": "+254700000000",
    "notes": "Tea farm near a river valley"
  }'
```

Copy the returned farm `id`.

---

## Step 5: Fetch weather

```bash
curl http://127.0.0.1:8000/api/farms/1/weather/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

---

## Step 6: Generate risk assessment

```bash
curl -X POST http://127.0.0.1:8000/api/farms/1/risk/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

---

## Step 7: Generate Gemini insight

```bash
curl -X POST http://127.0.0.1:8000/api/farms/1/generate-insight/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

---

## Step 8: Get alert preview

```bash
curl http://127.0.0.1:8000/api/farms/1/alert-preview/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

---

## Step 9: Load dashboard

```bash
curl http://127.0.0.1:8000/api/farms/dashboard/ \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

---

# 19. Implementation Notes for Frontend Agent

The frontend should assume the following:

1. Authentication is JWT-based.
2. All protected requests need `Authorization: Bearer <access>`.
3. Farm IDs are numeric.
4. The dashboard endpoint is the best first page after login.
5. Weather must be fetched before risk can be generated.
6. Risk must be generated before AI insight can be generated.
7. Alert preview depends on risk assessment.
8. AI insight is optional but recommended.
9. Open-Meteo data is stored in `snapshot.raw_response`.
10. Top-level weather snapshot fields are easier for summary cards.
11. Raw Open-Meteo daily arrays are best for charts.
12. `mode: "simulation"` means the alert is not sent.

---

# 20. Endpoint Summary Table

| Method | Endpoint | Auth | Purpose |
|---|---|---:|---|
| `GET` | `/api/health/` | No | Backend health check |
| `POST` | `/api/auth/register/` | No | Create user and return tokens |
| `POST` | `/api/auth/login/` | No | Login and return tokens |
| `POST` | `/api/auth/token/refresh/` | No | Refresh access token |
| `GET` | `/api/me/` | Yes | Get current authenticated user |
| `GET` | `/api/farms/` | Yes | List user's farms |
| `POST` | `/api/farms/` | Yes | Create farm |
| `GET` | `/api/farms/{id}/` | Yes | Retrieve farm |
| `PUT` | `/api/farms/{id}/` | Yes | Full update farm |
| `PATCH` | `/api/farms/{id}/` | Yes | Partial update farm |
| `DELETE` | `/api/farms/{id}/` | Yes | Delete farm |
| `GET` | `/api/farms/dashboard/` | Yes | Dashboard summary |
| `GET` | `/api/farms/{id}/weather/` | Yes | Fetch or return cached weather |
| `GET` | `/api/farms/{id}/weather/?refresh=true` | Yes | Force fresh weather fetch |
| `POST` | `/api/farms/{id}/risk/` | Yes | Generate risk assessment |
| `POST` | `/api/farms/{id}/generate-insight/` | Yes | Generate Gemini AI advisory |
| `GET` | `/api/farms/{id}/alert-preview/` | Yes | Generate alert preview |
| `GET` | `/api/weather-snapshots/` | Yes | List weather snapshots |
| `GET` | `/api/risk-assessments/` | Yes | List risk assessments |
| `GET` | `/api/ai-insights/` | Yes | List AI insights |

---

# 21. Recommended Frontend Build Order

For fastest implementation, build frontend in this order:

```txt
1. Auth pages: login/register
2. Token storage and API client
3. Dashboard page
4. Farm create form
5. Farm detail page
6. Weather fetch card
7. Risk generation card
8. Gemini insight card
9. Alert preview card
10. History/debug pages
```

---

# 22. Notes on External Services

## Open-Meteo

The backend calls Open-Meteo from the server using farm latitude and longitude.

No Open-Meteo API key is needed.

Frontend should not call Open-Meteo directly.

## Gemini

The backend calls Gemini from the server.

The Gemini API key must stay server-side in environment variables.

Frontend should not call Gemini directly.

---

# 23. Environment Variables Expected by Backend

The backend expects these variables:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

---

# 24. Final Product Summary

FarmGuard AI exposes a complete backend for a farm weather-risk dashboard.

The frontend dashboard should allow a user to:

1. Register or log in
2. Create farms
3. View farm weather forecasts
4. Generate risk scores
5. Generate Gemini AI advisories
6. Preview farmer alerts
7. Monitor farms from a dashboard

The backend is designed so raw weather data, risk logic, and AI advisory generation are separated cleanly. This makes the frontend simple and keeps all external API keys protected on the server.
