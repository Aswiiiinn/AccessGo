# AccessGo

A community-powered accessibility intelligence platform for urban transportation.

Users can discover accessibility information, report infrastructure problems, verify community reports, and help other commuters identify accessibility barriers.

---

## Tech Stack

| Layer    | Technology                                              |
|----------|---------------------------------------------------------|
| Backend  | Python, Django, Django REST Framework, SQLite, JWT      |
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

### Steps

```bash
# Activate the virtual environment
# Windows
acssgo\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env and set DJANGO_SECRET_KEY

# Run migrations
cd backend
python manage.py migrate

# Create a superuser
python manage.py createsuperuser

# Start the development server
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

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — VITE_API_BASE_URL should point to your Django server

# Start the development server
npm run dev
```

Frontend available at: `http://localhost:5173`

---

## Documentation

- [Architecture](docs/architecture.md)
- [Database Models](docs/database.md)
- [API Endpoints](docs/api.md)

---

## API Overview

```
POST   /api/v1/auth/register/
POST   /api/v1/auth/login/
POST   /api/v1/auth/logout/
GET    /api/v1/auth/profile/

GET    /api/v1/accessibility/locations/
GET    /api/v1/accessibility/locations/nearby/?lat=&lng=&radius=

GET    /api/v1/reports/
POST   /api/v1/reports/
POST   /api/v1/reports/{id}/verify/

GET    /api/v1/dashboard/stats/
```
