# AI-Powered Report Classification (Gemini)

## Overview
When a user creates an accessibility report (`POST /api/v1/reports/`), the backend saves the report first, then runs Gemini-based classification against the report title/description. AI suggestions are stored separately and **never** overwrite the user-provided `category` or `accessibility_impact`, and **never** auto-verify/approve/reject/resolve reports. If classification fails or Gemini is unavailable, report creation still succeeds and the failure is recorded.

## How to obtain a Gemini API key
1. Go to [Google AI Studio](https://aistudio.google.com/) and sign in with a Google account.
2. Create/generate an API key for the Gemini API.
3. Choose a currently supported Gemini model available to your key/project (see Google’s model documentation in AI Studio/Google AI for Developers) and set it as `GEMINI_MODEL`.

## Environment configuration
Set in backend environment / `.env` (see `.env.example`):
- `GEMINI_API_KEY` — your Gemini API key (required for live classification)
- `GEMINI_MODEL` — supported model id (e.g. a current Gemini flash/pro model available to your account)
- `GEMINI_TIMEOUT_SECONDS` — optional request timeout in seconds (default 15)

Do not commit real `.env` values or expose the API key in responses.

## How classification works
- **Flow:** report validated & saved → classification record created/updated (pending) → Gemini called with a strict system instruction and only report text (title/description/user-provided values as context) → response parsed/validated → stored.
- **Allowed values:** severity is validated against project choices `low|medium|high|critical`. Category suggestions are validated against the backend’s allowed AI category set (derived from existing project usage plus `unknown`); invalid AI values are rejected and recorded as failures.
- **Storage:** `reports.ReportClassification` (OneToOne per report): `suggested_category`, `suggested_severity`, `keywords` (JSON), `summary`, `confidence_score`, `ai_provider`, `model_name`, `classification_status` (`pending|completed|failed`), `error_message`, timestamps. A compact mirror is kept in `AccessibilityReport.ai_classification` (read-only in APIs). Reclassification updates the same record (no duplicates).
- **User data:** does not change `category`, `accessibility_impact`, or `status`. No personal auth data (email/password/JWT) is sent to Gemini.

## API
- `POST /api/v1/reports/` — creates report; triggers classification (non-fatal on AI errors). Response includes `classification` details.
- `GET /api/v1/reports/{id}/` — includes `classification` when available.
- `GET /api/v1/reports/{id}/classification/` — authenticated; **only report author or admin** may access. Returns the classification record.

### Example classification response
```json
{
  "id": 10,
  "report": 25,
  "suggested_category": "elevator",
  "suggested_severity": "high",
  "keywords": ["elevator", "wheelchair access", "platform access"],
  "summary": "Elevator malfunction restricting wheelchair access to the platform.",
  "confidence_score": 0.95,
  "ai_provider": "gemini",
  "model_name": "gemini-1.5-flash",
  "classification_status": "completed",
  "error_message": "",
  "created_at": "2026-11-12T10:00:00Z",
  "updated_at": "2026-11-12T10:00:01Z"
}
```
(Actual `suggested_category`/severity values must match backend-allowed values; on failure `classification_status` is `failed` with `error_message` and suggestion fields may be empty.)

## Failure handling
- Timeouts, rate limits, network/service errors, invalid/empty JSON, schema mismatches, or invalid category/severity → caught, recorded as `failed` with a safe `error_message`; **report creation remains successful**.
- Missing/unconfigured key or model → recorded as unavailable/failed.
- All AI outputs are validated server-side before saving; untrusted values are never applied to user fields.

## Testing
- Automated tests mock Gemini (no real API calls): `.\acssgo\Scripts\python.exe backend\manage.py test apps.reports`
- Manual (Postman): configure valid `GEMINI_API_KEY`/`GEMINI_MODEL`, create a report via `POST /api/v1/reports/` (auth), then `GET /api/v1/reports/{id}/classification/` as author/admin to inspect result or recorded failure.
