# NextStep

**Turn student advice into real action plans.**

NextStep is a student productivity and peer-support web application built for the
**C270 DevOps Essentials** module at Republic Polytechnic. It combines a Reddit-style
advice forum, a habit/study tracker, a calendar planner, a dashboard, and an admin
moderation panel into one clean app.

**Core flow:** Read advice → Save the solution → Create a habit/study plan → Add it to the calendar → Track progress.

---

## Tech stack

| Layer      | Technology                                             |
| ---------- | ------------------------------------------------------ |
| Frontend   | Next.js 14 (App Router) + React 18                     |
| Styling    | Hand-written modern CSS design system (no build step)  |
| Backend    | Express.js REST API                                    |
| Data       | In-memory mock arrays (structured for a future real DB) |
| Testing    | Node's built-in test assertions (no extra dependency)  |

The backend uses simple in-memory arrays as a stand-in for a database. Every data
file is organised like a table (`users`, `posts`, `comments`, `habits`, `calendar`,
`adminRequests`) so it can later be swapped for MySQL / SQLite / PostgreSQL without
rewriting the controllers.

---

## Project structure

```
nextstep/
├── package.json            # root scripts (runs both apps together)
├── README.md
├── .gitignore
├── docker-compose.yml      # future DevOps: run both containers
├── .github/workflows/ci.yml# future DevOps: GitHub Actions pipeline
│
├── frontend/               # Next.js app
│   ├── app/                # pages (App Router)
│   │   ├── page.js         # landing / welcome
│   │   ├── login/          # login + register
│   │   ├── dashboard/
│   │   ├── forum/
│   │   ├── tracker/
│   │   ├── calendar/
│   │   └── admin/
│   ├── components/         # Navbar, Sidebar, Button, Card, PostCard, HabitCard, ...
│   ├── lib/                # api.js (fetch wrapper), auth.js (context), icons.js
│   ├── app/globals.css     # the full CSS design system
│   └── Dockerfile
│
└── backend/                # Express API
    ├── server.js           # app entry, mounts all routes
    ├── routes/             # /api/auth, /api/posts, /api/comments, ...
    ├── controllers/        # request handling logic
    ├── data/               # in-memory mock "tables"
    ├── middleware/         # logger + error handler
    ├── tests/              # api.test.js
    └── Dockerfile
```

---

## Getting started (VS Code)

### 1. Prerequisites
- **Node.js 18 or newer** (`node -v` to check) and npm.
- VS Code (any editor works, but instructions assume VS Code).

### 2. Open the project
Unzip the folder, then in VS Code: **File → Open Folder → `nextstep`**.
Open a terminal with **Terminal → New Terminal**.

### 3. Install dependencies
The easiest way — from the `nextstep` root, install everything at once:

```bash
npm install          # installs "concurrently" at the root
npm run install:all  # installs backend + frontend packages too
```

Prefer to do it manually? That works too:

```bash
cd backend  && npm install
cd ../frontend && npm install
```

### 4. Configure the frontend API URL (optional)
The frontend defaults to `http://localhost:4000`. To be explicit, copy the example:

```bash
cd frontend
cp .env.local.example .env.local
```

### 5. Run the app
From the `nextstep` root, start **both** servers with one command:

```bash
npm run dev
```

- Frontend → **http://localhost:3000**
- Backend  → **http://localhost:4000** (health check at `/api/health`)

Open http://localhost:3000 in your browser.

> Prefer two terminals? Run `npm run dev:backend` in one and `npm run dev:frontend`
> in the other.

### 6. Run the tests

```bash
npm test
```

This runs the backend API tests (login, post creation, advice-to-habit, admin
approval). They use only Node's built-in assertions, so there's nothing extra to install.

---

## Demo accounts

| Role         | Email               | Password      | Notes                          |
| ------------ | ------------------- | ------------- | ------------------------------ |
| Student      | `alex@rp.edu.sg`    | `password123` | Year 2 — pre-filled on login   |
| Student      | `priya@rp.edu.sg`   | `password123` | Year 3                         |
| Admin        | `admin@rp.edu.sg`   | `admin123`    | Sees the Admin Moderation page |

The login screen has quick-fill buttons for these accounts so you don't have to type
them during a demo.

> **Note on auth:** for this prototype, passwords are stored in plain text in the mock
> data and the "token" is a simple placeholder. Real password hashing (bcrypt) and JWT
> sessions are planned for the database phase — the code is commented where this swap
> happens.

---

## Features & team ownership

Each teammate owns one functional feature end-to-end (frontend page + backend routes),
which maps directly to the C270 contribution requirement.

