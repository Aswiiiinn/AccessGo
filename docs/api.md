# API Endpoint Documentation

Base URL: `http://localhost:8000/api/v1`

All authenticated endpoints require: `Authorization: Bearer <access_token>`

---

## Auth — `/api/v1/auth/`

| Method | Endpoint              | Auth | Description                  |
|--------|-----------------------|------|------------------------------|
| POST   | `/register/`          | No   | Create a new user account    |
| POST   | `/login/`             | No   | Obtain JWT access + refresh  |
| POST   | `/token/refresh/`     | No   | Refresh access token         |
| POST   | `/logout/`            | Yes  | Blacklist refresh token      |
| GET    | `/profile/`           | Yes  | Get current user profile     |
| PATCH  | `/profile/`           | Yes  | Update current user profile  |

### POST /register/
```json
{ "username": "alice", "email": "alice@example.com", "password": "secure123!" }
```

### POST /login/
```json
{ "username": "alice", "password": "secure123!" }
```
Response: `{ "access": "...", "refresh": "..." }`

---

## Accessibility — `/api/v1/accessibility/`

| Method | Endpoint                        | Auth  | Description                    |
|--------|---------------------------------|-------|--------------------------------|
| GET    | `/locations/`                   | No    | List locations (paginated)     |
| POST   | `/locations/`                   | Admin | Create a location              |
| GET    | `/locations/{id}/`              | No    | Get a single location          |
| PATCH  | `/locations/{id}/`              | Admin | Update a location              |
| DELETE | `/locations/{id}/`              | Admin | Delete a location              |
| GET    | `/locations/nearby/`            | No    | Get nearby locations           |

### GET /locations/nearby/
Query params: `lat`, `lng`, `radius` (km, default 1.0)

Example: `/locations/nearby/?lat=51.5074&lng=-0.1278&radius=0.5`

### Filters
- `location_type` — station, bus_stop, entrance, pathway, other
- `is_active` — true/false
- `search` — searches name and address

---

## Reports — `/api/v1/reports/`

| Method | Endpoint                  | Auth     | Description                        |
|--------|---------------------------|----------|------------------------------------|
| GET    | `/`                       | No       | List reports (paginated)           |
| POST   | `/`                       | Yes      | Create a report                    |
| GET    | `/{id}/`                  | No       | Get a single report                |
| PATCH  | `/{id}/`                  | Author   | Update own report                  |
| DELETE | `/{id}/`                  | Author   | Delete own report                  |
| POST   | `/{id}/verify/`           | Yes*     | Submit a verification vote         |

*Cannot verify your own report.

### POST /reports/
```json
{
  "location": 1,
  "title": "Broken elevator at main entrance",
  "description": "The elevator has been out of service since Monday.",
  "accessibility_impact": "high"
}
```

### POST /reports/{id}/verify/
```json
{ "vote": "confirm", "comment": "Confirmed — still broken as of today." }
```

### Filters
- `status` — pending, verified, rejected, resolved
- `location` — location ID
- `accessibility_impact` — low, medium, high, critical
- `search` — searches title and description

---

## Dashboard — `/api/v1/dashboard/`

| Method | Endpoint   | Auth  | Description              |
|--------|------------|-------|--------------------------|
| GET    | `/stats/`  | Admin | Get platform statistics  |

### Response
```json
{
  "total_reports": 42,
  "pending_reports": 10,
  "verified_reports": 25,
  "resolved_reports": 5,
  "total_locations": 18,
  "total_users": 120,
  "reports_by_impact": { "low": 5, "medium": 15, "high": 18, "critical": 4 }
}
```
