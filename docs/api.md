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

---

## Reports — `/api/v1/reports/`

| Method | Endpoint                  | Auth     | Description                        |
|--------|---------------------------|----------|------------------------------------|
| GET    | `/`                       | No       | List reports (paginated)           |
| POST   | `/`                       | Yes      | Create a report                    |
| GET    | `/{id}/`                  | No       | Get a single report                |
| PATCH  | `/{id}/`                  | Author   | Update own report                  |
| DELETE | `/{id}/`                  | Author   | Delete own report                  |
| POST   | `/{id}/verify/`           | Yes*     | Submit community verification      |

*Community verification endpoints remain under reports; admin moderation is under dashboard endpoints.

---

## Admin Dashboard (Accounts App) — `/api/v1/dashboard/`

All endpoints below require JWT authentication and `ADMIN` role. Unauthenticated: `401`, non-admin authenticated: `403`.

### Statistics
- `GET /statistics/` — aggregate platform counts (reports by status, high-severity, users, locations, community verification totals).

### Report management
- `GET /reports/` — list all reports (paginated). Supports `search` (title/description), filters `status`, `category`, `severity` (`accessibility_impact`), `user`, `submitted_from`, `submitted_to` (YYYY-MM-DD), ordering and pagination.
- `GET /reports/{id}/` — report detail including creator, location, uploaded photographs, community verification records, verification counts, and administrative review history.

### Moderation actions
- `POST /reports/{id}/verify/` body: `{ "review_comment": "optional" }` (pending -> verified)
- `POST /reports/{id}/reject/` body: `{ "review_comment": "required reason" }` (pending -> rejected)
- `POST /reports/{id}/resolve/` body: `{ "review_comment": "optional" }` (verified -> resolved)
- `POST /reports/{id}/request-info/` body: `{ "review_comment": "optional" }` (pending -> pending, audit record created)

Invalid transitions return `400` with detail. Each action creates an immutable `AdminReportReview` audit record.

### Analytics
- `GET /reports-by-category/`
- `GET /reports-by-status/`
- `GET /reports-over-time/?group=day|month`
- `GET /high-severity-reports/` (pending high/critical)

### User management
- `GET /users/` — list users, `search` (name/email/username), filter `role`, `is_active`, pagination.
- `GET /users/{id}/` — user details with submitted reports and registration date.
- `PATCH /users/{id}/status/` body: `{ "is_active": true|false }` (cannot deactivate own account; password/auth secrets never exposed).

### Error envelope
API errors use: `{"error": true, "status_code": <code>, "detail": ...}`.
## AI Classification (Gemini)

- `GET /api/v1/reports/{id}/classification/` (auth required): returns AI classification for a report. Only the report author or an admin can access.
- On report creation (`POST /api/v1/reports/`), the report is saved first and classification runs immediately (safely); failures do not block report creation and are recorded with `classification_status: failed`.
- AI suggestions are stored separately in `ReportClassification` (and mirrored as read-only JSON on `ai_classification`) and never overwrite user-provided `category` or `accessibility_impact`.
- Response fields: `suggested_category`, `suggested_severity`, `keywords`, `summary`, `confidence_score`, `ai_provider`, `model_name`, `classification_status`, `error_message`, timestamps.
- Configure `GEMINI_API_KEY` and `GEMINI_MODEL` in backend environment; without them classification is recorded as unavailable/failed and report creation still succeeds.
