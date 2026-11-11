# AccessGo Architecture

## Overview

AccessGo is a full-stack web application with a Django REST API backend and a React + TypeScript frontend.

```
AccessGo/
├── backend/        Django REST API
├── frontend/       React + Vite + TypeScript SPA
├── docs/           Architecture and API documentation
└── acssgo/         Python virtual environment (gitignored)
```

---

## Backend

### Structure

```
backend/
├── config/
│   ├── settings/
│   │   ├── base.py          Shared settings for all environments
│   │   └── development.py   Development overrides (DEBUG, CORS)
│   ├── urls.py              Root URL dispatcher — all routes under /api/v1/
│   ├── wsgi.py
│   └── asgi.py
├── apps/
│   ├── accounts/            Auth, user model, profiles, roles
│   ├── accessibility/       Locations, attributes, nearby filtering
│   ├── reports/             Reports, images, community verification
│   └── dashboard/           Admin statistics (read-only, no models)
├── services/
│   └── ai/
│       ├── classifier.py    LLM API integration
│       └── schemas.py       Output validation and dataclasses
└── manage.py
```

### Design principles

- Business logic lives in `services.py` modules, not in views.
- Views are thin — they validate input, call services, return responses.
- The AI service is fully isolated from report CRUD logic.
- Custom permissions are defined per-app in `permissions.py`.
- All apps use `apps.AppName` namespacing to avoid conflicts.

### Authentication

JWT via `djangorestframework-simplejwt`.

- `POST /api/v1/auth/login/` — obtain access + refresh tokens
- `POST /api/v1/auth/token/refresh/` — refresh access token
- `POST /api/v1/auth/logout/` — blacklist refresh token

Access tokens expire after 60 minutes. Refresh tokens expire after 7 days.

---

## Frontend

### Structure

```
frontend/src/
├── features/        One directory per product feature
│   ├── auth/
│   ├── accessibility/
│   ├── map/
│   ├── reports/
│   ├── verification/
│   ├── profile/
│   └── dashboard/
├── components/      Shared presentational components
├── lib/
│   ├── axios.ts     Axios instance with JWT injection and 401 refresh
│   └── auth.ts      Token storage helpers
├── router/          React Router v6 configuration
├── types/           Global TypeScript interfaces
├── App.tsx
└── main.tsx
```

### Design principles

- Each feature owns its own pages, components, and `api.ts`.
- No cross-feature imports — shared code goes in `components/` or `lib/`.
- All API calls go through the single Axios instance in `lib/axios.ts`.
- TypeScript strict mode is enabled — no `any`.

---

## AI Service

The AI classifier (`services/ai/classifier.py`) is responsible for one thing: taking a report text string and returning a validated `ClassificationResult`.

