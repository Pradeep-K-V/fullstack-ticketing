# Fullstack Ticketing System

A full-stack support ticket management app built with the MERN stack. Users can register, log in, create and track tickets, and admins can manage, assign, and update ticket status.

**Live demo:** https://fullstack-ticketing.vercel.app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6, Axios |
| Backend | Node.js, Express |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT (jsonwebtoken, bcrypt) |
| Email | Nodemailer (Mailtrap for dev) |
| Deployment | Vercel (frontend), Render (backend) |

---

## Features

- **Auth** — Register, login, forgot/reset password via email link
- **Role-based access** — `customer` and `admin` roles
- **Tickets** — Create, view, comment on tickets
- **Admin panel** — Assign tickets, change status, delete tickets
- **Status workflow** — `Open → In-Progress → Resolved → Closed`
- **Search & filter** — Filter tickets by status, priority, or keyword
- **Token refresh** — Expired sessions are silently refreshed

---

## Project Structure

```
fullstack-ticketing/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js               # MongoDB connection
│   │   ├── middleware/
│   │   │   ├── jwtAuth.js          # JWT verify middleware
│   │   │   └── auth.js             # (legacy Auth0 middleware)
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   └── Ticket.js
│   │   ├── routes/
│   │   │   ├── auth.js             # register, login, refresh, reset
│   │   │   ├── tickets.js          # CRUD + status + comments
│   │   │   └── health.js           # health check endpoint
│   │   └── index.js                # Express app entry point
│   ├── .env                        # your local env vars (not committed)
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js            # Axios instance + interceptors
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── TicketsList.jsx
    │   │   ├── TicketDetail.jsx
    │   │   ├── CreateTicket.jsx
    │   │   ├── ForgotPassword.jsx
    │   │   └── ResetPassword.jsx
    │   ├── components/
    │   │   └── Nav.jsx
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env                        # local dev env vars
    ├── .env.production             # production env vars (Vercel build)
    ├── .env.example
    ├── vercel.json
    └── package.json
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (or local MongoDB)
- A Mailtrap account (or any SMTP provider) for password reset emails

### 1. Clone the repo

```bash
git clone https://github.com/your-username/fullstack-ticketing.git
cd fullstack-ticketing
```

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Fill in your `.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/ticketing

JWT_SECRET=your-strong-secret
JWT_EXPIRES_IN=8h

RESET_TOKEN_SECRET=another-strong-secret
RESET_TOKEN_EXPIRES=1h

SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-pass

APP_URL=http://localhost:5173
```

```bash
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
```

Fill in your `.env`:

```env
VITE_API_BASE=http://localhost:5000/api
```

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

## Deployment

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repo, set root to `backend/`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all environment variables from `.env` in the Render dashboard (use your production values — `APP_URL` should be your Vercel URL)

### Frontend → Vercel

1. Import your repo on [Vercel](https://vercel.com)
2. Set the root directory to `frontend/`
3. Add environment variable in Vercel dashboard:
   ```
   VITE_API_BASE=https://your-backend.onrender.com/api
   ```
4. Also update `frontend/.env.production` in your repo with the same value — Vite uses this file during `npm run build`

> **Important:** `.env.production` is what Vite bakes into the production bundle. If it's missing or has a placeholder URL, the deployed app will fall back to `localhost:5000` and fail on any device other than your own machine.

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register a new user |
| POST | `/api/auth/login` | None | Login, returns JWT |
| POST | `/api/auth/refresh` | Bearer token | Issue a new token |
| POST | `/api/auth/forgot-password` | None | Send password reset email |
| POST | `/api/auth/reset-password` | None | Reset password with token |

### Tickets

All ticket routes require a valid `Authorization: Bearer <token>` header.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/tickets` | Any | List tickets (customers see own; admins see all) |
| POST | `/api/tickets` | Any | Create a ticket |
| GET | `/api/tickets/:id` | Owner / Admin | Get ticket detail |
| PUT | `/api/tickets/:id` | Owner / Admin | Update ticket fields |
| PATCH | `/api/tickets/:id/status` | Owner / Assignee / Admin | Change ticket status |
| DELETE | `/api/tickets/:id` | Admin only | Delete a ticket |
| POST | `/api/tickets/:id/comments` | Any | Add a comment |

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Returns `{ ok: true }` |

---

## Ticket Status Workflow

```
Open → In-Progress → Resolved → Closed
              ↑          ↓
             Open   In-Progress
```

---

## Environment Variables Reference

### Backend

| Variable | Description |
|---|---|
| `PORT` | Port the Express server listens on (default: 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing login tokens |
| `JWT_EXPIRES_IN` | Login token expiry (e.g. `8h`) |
| `RESET_TOKEN_SECRET` | Secret for signing password reset tokens |
| `RESET_TOKEN_EXPIRES` | Reset token expiry (e.g. `1h`) |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `APP_URL` | Frontend URL (used in password reset email link) |

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_BASE` | Backend API base URL (e.g. `https://your-app.onrender.com/api`) |
