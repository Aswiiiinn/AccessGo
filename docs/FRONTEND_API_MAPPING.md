# AccessGo Frontend API Mapping

This document maps every frontend feature to the actual backend endpoint, HTTP method, request format, response format and permissions.

All endpoints are prefixed with the API base URL configured via `VITE_API_BASE_URL` (default: `http://127.0.0.1:8000/api/v1`).

---

## Base URLs

| Purpose | Base URL |
|---|---|
| API | `http://127.0.0.1:8000/api/v1` |
| Django Admin | `http://127.0.0.1:8000/admin/` |
| Media files | `http://127.0.0.1:8000/media/` |

---

## Authentication

### Register

- **Endpoint:** `POST /api/v1/auth/register/`
- **Permission:** AllowAny
- **Request format:** `application/json`
- **Response format:** 201 Created

```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "user",
  "full_name": "User Name",
  "password": "<write_only>"
}
```

### Login

- **Endpoint:** `POST /api/v1/auth/login/`
- **Permission:** AllowAny
- **Request format:** `application/json`

```json
{
  "email": "user@example.com",
  "password": "YourPassword1!"
}
```

- **Response format:** 200 OK

```json
{
  "access": "<access_token>",
  "refresh": "<refresh_token>"
}
```

### Refresh Token

- **Endpoint:** `POST /api/v1/auth/token/refresh/`
- **Permission:** AllowAny
- **Request format:** `application/json`

```json
{
  "refresh": "<refresh_token>"
}
```

- **Response format:** 200 OK

```json
{
  "access": "<new_access_token>",
  "refresh": "<new_refresh_token>"
}
```

### Logout

- **Endpoint:** `POST /api/v1/auth/logout/`
- **Permission:** IsAuthenticated
- **Request format:** `application/json`

```json
{
  "refresh": "<refresh_token>"
}
```

- **Response format:** 204 No Content

### Get / Update Profile

- **Endpoint:** `GET /api/v1/auth/profile/`
- **Endpoint:** `PATCH /api/v1/auth/profile/`
- **Permission:** IsAuthenticated (Get/Patch)

- **Request format:** `application/json`

```json
{
  "full_name": "Updated Name",
  "bio": "Hello!"
}
```

- **Response format:** 200 OK

```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "user",
  "full_name": "Updated Name",
  "role": "user",
  "bio": "Hello!",
  "avatar": null,
  "created_at": "2026-11-12T10:00:00Z",
  "updated_at": "2026-11-12T10:00:00Z"
}
```

---

## Accessibility Locations

### List Locations

- **Endpoint:** `GET /api/v1/accessibility/locations/`
- **Permission:** AllowAny
- **Query params:**
  - `location_type` (string, optional)
  - `is_active` (boolean, optional)
- **Response format:** Paginated

```
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Central Station",
      "location_type": "station",
      "address": "123 Main St",
      "latitude": "51.507400",
      "longitude": "-0.127800",
      "description": "",
      "is_active": true,
      "attributes": [],
      "created_at": "2026-11-12T10:00:00Z",
      "updated_at": "2026-11-12T10:00:00Z"
    }
  ]
}
```

### Get Location

- **Endpoint:** `GET /api/v1/accessibility/locations/{id}/`
- **Permission:** AllowAny

### Create Location

- **Endpoint:** `POST /api/v1/accessibility/locations/`
- **Permission:** AllowAny (per backend defaults)

### Update Location

- **Endpoint:** `PATCH /api/v1/accessibility/locations/{id}/`
- **Permission:** AllowAny (per backend defaults)

### Delete Location

- **Endpoint:** `DELETE /api/v1/accessibility/locations/{id}/`
- **Permission:** AllowAny (per backend defaults)

---

## Reports

### List Reports

- **Endpoint:** `GET /api/v1/reports/`
- **Permission:** AllowAny
- **Query params:**
  - `status` (string, optional): `pending`, `verified`, `rejected`, `resolved`
  - `location` (integer, optional)
  - `accessibility_impact` (string, optional): `low`, `medium`, `high`, `critical`
  - `search` (string, optional): title/description search
  - `ordering` (string, optional): `created_at` or `accessibility_impact`
- **Response format:** Paginated

