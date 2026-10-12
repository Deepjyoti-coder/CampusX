# CampusX — Full-Stack Campus Management Platform

## Quick Start

### Prerequisites
- **Node.js** v18+
- **MongoDB** running on `localhost:27017` (or update `MONGO_URI` in `server/.env`)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `server/.env`:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/campusai
JWT_SECRET=campusai_super_secret_key_2026
GEMINI_API_KEY=your-gemini-api-key-here
```
> AI features (Chat, Career Roadmap) use fallback responses when no Gemini API key is set. Get a free key at https://aistudio.google.com/apikey

### 3. Seed the database
```bash
node server/seed.js
```

### 4. Start the server
```bash
node server/server.js
```
Open **http://localhost:5000** in your browser.

---

## Default Login Credentials

| Role      | Email                  | Password      |
|-----------|------------------------|---------------|
| Student   | deep@campus.edu        | password123   |
| Admin     | admin@campus.edu       | password123   |
| Librarian | librarian@campus.edu   | password123   |
| Alumni    | priya@alumni.edu       | password123   |

---

## API Endpoints

| Method | Path                         | Auth | Roles           |
|--------|------------------------------|------|-----------------|
| POST   | /api/auth/register           | No   | —               |
| POST   | /api/auth/login              | No   | —               |
| GET    | /api/auth/me                 | Yes  | Any             |
| GET    | /api/books                   | No   | —               |
| POST   | /api/books/:id/reserve       | Yes  | Any             |
| POST   | /api/books/:id/return        | Yes  | Any             |
| GET    | /api/attendance/me           | Yes  | Student         |
| GET    | /api/attendance/summary/me   | Yes  | Student         |
| POST   | /api/attendance/mark         | Yes  | Admin/Librarian |
| GET    | /api/notices                 | No   | —               |
| POST   | /api/notices                 | Yes  | Admin           |
| GET    | /api/lostfound               | No   | —               |
| POST   | /api/chat/ask                | Yes  | Any             |
| POST   | /api/career/roadmap          | Yes  | Any             |
| GET    | /api/admin/stats             | Yes  | Admin           |
| GET    | /api/admin/users             | Yes  | Admin           |

---

## Architecture

```
server/
├── server.js          Express entry point
├── config/db.js       MongoDB connection
├── middleware/auth.js  JWT + role guard
├── models/            Mongoose schemas (User, Book, Borrow, etc.)
├── routes/            REST API endpoints
├── jobs/              Cron tasks (overdue books, attendance summary)
├── uploads/           Resume file storage
└── seed.js            Database seeder
```
