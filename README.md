**** AccessGo ♿**

* What is AccessGo?

Imagine you use a wheelchair, or you push a baby buggy, and you want to go to the train station.
But what if the lift at the station is broken? Or a ramp is blocked? You would only find out when you get there.

**AccessGo helps with that.** It is a website where people warn each other about things that make it hard to get around a city — like broken lifts, blocked ramps or broken footpaths.

* What can you do with it?

-  **Plan a trip** – Type where you start and where you want to go. AccessGo draws the walking route on a map and shows the problems people have reported near that route.
-  **Explore** – Look at a map and a list of all the problems people have reported.
-  **Report a problem** – Saw a broken lift? Tell everyone in 6 small steps: what it is, what type it is, how bad it is, where it is, and add photos.
- **Get AI help** – After you send a report, an AI reads it and *suggests* what type of problem it is and how serious it is. You can say "yes, use that" or "no, keep mine".
-  **"Did someone already report this?"** – AccessGo checks if a similar problem was already reported nearby, so the same problem isn't reported twice.
- **Help check reports** – Other people can press **Confirm** ("I saw it too!") or **Dispute** ("That's not true anymore").
-  **My reports** – See all the problems you reported and what happened to them.
-  **Helpers (admins)** – Special users check new reports and mark them as **Verified**, **Rejected** or **Resolved** (fixed!). They can also see charts and manage users.
-  **Your account** – Sign up, log in, change your profile picture, change your password, or get a "forgot password" email.
****

*  **Technologies**

 **Backend (API)** | Python 3.12, Django, Django REST Framework, SQLite database, JWT login tokens (Simple JWT) |
 **Frontend (website)** | React, TypeScript, Vite, Bootstrap 5, React Router, Axios |
 **Maps** | Leaflet + OpenStreetMap (map pictures), Nominatim (finding places), OSRM (walking routes) |
 **AI** | Google Gemini free version |
 **Charts** | Recharts (admin charts) |
 **Icons** | Lucide icons |

* **Interesting solutions** 

- **Finding problems near your route** – The API gets the route line and checks which reports are within about 50 metres of it, using some geometry maths (distance from a point to a line).
- **AI is only a helper, never the boss** – The AI only *suggests*. The person decides. The suggestions are shown in a separate, clearly marked "AI suggestions" box, so nobody confuses them with checked facts. If the AI is not working, the report still saves normally.
- **Two kinds of "checking"** – *Community verification* (people pressing Confirm/Dispute) is kept separate from *moderator status* (an admin's decision), so everyone knows who said what.
- **Duplicate detection** – When a new report is very similar to one nearby, the reporter sees a friendly "Similar report found nearby" message (it never blocks them).
- **Safe login** – Login uses access and refresh tokens. Refresh tokens are swapped every time they are used and old ones are blocked. Logging out or changing your password blocks them too. If many requests need a new token at once, only one refresh happens.
- **Safe "forgot password"** – The reset link works only once and only for 1 hour. The website never says if an email address has an account, and it limits how many times you can ask.
- **Phone first** – The website was designed for small phone screens first (even 320px wide) and then for big screens. Phones get a bottom menu bar; computers get a top menu.
- **Easy for everyone to use** – AccessGo is about accessibility, so the website itself is accessible: works with a keyboard, works with screen readers, big buttons, clear focus outlines, labels on every field, and colours are never the only way to show information (we also use text and icons).
- **Tests never spend AI money** – When tests run, the real AI is switched off automatically.

* **Folders Structure**

```
AccessGo/
├── backend/        The API (Django)
│   ├── apps/accounts/       Users, login, passwords, admin dashboard
│   ├── apps/reports/        Reports, photos, votes, AI and duplicates
│   ├── apps/accessibility/  Places (locations)
│   └── ai_services/         Talking to the Gemini AI
├── frontend/       The website (React)
└── docs/           Extra documentation



## How to run it on your computer 

You need two things installed first:

- **Python 3.12** or newer → check with `python --version`
- **Node.js 18** or newer → check with `node --version`

You will open **two terminal windows**: one for the API and one for the website.

##Part 1 – Start the API (backend) 

**Step 1.** Open a terminal in the `AccessGo` folder and make a "virtual environment" (a private box for Python packages):

```bash
python -m venv acssgo
```

**Step 2.** Turn it on:

```bash
# Windows
acssgo\Scripts\activate

# macOS / Linux
source acssgo/bin/activate
```

**Step 3.** Install the packages:

```bash
pip install -r backend/requirements.txt
```

**Step 4.** Make your settings file by copying the example:

```bash
# Windows
copy backend\.env.example backend\.env

# macOS / Linux
cp backend/.env.example backend/.env
```

Open `backend/.env` and set `DJANGO_SECRET_KEY` to any long random text.

*Optional – AI suggestions:* put your own Google Gemini key in `GEMINI_API_KEY` and a model name in `GEMINI_MODEL`. Without them, the app still works — it just won't show AI suggestions.

*Optional – emails:* password-reset emails are printed in the API terminal by default, so you can copy the link from there.

**Step 5.** Create the database:

```bash
cd backend
python manage.py migrate
```

**Step 6.** Make an admin account (so you can try the admin dashboard):

```bash
python manage.py createsuperuser
```

**Step 7.** Start the API:

```bash
python manage.py runserver
```

The API is now running at **http://127.0.0.1:8000/api/v1/**

### Part 2 – Start the website (frontend) 🍽️

**Step 1.** Open a **second** terminal in the `AccessGo` folder and go to the frontend:

```bash
cd frontend
```

**Step 2.** Install the packages:

```bash
npm install
```

**Step 3.** Make the settings file:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

(It already points to the API at `http://127.0.0.1:8000/api/v1`.)

**Step 4.** Start the website:

```bash
npm run dev
```

 Open **http://localhost:5173** in your browser. 

>  **"Use my location" tip:** browsers only share your location on `localhost` or `https://` addresses. Open the site at `http://localhost:5173` on your computer.

### Extra commands

```bash
python manage.py test

npm run build

python manage.py reclassify_reports --limit 5
```

---

## How I used AI tools to help me 

I built AccessGo myself, and I used two AI coding helpers like smart assistants sitting next to me:

- **Amazon Q** – I used Amazon Q in my code editor as a helper while building the project. I asked it questions, used its code suggestions and got help understanding errors while I wrote the app.
- **Claude Code extension (in VS Code)** – I used Claude Code to:
  - build the full **user account** part: profile page, profile picture, change password, forgot/reset password, logout, and the profile menu;
  - **redesign the whole website** to work well on Mobile first, with a bottom menu, step-by-step report form, map pop-ups, and a separate admin area;
  - **find and fix bugs**, for example photos that were not being saved, a fake AI box that showed made-up suggestions, and admin buttons that did nothing;
  - **write automated tests** so the app keeps working;
  - **check every page on different screen sizes** (from small phones to big computers) to make sure nothing breaks.

I always checked what the AI tools made, ran the tests, and decided what to keep. The AI tools helped me work faster.

Inside the app, **Google Gemini** is the AI that suggests the type and seriousness of each reported problem.
