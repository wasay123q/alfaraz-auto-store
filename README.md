# Alfaraz Auto Spare Parts

Lightweight full-stack sample app (Express + SQLite backend, static frontend) for managing spare parts and simple cart/checkout.

## Project structure

```
alfaraz-auto-spare/
├── backend/
│   ├── package.json         # backend npm manifest (Express + sqlite3 etc.)
│   └── server.js            # main Express server and API (SQLite database)
│   └── database.db          # SQLite DB (created at runtime)
├── frontend/
│   ├── index.html           # landing/home page
│   ├── shop.html            # browse parts and add-to-cart UI
│   ├── cart.html            # cart UI and checkout (fixed nested script tag)
│   ├── login.html           # user login
│   ├── signup.html          # user signup
│   ├── dashboard.html      # admin dashboard (manage parts/orders)
│   ├── script.js            # shared frontend JS
│   ├── style.css            # styles
│   └── other static assets  # images, icons as needed
└── README.md                # (this file)
```

> Note: `database.db` will be created automatically by the server if it doesn't exist. The backend seeds an admin user during initialization.

## Quick start

Requirements:
- Node.js (14+ recommended)
- npm

1. Start backend

Open a terminal in the `backend` folder and install dependencies then start the server:

```powershell
cd backend
npm install
node server.js
```

The server listens on `http://localhost:4000` by default.

2. Open frontend

The frontend is static HTML/CSS/JS; open `frontend/index.html` in your browser or serve the `frontend` folder with a simple static server (recommended for fetch requests to work with CORS):

Option A: open files directly (some features may be limited by browser security)

Option B (recommended): run a simple static server (example using npm http-server)

```powershell
# from project root
npm install -g http-server
cd frontend
http-server -c-1
# then open http://127.0.0.1:8080 in browser
```

## Backend API (summary from `backend/server.js`)

Base URL: http://localhost:4000

- GET /                 — health check

User
- POST /user/signup     — body: { name, email, password } -> registers a user
- POST /user/login      — body: { email, password } -> returns { userId }

Admin
- POST /admin/login     — body: { username, password } -> admin auth

Spare parts
- GET /parts            — list all parts
- POST /parts           — create part; body: { name, price, quantity }
- PUT /parts/:id        — update part
- DELETE /parts/:id     — delete part

Orders / Checkout
- POST /cart/checkout   — body: { user_id, items: [ { part_id, price, quantity } ] }
- GET /orders/:user_id  — list orders for a user
- GET /orders           — list all orders (admin)

Database: SQLite (file: `backend/database.db`). Tables created at startup: `users`, `admin`, `spare_parts`, `orders`.

## Notes & troubleshooting

- The server seeds an admin user with username: `Muhammad Ahsan Ali` and password: `Sprinter@6001` on first run.
- If fetch calls from the frontend to `http://localhost:4000` fail due to CORS: ensure backend is running and that `app.use(cors())` is active (it is by default in `server.js`).
- If you see database file permission issues, ensure the process has write permission in the `backend` folder.

## Next steps / Improvements

- Add environment configuration (PORT, DB path, BCRYPT_ROUNDS) via `.env` and use dotenv.
- Add JWT authentication for users and admin and protect admin endpoints.
- Add input validations and unit/integration tests.
- Add Dockerfile and docker-compose for easy local setup.

---

If you'd like, I can also:
- Add a small `npm` start script to `backend/package.json`.
- Create a `Dockerfile` + `docker-compose.yml`.
- Add basic integration tests for the API.

Which one should I do next?