```
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "author": "user@example.com",
      "location": 1,
      "title": "Broken elevator",
      "description": "Out of service.",
      "category": "elevator",
      "issue": "elevator_out_of_service",
      "accessibility_impact": "high",
      "status": "pending",
      "ai_classification": {
        "suggested_category": "elevator",
        "suggested_severity": "high",
        "keywords": ["elevator", "wheelchair access"],
        "summary": "Elevator malfunction restricting wheelchair access.",
        "confidence": 0.95,
        "provider": "gemini",
        "model": "gemini-2.0-flash",
        "status": "completed"
      },
      "classification": {
        "id": 1,
        "report": 1,
        "suggested_category": "elevator",
        "suggested_severity": "high",
        "keywords": ["elevator", "wheelchair access"],
        "summary": "Elevator malfunction restricting wheelchair access.",
        "confidence_score": 0.95,
        "ai_provider": "gemini",
        "model_name": "gemini-2.0-flash",
        "classification_status": "completed",
        "error_message": "",
        "created_at": "2026-11-12T10:00:00Z",
        "updated_at": "2026-11-12T10:00:00Z"
      },
      "images": [
        {
          "id": 1,
          "image": "/media/reports/photo.jpg",
          "uploaded_at": "2026-11-12T10:00:00Z"
        }
      ],
      "verification_count": 1,
      "confirm_count": 1,
      "dispute_count": 0,
      "created_at": "2026-11-12T10:00:00Z",
      "updated_at": "2026-11-12T10:00:00Z"
    }
  ]
}
```

### Create Report

