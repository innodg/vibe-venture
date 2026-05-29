# 급식 정보 조회 — Frontend

Vite + React + TypeScript app for searching schools and looking up 중식 (lunch)
menus over a date range. Talks to the FastAPI backend in `../api` through the
Vite dev proxy (`/api` → `http://localhost:8000`).

## Run

```bash
cd workshop/week-03/src/web
npm install
npm run dev
```

Open <http://localhost:5173>.

## Build

```bash
npm run build
```

Outputs to `dist/`.
