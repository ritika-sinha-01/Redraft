# Redraft

A full resume product: create, customize, share, score, review, apply, and export.

## Run locally

```bash
cd backend
npm install
npx prisma generate
npm run db:setup
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5174
- API: http://localhost:4000

Port 5173 is often used by other Vite apps. This project uses 5174 so you always get Redraft.

PDF export uses Chrome or Edge on this machine. Set `CHROME_PATH` in `backend/.env` if needed.

## What’s included

- Auth, 12 templates (4 premium), live editor, PDF/PPT export
- Rich text, optional Projects/Awards, fonts, accent colors, section order, spacing
- Shareable public links, ATS check, wording suggestions, JD keywords, scorecard, version history
- Peer + professional review, demo Premium checkout, job board + applications, portfolio builder