- **Endpoint:** `POST /api/v1/reports/`
- **Permission:** IsAuthenticated
- **Request format:** `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `location` | integer | Yes | AccessibilityLocation ID |
| `title` | string | Yes | Max 255 chars |
| `description` | string | Yes | Text |
| `category` | string | No | User-provided category (optional) |
| `issue` | string | No | Short issue description (optional) |
| `accessibility_impact` | string | No | `low`, `medium`, `high`, `critical` (default: `medium`) |

- **Response format:** 201 Created

```json
{
  "id": 1,
  "author": "user@example.com",
  "location": 1,
  "title": "Broken elevator",
  "description": "Out of service.",
  "category": "elevator",
  "issue": "",
  "accessibility_impact": "high",
  "status": "pending",
  "ai_classification": null,
  "classification": {
    "id": 1,
    "suggested_category": "elevator",
    "suggested_severity": "high",
    "keywords": [],
    "summary": "",
    "confidence_score": null,
    "classification_status": "pending",
    "error_message": "",
    "created_at": "2026-11-12T10:00:00Z",
    "updated_at": "2026-11-12T10:00:00Z"
  },
  "images": [],
  "verification_count": 0,
  "confirm_count": 0,
  "dispute_count": 0,
  "created_at": "2026-11-12T10:00:00Z",
  "updated_at": "2026-11-12T10:00:00Z"
}
```

### Get Report Detail

- **Endpoint:** `GET /api/v1/reports/{id}/`
- **Permission:** AllowAny

### Update Report

- **Endpoint:** `PATCH /api/v1/reports/{id}/`
- **Permission:** IsAuthenticated + IsAuthorOrReadOnly
- **Request format:** `application/json` or `multipart/form-data`

Only the author can update. Admins cannot change status via this endpoint (use `set-status`).

### Delete Report

- **Endpoint:** `DELETE /api/v1/reports/{id}/`
- **Permission:** IsAuthenticated + IsAuthorOrReadOnly
- **Response format:** 204 No Content

### Verify / Dispute Report

- **Endpoint:** `POST /api/v1/reports/{id}/verify/`
- **Permission:** IsAuthenticated + IsVerifierNotAuthor (author cannot verify own report)
- **Request format:** `application/json`

```json
{
  "vote": "confirm",
  "comment": "Confirmed in person."
}
```

- **Response format:** 201 Created

```json
{
  "id": 1,
  "verifier": "other@example.com",
  "vote": "confirm",
  "comment": "Confirmed in person.",
  "created_at": "2026-11-12T10:00:00Z",
  "updated_at": "2026-11-12T10:00:00Z"
}
```

### Dispute Report

- **Endpoint:** `POST /api/v1/reports/{id}/dispute/`
- **Permission:** IsAuthenticated + IsVerifierNotAuthor
- **Request format:** `application/json`

```json
{
  "comment": "This ramp is actually fine."
}
```

- **Response format:** 201 Created

```json
{
  "id": 1,
  "verifier": "other@example.com",
  "vote": "dispute",
  "comment": "This ramp is actually fine.",
  "created_at": "2026-11-12T10:00:00Z",
  "updated_at": "2026-11-12T10:00:00Z"
}
```

### List Verifications

- **Endpoint:** `GET /api/v1/reports/{id}/verifications/`
- **Permission:** AllowAny

- **Response format:** Array of verification objects.

### Withdraw / Update Verification

- **Endpoint:** `DELETE /api/v1/reports/{id}/my-verification/`
- **Endpoint:** `PATCH /api/v1/reports/{id}/my-verification/`
- **Permission:** IsAuthenticated + IsVerifierNotAuthor
- **Request format (PATCH):** `application/json` with `vote` and optional `comment`

- **Response format (DELETE):** 204 No Content
- **Response format (PATCH):** 200 OK with updated verification

### Admin: Set Report Status

- **Endpoint:** `PATCH /api/v1/reports/{id}/set-status/`
- **Permission:** IsAdminUser
- **Request format:** `application/json`

```json
{
  "status": "verified"
}
```

- **Response format:** 200 OK with updated report.

### AI Classification

#### Get Classification

- **Endpoint:** `GET /api/v1/reports/{id}/classification/`
- **Permission:** IsAuthenticated + IsAuthorOrAdmin
- **Response format:** ReportClassification object.

```json
{
  "id": 1,
  "report": 1,
  "suggested_category": "elevator",
  "suggested_severity": "high",
  "keywords": ["elevator", "wheelchair access"],
  "summary": "Elevator malfunction restricting wheelchair access.",
  "confidence_score": 0.95,
  "ai_provider": "gemini",
  "model_name": "gemini-2.0-flash",
  "classification_status": "completed",
  "error_message": "",
  "created_at": "2026-11-12T10:00:00Z",
  "updated_at": "2026-11-12T10:00:00Z"
}
```

#### Review Classification

- **Endpoint:** `POST /api/v1/reports/{id}/classification/review/`
- **Permission:** IsAuthenticated + IsAuthorOrAdmin
- **Request format:** `application/json`

```json
{
  "action": "accept",
  "reason": "Accepted based on description."
}
```

- **Action values:** `accept`, `reject`

- **Response format:** 201 Created with ClassificationReview object.

### List Classification Reviews

- **Endpoint:** `GET /api/v1/reports/{id}/classification/reviews/`
- **Permission:** IsAuthenticated + IsAuthorOrAdmin

### Report Images

#### Upload Image

- **Endpoint:** `POST /api/v1/reports/{report_pk}/images/`
- **Permission:** IsAuthenticated + IsImageOwner (author only)
- **Request format:** `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `image` | file | Yes | Allowed extensions: `.jpg`, `.jpeg`, `.png`, `.webp`. Max size: 5 MB. |

- **Response format:** 201 Created

```json
{
  "id": 1,
  "image": "/media/reports/photo.jpg",
  "uploaded_at": "2026-11-12T10:00:00Z"
}
```

#### Delete Image

- **Endpoint:** `DELETE /api/v1/reports/{report_pk}/images/{pk}/`
- **Permission:** IsAuthenticated + IsImageOwner (author only)
- **Response format:** 204 No Content

### Potential Duplicates

#### List Potential Duplicates for Report

- **Endpoint:** `GET /api/v1/reports/{id}/potential-duplicates/`
- **Permission:** IsAuthenticated + IsAuthorOrAdmin

- **Response format:** Array of PotentialDuplicateList objects.

```json
[
  {
    "id": 1,
    "source_report": 2,
    "matched_report": 1,
    "similarity_score": 0.75,
    "detection_method": "heuristic",
    "status": "suggested",
    "reviewed_by": null,
    "reviewed_at": null,
    "created_at": "2026-11-12T10:00:00Z",
    "updated_at": "2026-11-12T10:00:00Z",
    "source_report_title": "Broken elevator",
    "matched_report_title": "Elevator not working",
    "source_report_author": "other@example.com",
    "matched_report_author": "user@example.com"
  }
]
```

