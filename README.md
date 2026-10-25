# ProjectFlow — Interactive Project Management Dashboard

A full-stack project management dashboard with Kanban board, analytics, team management, and real-time drag-and-drop.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, @dnd-kit |
| Backend  | Node.js, Express                    |
| Database | SQLite (better-sqlite3)             |

## Features

- **Dashboard** — Stats cards, pie & bar charts, project progress, activity feed
- **Projects** — Create / delete projects with custom colours
- **Kanban Board** — Drag-and-drop tasks across To Do → In Progress → Done
- **Tasks** — Title, description, priority, assignee, due date
- **Team** — Manage members with roles & avatar colours
- **Seeded data** — Ready-to-explore sample projects & tasks on first run

## Quick Start

### Prerequisites
- Node.js 18+

### 1. Install dependencies

```bash
cd project_dashboard

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

Or from root:

```bash
npm run install:all
```

### 2. Start the backend (port 5000)

```bash
cd backend
npm start
# or: npm run dev  (auto-reload)
```

### 3. Start the frontend (port 3000)

Open a **new terminal**:

```bash
cd frontend
npm run dev
```

### 4. Open the app

Go to **http://localhost:3000**

---

## API Endpoints

| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | /api/stats            | Dashboard statistics     |
| GET    | /api/projects         | List all projects        |
| POST   | /api/projects         | Create project           |
| PUT    | /api/projects/:id     | Update project           |
| DELETE | /api/projects/:id     | Delete project           |
| GET    | /api/tasks            | List tasks (filterable)  |
| POST   | /api/tasks            | Create task              |
| PUT    | /api/tasks/:id        | Update task              |
| DELETE | /api/tasks/:id        | Delete task              |
| POST   | /api/tasks/reorder    | Batch reorder (Kanban)   |
| GET    | /api/members          | List team members        |
| POST   | /api/members          | Add member               |
| GET    | /api/activity         | Activity log             |

## Project Structure

```
project_dashboard/
├── backend/
│   ├── server.js          # Express API
│   ├── db.js              # SQLite setup + seed data
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/client.js  # API helpers
│   │   ├── components/    # Layout
│   │   ├── pages/         # Dashboard, Projects, Board, Team
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── package.json
└── README.md
```

## Notes

- SQLite database file (`project_dashboard.db`) is created automatically on first backend start
- Sample data (3 projects, 15 tasks, 4 members) is seeded on first run
- Frontend proxies `/api` requests to `localhost:5000` during development

---

Built with ❤️ as a full-stack demo
