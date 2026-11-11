# AccessGo

A community-powered accessibility intelligence platform for urban transportation.

Users can discover accessibility information, report infrastructure problems, verify community reports, and help other commuters identify accessibility barriers.

---

## Tech Stack

| Layer    | Technology                                              |
|----------|---------------------------------------------------------|
| Backend  | Python 3.12, Django 6.1, Django REST Framework, SQLite, JWT |
| Frontend | React, TypeScript, Vite, Axios, React Router, Bootstrap 5, Leaflet |
| AI       | LLM API (isolated service layer)                        |

---

## Project Structure

```
AccessGo/
├── backend/        Django REST API
├── frontend/       React + Vite SPA
├── docs/           Architecture, database and API documentation
└── acssgo/         Python virtual environment (gitignored)
```

---

## Backend Setup

### Prerequisites
- Python 3.12+

### 1. Activate the virtual environment

```bash
# Windows
acssgo\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at minimum:

```env
DJANGO_SECRET_KEY=your-secret-key-here
```

### 4. Run database migrations

```bash
cd backend
python manage.py migrate
```

### 5. Create a superuser (optional)

```bash
python manage.py createsuperuser
```

> You will be prompted for an email and password. Email is the login identifier.

### 6. Start the development server

```bash
python manage.py runserver
```

API available at: `http://localhost:8000/api/v1/`  
Admin panel at: `http://localhost:8000/admin/`

---

## Frontend Setup

### Prerequisites
- Node.js 18+

### Steps

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend available at: `http://localhost:5173`

---

## Running Tests

```bash
cd backend
python manage.py test apps --verbosity=2
```

---

## API Authentication

AccessGo uses JWT (JSON Web Tokens) for authentication.

### Register

```http
POST /api/v1/auth/register/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "YourPassword1!",
  "full_name": "Your Name"
}
```

### Login

```http
POST /api/v1/auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "YourPassword1!"
}
```

Response:
```json
{
  "access": "<access_token>",
  "refresh": "<refresh_token>"
}
```

### Authenticated requests

Include the access token in the `Authorization` header:

```http
GET /api/v1/auth/profile/
Authorization: Bearer <access_token>
```

### Refresh access token

```http
POST /api/v1/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "<refresh_token>"
}
```

### Logout

```http
POST /api/v1/auth/logout/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refresh": "<refresh_token>"
}
```

---

## API Overview

```
POST   /api/v1/auth/register/
POST   /api/v1/auth/login/
POST   /api/v1/auth/token/refresh/
POST   /api/v1/auth/logout/
GET    /api/v1/auth/profile/
PATCH  /api/v1/auth/profile/

GET    /api/v1/accessibility/locations/
GET    /api/v1/accessibility/locations/nearby/?lat=&lng=&radius=

GET    /api/v1/reports/
POST   /api/v1/reports/
POST   /api/v1/reports/{id}/verify/

GET    /api/v1/dashboard/stats/
```

---

## Documentation

- [Architecture](docs/architecture.md)
- [Database Models](docs/database.md)
- [API Endpoints](docs/api.md)