#### Admin: List Potential Duplicates

- **Endpoint:** `GET /api/v1/reports/duplicate-reports/`
- **Permission:** IsAdminUser
- **Query params:** `status` (string, optional)

- **Response format:** Array of PotentialDuplicateList objects (paginated).

#### Admin: Review Potential Duplicate

- **Endpoint:** `POST /api/v1/reports/duplicate-reports/{pk}/review/`
- **Permission:** IsAdminUser
- **Request format:** `application/json`

```json
{
  "action": "confirm",
  "reason": "Confirmed duplicate."
}
```

- **Action values:** `confirm`, `dismiss`

- **Response format:** 200 OK with updated PotentialDuplicateList object.

---

## Admin Dashboard

### Dashboard Statistics

- **Endpoint:** `GET /api/v1/dashboard/statistics/`
- **Permission:** IsAdminRole
- **Response format:** 200 OK

```json
{
  "total_reports": 10,
  "pending_reports": 2,
  "verified_reports": 3,
  "rejected_reports": 1,
  "resolved_reports": 4,
  "high_severity_reports": 5,
  "total_registered_users": 42,
  "total_accessibility_locations": 7,
  "total_positive_verifications": 12,
  "total_negative_verifications": 2
}
```

### Admin Report List

- **Endpoint:** `GET /api/v1/dashboard/reports/`
- **Permission:** IsAdminRole
- **Query params:**
  - `status` (string, optional)
  - `category` (string, optional)
  - `severity` (string, optional)
  - `user` (integer, optional)
  - `submitted_from` (date, optional)
  - `submitted_to` (date, optional)
  - `ai_suggested_severity` (string, optional)
  - `classification_status` (string, optional)
  - `awaiting_review` (boolean, optional)
  - `search` (string, optional)
  - `ordering` (string, optional)
