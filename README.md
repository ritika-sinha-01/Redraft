# Redraft

**A full-stack job-application studio** — build a resume, score it against a real posting, tailor it in one click, write the cover letter, and track the pipeline.

Live app: [redraft-indol.vercel.app](https://redraft-indol.vercel.app)  
API: [redraft-iodz.onrender.com/api/health](https://redraft-iodz.onrender.com/api/health)  
Repo: [github.com/ritika-sinha-01/Redraft](https://github.com/ritika-sinha-01/Redraft)

<p align="left">
  <img src="frontend/public/redraft-mark-v2.png" alt="Redraft mark" width="72" height="72" />
</p>

Most resume tools stop at a pretty PDF. Redraft closes the loop: **draft → ATS truth → tailor to a job → letter → apply → follow up**.

---

## Product

| Area | What a recruiter / user can do |
|---|---|
| **Resume studio** | 12 live templates, split editor + A4 preview, fonts, accents, spacing, section order |
| **Import** | Drop a PDF, Word (`.docx`), or pasted text — fields are parsed into the editor |
| **ATS analyser** | Pass/fail checklist, keyword match to a job description, verdict, confidence, score history + compare |
| **Tailor for this job** | One action copies the resume toward that posting, re-scores ATS, drafts a letter, saves the application |
| **AI assistant** | Built-in review and rewrites (no API key). Optional ChatGPT, Gemini, or Claude with the user’s own key |
| **Cover letters** | Generate from resume + JD, style the layout, export **PDF** or **Word** |
| **Live jobs** | India openings (intern → senior, on-site / hybrid / remote) ranked to the attached resume |
| **Tracker** | Saved / Applied / Interview / Offer / Rejected, notes, follow-up date |
| **Auth** | Email + password, Google Sign-In, forgot / reset password, change password, delete account |
| **Share & extras** | Public resume links, peer review, portfolio page, demo Premium checkout (₹999) |

---

## Tech stack

### Frontend
| Layer | Choice |
|---|---|
| UI | **React 19**, **TypeScript** |
| Build | **Vite 6** (dev server on port **5174**) |
| Styling | **Tailwind CSS v4** + custom design tokens (teal ink / coral accent) |
| Routing | **React Router 7** |
| State | **Zustand** |
| Hosting | **Vercel** (SPA rewrites) |

### Backend
| Layer | Choice |
|---|---|
| Runtime | **Node.js**, **TypeScript**, **tsx** |
| HTTP | **Express 5** |
| ORM / DB | **Prisma 5**, **SQLite** |
| Auth | **JWT** (httpOnly cookie + `Authorization: Bearer` for cross-origin) |
| Passwords | **bcryptjs** |
| Google | **google-auth-library** + Google Identity Services |
| CORS | Credentialed origins (local + Vercel) |
| Hosting | **Render** |

### Documents & intelligence
| Capability | Library / approach |
|---|---|
| Resume PDF | **puppeteer-core** (Chrome / Edge) |
| Cover letter DOCX | **docx** |
| PPT export | **pptxgenjs** |
| Import Word | **mammoth** |
| Import PDF | **pdf-parse** |
| ATS | Deterministic analyser (structure, impact, keywords, verdict) — not a vanity score |
| Live jobs | Ranked fetch from public boards (intern / experienced / senior; on-site, hybrid, remote) |
| Built-in AI | Heuristic assistant that reads the attached resume; optional OpenAI / Gemini / Anthropic |

---

## Architecture

```
Browser (Vercel)                     API (Render)
┌─────────────────────┐              ┌──────────────────────────┐
│ React + Vite        │  JSON + JWT  │ Express + Prisma         │
│ Editor / ATS / Jobs │─────────────▶│ Auth, resumes, letters   │
│ Zustand stores      │◀─────────────│ ATS, jobs, tracker, AI   │
└─────────────────────┘              │ SQLite                   │
                                     └──────────────────────────┘
```

- Frontend talks to `VITE_API_URL` locally; on Vercel it targets the Render API.
- Auth works across two hosts: the API returns a JWT; the client stores it and sends `Authorization: Bearer` on every request (cookies alone fail across `vercel.app` and `onrender.com`).
- PDF rendering uses a real browser engine so the export matches the on-screen paper preview.

---

## Engineering notes (what this repo shows)

- **Typed full-stack TypeScript** — shared resume shapes, ATS report types, Prisma models
- **Real ATS, not a fake gauge** — checklist + JD keyword %, confidence drops when no posting is pasted
- **Job-tailor pipeline** — copy resume → rewrite toward JD → persist ATS run → generate letter → create tracker row
- **Document pipeline** — import (PDF/DOCX/text) and export (PDF / PPT / DOCX)
- **Auth that survives split hosting** — JWT cookie *and* Bearer token; Google ID-token verification
- **Production deploy** — GitHub → Vercel (SPA) + Render (Node + Prisma)

---

## Run locally

Node 20+. Two terminals.

**API** — http://localhost:4000

```bash
cd backend
copy .env.example .env
npm install
npx prisma generate
npm run db:setup
npm run dev
```

On macOS / Linux: `cp .env.example .env`.

**App** — http://localhost:5174

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Port **5174** is intentional so it does not collide with another Vite app on 5173.

### Environment

`backend/.env`

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `file:./dev.db` |
| `JWT_SECRET` | Long random string (not the default in production) |
| `CLIENT_ORIGIN` | `http://localhost:5174` (comma-separate extra origins) |
| `CHROME_PATH` | Optional, if PDF export cannot find Chrome/Edge |
| `GOOGLE_CLIENT_ID` | Optional, Google Sign-In |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | Optional server-side AI |

`frontend/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | `http://localhost:4000` |
| `VITE_GOOGLE_CLIENT_ID` | Optional; otherwise the app reads it from the API |

Do not commit `.env` or `backend/prisma/dev.db`.

---

## Scripts

| Where | Command | What it does |
|---|---|---|
| `backend` | `npm run dev` | API with reload |
| `backend` | `npm run db:setup` | Push schema + seed 12 templates |
| `backend` | `npm run build` | `tsc` compile |
| `frontend` | `npm run dev` | Vite on 5174 |
| `frontend` | `npm run build` | Production bundle |

---

## Deployed as

| Piece | Platform | URL |
|---|---|---|
| Client | Vercel | https://redraft-indol.vercel.app |
| API | Render | https://redraft-iodz.onrender.com |
| Source | GitHub | https://github.com/ritika-sinha-01/Redraft |

---

Built by [Ritika Sinha](https://github.com/ritika-sinha-01) — resume product, ATS, live jobs, and the apply loop in one TypeScript codebase.
