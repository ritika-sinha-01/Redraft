# Redraft

Build a resume, score it against a real job, write the letter, and track the application.

The mark is a cream serif **R** cut by a coral slash — strike the draft, rewrite it, send it.

## What’s in it

- **Editor** — 12 templates, live preview, fonts, accents, spacing, import from PDF / Word / text
- **ATS score** — pass/fail checklist, job-keyword match, verdict, and score history you can compare
- **AI assistant** — built-in review and rewrites; optional ChatGPT, Gemini, or Claude key
- **Cover letters** — generate from a resume + job description, download PDF or Word
- **Jobs** — live India openings (intern to senior, on-site / hybrid / remote), ranked to your resume
- **Tailor for this job** — one click copies the resume toward that posting, runs ATS, drafts a letter, and saves the role
- **Application tracker** — Saved / Applied / Interview / Offer / Rejected, notes, follow-up date
- **Account** — register, log in, change password, forgot password, delete account
- **Share, community, portfolio, premium** — public resume links, peer notes, a simple portfolio page, demo ₹999 checkout

## Stack

| | |
|---|---|
| Frontend | React 19, Vite 6, TypeScript, Tailwind v4, Zustand |
| Backend | Express 5, Prisma, SQLite, JWT cookies |
| Export | PDF (Chrome / Edge), PPT, cover-letter DOCX |

## Run locally

Need Node 20+. Use two terminals.

**1. API** — [http://localhost:4000](http://localhost:4000)

```bash
cd backend
copy .env.example .env
npm install
npx prisma generate
npm run db:setup
npm run dev
```

On macOS / Linux use `cp .env.example .env` instead of `copy`.

Set `CHROME_PATH` in `backend/.env` if PDF export cannot find Chrome or Edge.

**2. App** — [http://localhost:5174](http://localhost:5174)

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Port **5174** is intentional. 5173 is often taken by another Vite app.

## Scripts

| Where | Command | What it does |
|---|---|---|
| `backend` | `npm run dev` | API with reload |
| `backend` | `npm run db:setup` | Create tables and seed templates |
| `backend` | `npm run build` | TypeScript compile |
| `frontend` | `npm run dev` | Vite on 5174 |
| `frontend` | `npm run build` | Production build |

Do not commit `.env` or `backend/prisma/dev.db`. Those are already in `.gitignore`.