| # | Feature                          | Owns (frontend)        | Owns (backend)                         |
| - | -------------------------------- | ---------------------- | -------------------------------------- |
| 1 | Authentication + year display    | `login/`, `lib/auth.js`| `/api/auth`, `data/users.js`           |
| 2 | Forum posts CRUD                 | `forum/`, `PostCard`   | `/api/posts`, `/api/comments`          |
| 3 | Habit / study tracker            | `tracker/`, `HabitCard`| `/api/habits`                          |
| 4 | Advice → tracker + calendar      | `calendar/`, dashboard | `/api/calendar` (+ habit `sourcePostId`)|
| 5 | Admin moderation + dashboard     | `admin/`               | `/api/admin`                           |

**The signature integration:** on the forum, the **"Add to My Tracker"** button on any
post creates a habit from that post's *suggested action* and links it back with a
`sourcePostId`. That habit can then be scheduled on the calendar — this is the "advice
becomes action" loop that defines NextStep.

---

## REST API reference

Base URL: `http://localhost:4000`

| Method | Endpoint                          | Purpose                              |
| ------ | --------------------------------- | ------------------------------------ |
| POST   | `/api/auth/register`              | Create an account                    |
| POST   | `/api/auth/login`                 | Log in                               |
| GET    | `/api/posts?category=&search=`    | List approved posts (filterable)     |
| POST   | `/api/posts`                      | Create a post                        |
| POST   | `/api/posts/:id/upvote`           | Upvote a post                        |
| GET    | `/api/comments?postId=`           | Comments for a post                  |
| POST   | `/api/comments`                   | Add a comment                        |
| GET    | `/api/habits?userId=`             | List a user's habits                 |
| POST   | `/api/habits`                     | Create a habit (optionally from advice) |
| PUT    | `/api/habits/:id`                 | Update status/progress               |
| GET    | `/api/calendar?userId=`           | List scheduled tasks                 |
| POST   | `/api/calendar`                   | Schedule a task                      |
| GET    | `/api/admin/stats`                | Dashboard statistics                 |
| GET    | `/api/admin/pending-posts`        | Posts awaiting moderation            |
| PUT    | `/api/admin/posts/:id/approve`    | Approve a post                       |

(See the `backend/routes/` folder for the full list.)

---

## GitHub workflow

We use a simple, marker-friendly branching model so every commit is traceable to a
teammate and a feature.

- **`main`** — always runnable; only reviewed work is merged here.
- **`dev`** — integration branch where features come together.
- **`feature/<name>`** — one branch per feature, e.g. `feature/auth`, `feature/forum`,
  `feature/tracker`, `feature/calendar`, `feature/admin`.

Typical cycle:

```bash
git checkout dev
git checkout -b feature/tracker      # start your feature
# ... make changes ...
git add .
git commit -m "tracker: add mark-complete + progress bar"
git push -u origin feature/tracker   # open a Pull Request into dev
```

Guidelines: small, descriptive commits; open a Pull Request for review before merging;
keep `main` green (tests passing).

---

## Future DevOps plan (Phase 2)

The project is already structured so the DevOps phase is mostly wiring, not rewriting.

**1. Docker containerisation** — `Dockerfile`s for both apps and a `docker-compose.yml`
are included as starters. One command brings the whole stack up:

```bash
docker compose up --build
```

**2. CI/CD** — a starter GitHub Actions workflow lives at `.github/workflows/ci.yml`.
On every push it installs dependencies and runs `npm test`. This later extends to
building the Docker images and (optionally) deploying. Jenkins is an alternative if the
module requires it.

**3. Automated testing** — `backend/tests/api.test.js` already covers the core logic.
Next steps: add more controller tests, plus frontend component tests (e.g. React Testing
Library) so the pipeline can gate merges on passing tests.

**4. Database** — replace the in-memory arrays in `backend/data/` with a real database
(MySQL / SQLite / PostgreSQL). Because controllers only talk to those data modules, the
routes and frontend stay unchanged.

**5. Deployment** — frontend to Vercel (or a container host); backend to Render / Railway
/ a small VM. Environment variables (`NEXT_PUBLIC_API_URL`, `PORT`) are already
externalised for this.

---

## Troubleshooting

- **"Cannot reach the backend" banner** → make sure the backend is running on port 4000
  (`npm run dev:backend`) and reload.
- **Port already in use** → stop whatever is using 3000/4000, or change the frontend port
  with `npm --prefix frontend run dev -- -p 3001`.
- **Blank page after login** → confirm both servers are running; check the browser
  console and the backend terminal for errors.

---

*Built as a C270 DevOps Essentials midpoint prototype. Data is mocked in-memory and
resets when the backend restarts.*
