# Moneta — Personal Finance Tracker

MERN-style finance tracker built with React + Vite, Express, MongoDB Atlas, JWT, and bcrypt.

## Local setup (Windows PowerShell)

Requirements: Node.js LTS, VS Code, and a MongoDB Atlas database user/cluster.

1. In MongoDB Atlas, add your current IP to the project's IP Access List, create a database user, then copy the driver's connection string.
2. Copy `backend/.env.example` to `backend/.env`. Set `MONGODB_URI` to your Atlas URI and replace `JWT_SECRET` with a long random value. Keep this file private.
3. Open a VS Code terminal, then run:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

4. Open a second VS Code terminal and run:

   ```powershell
   cd frontend
   npm install
   Copy-Item .env.example .env
   npm run dev
   ```

5. Open the local URL Vite prints (normally `http://localhost:5173`). Register an account and add sample transactions.

## Features

- Registration and login with bcrypt-hashed passwords and JWT-protected endpoints.
- Per-user transaction records and API-level ownership checks.
- Create, edit, delete, and filter transactions by type; add custom category names.
- Monthly dashboard totals, running balance, category spending summary, and monthly budget warnings.
- Responsive dashboard layout.

## Deployment notes

- Backend: deploy the `backend` folder as a Node web service. Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (the deployed frontend origin), and use `npm install` / `npm start`. The server binds to `0.0.0.0` and `process.env.PORT`.
- Frontend: deploy the `frontend` folder as a Vite app. Set `VITE_API_URL` to the deployed backend's `/api` address and redeploy.
- Add the hosting backend's outbound IP/network access to Atlas as appropriate. Do not commit either `.env` file.

## API routes

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/transactions`, `PUT/DELETE /api/transactions/:id`
- `GET /api/dashboard?month=YYYY-MM`, `PUT /api/budget/:month`
- `GET /api/health`