- **Response format:** Paginated

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Broken elevator",
      "description": "Out of service.",
      "category": "elevator",
      "severity": "high",
      "status": "pending",
      "creator": {
        "id": 5,
        "email": "user@example.com",
        "username": "user",
        "full_name": "User Name",
        "role": "user"
      },
      "location_coordinates": {
        "latitude": 51.5074,
        "longitude": -0.1278,
        "location_id": 1,
        "location_name": "Central Station"
      },
      "image_count": 1,
      "positive_verification_count": 0,
      "negative_verification_count": 0,
      "creation_timestamp": "2026-11-12T10:00:00Z"
    }
  ]
}
```

### Admin Report Detail

- **Endpoint:** `GET /api/v1/dashboard/reports/{id}/`
- **Permission:** IsAdminRole
- **Response format:** 200 OK with full report.

### Admin Moderate Report

#### Verify

- **Endpoint:** `POST /api/v1/dashboard/reports/{id}/verify/`
- **Permission:** IsAdminRole
- **Request format:** `application/json`

```json
{
  "review_comment": "Confirmed in person."
}
```

- **Response format:** 200 OK with updated admin report.

#### Reject

- **Endpoint:** `POST /api/v1/dashboard/reports/{id}/reject/`
- **Permission:** IsAdminRole
- **Request format:** `application/json`

```json
{
  "review_comment": "Could not confirm. Needs more details."
}
```

- **Note:** `review_comment` is required and cannot be blank.

- **Response format:** 200 OK with updated admin report.

#### Resolve

- **Endpoint:** `POST /api/v1/dashboard/reports/{id}/resolve/`
- **Permission:** IsAdminRole
- **Request format:** `application/json`

```json
{
  "review_comment": "Verified by community."
}
```

- **Response format:** 200 OK with updated admin report.

#### Request Info

- **Endpoint:** `POST /api/v1/dashboard/reports/{id}/request-info/`
- **Permission:** IsAdminRole
- **Request format:** `application/json`

```json
{
  "review_comment": "Please provide a photo."
}
```

- **Response format:** 200 OK with updated admin report.

### Admin Analytics

#### Reports by Category

- **Endpoint:** `GET /api/v1/dashboard/reports-by-category/`
- **Permission:** IsAdminRole
- **Response format:** Array

```json
[
  {
    "category": "elevator",
    "count": 3
  }
]
```

#### Reports by Status

- **Endpoint:** `GET /api/v1/dashboard/reports-by-status/`
- **Permission:** IsAdminRole
- **Response format:** Array

```json
[
  {
    "status": "pending",
    "count": 2
  }
]
```

#### Reports Over Time

- **Endpoint:** `GET /api/v1/dashboard/reports-over-time/?group=day`
- **Permission:** IsAdminRole
- **Query params:** `group` (string, optional): `day` or `month` (default: `day`)
- **Response format:** 200 OK

```json
{
  "group": "day",
  "results": [
    {
      "period": "2026-11-12",
      "count": 1
    }
  ]
}
```

#### High Severity Reports

- **Endpoint:** `GET /api/v1/dashboard/high-severity-reports/`
- **Permission:** IsAdminRole
- **Response format:** Paginated list of admin reports.

### Admin User Management

#### List Users

- **Endpoint:** `GET /api/v1/dashboard/users/`
- **Permission:** IsAdminRole
- **Query params:**
  - `role` (string, optional)
  - `is_active` (boolean, optional)
  - `search` (string, optional)
  - `ordering` (string, optional)
- **Response format:** Paginated

#### Get User Detail

- **Endpoint:** `GET /api/v1/dashboard/users/{id}/`
- **Permission:** IsAdminRole

#### Update User Status

- **Endpoint:** `PATCH /api/v1/dashboard/users/{id}/status/`
- **Permission:** IsAdminRole
- **Request format:** `application/json`

```json
{
  "is_active": false
}
```

- **Response format:** 200 OK with updated user.

---

## Error Response Format

All error responses use a consistent envelope:

```json
{
  "error": true,
  "status_code": 400,
  "detail": {
    "field": ["Error message"]
  }
}
```

Or for simple errors:

```json
{
  "error": true,
  "status_code": 400,
  "detail": "Only pending reports can be verified."
}
```

---

## Status / Category Values

### Report Status

- `pending` — Pending
- `verified` — Verified
- `rejected` — Rejected
- `resolved` — Resolved

### Impact Level (Severity)

- `low`
- `medium`
- `high`
- `critical`

### AI Suggested Categories

- `elevator`
- `ramp`
- `tactile_paving`
- `accessible_toilet`
- `hearing_loop`
- `braille_signage`
- `step_free`
- `pathway`
- `entrance`
- `parking`
- `signage`
- `obstacle`
- `surface`
- `lighting`
- `other`
- `unknown`

### AI Classification Status

- `pending`
- `completed`
- `failed`

### Duplicate Status

- `suggested`
- `confirmed`
- `dismissed`

---

## Pagination

All list endpoints use DRF `PageNumberPagination` with `PAGE_SIZE = 20`.

```
{
  "count": 20,
  "next": "http://localhost:8000/api/v1/reports/?page=2",
  "previous": null,
  "results": []
}
```

---

## Summary of Frontend-Backend Integration Status

### Implemented Backend Endpoints

- ✅ Auth: register, login, refresh, logout, profile
- ✅ Accessibility locations: list, detail
- ✅ Reports: list, create, detail, update, delete
- ✅ Reports: verify, dispute, list verifications, my-verification, set-status
- ✅ Reports: classification, classification review, classification reviews
- ✅ Reports: potential-duplicates, duplicate-reports, duplicate-reports/{id}/review
- ✅ Reports: images upload, image delete
- ✅ Admin: dashboard statistics, report list, report detail
- ✅ Admin: report verify, reject, resolve, request-info
- ✅ Admin: reports-by-category, reports-by-status, reports-over-time, high-severity
- ✅ Admin: users list, user detail, user status update

### Unavailable / Incomplete Backend Integrations

- ⚠️ Accessibility locations create/update/delete endpoints may not be fully implemented for frontend use (backend defaults allow any).
- ⚠️ Admin user status update is available but user self-service is limited.
- ⚠️ AI classification is triggered server-side during report creation; no separate AI generate endpoint exists.

---

## Document Version

- Version: 1.0
- Last updated: 2026-11-12
