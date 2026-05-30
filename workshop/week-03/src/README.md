# 급식 정보 조회 — Apps

Full-stack 급식 (school lunch) lookup app for the week-03 workshop.

```
src/
├── api/    FastAPI backend (Python 3.12+ / uv)
├── web/    React + Vite + TypeScript frontend
└── e2e/    Playwright end-to-end tests
```

The frontend talks to the backend via `/api/*`. In `npm run dev` mode that's
proxied to `http://localhost:8000`; in production builds the frontend assumes
the backend is reachable at the same origin under `/api`.

For deeper details on each app, see its own `README.md`. This document is the
**single starting point** for running and testing everything.

## 1. Prerequisites

| Tool | Version | Used by |
| --- | --- | --- |
| Python | 3.12+ | `api` |
| [`uv`](https://docs.astral.sh/uv/) | latest | `api` |
| Node.js | 20+ | `web`, `e2e` |
| npm | 10+ | `web`, `e2e` |
| A NEIS API key | — | `api` (real data) |

The NEIS key goes in `workshop/week-03/.env` as `NEIS_API_KEY=...`. The test
suites do **not** need it — they mock NEIS / `/api/*` at the appropriate
boundary.

## 2. Run the apps locally

You'll want two terminals: one for the API and one for the web app.

### Backend (terminal 1)

```bash
cd workshop/week-03/src/api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

- App: <http://localhost:8000>
- OpenAPI docs: <http://localhost:8000/docs>

### Frontend (terminal 2)

```bash
cd workshop/week-03/src/web
npm install
npm run dev
```

- App: <http://localhost:5173> (Vite dev server, with `/api` proxied to `:8000`)

### Production-style frontend build

```bash
cd workshop/week-03/src/web
npm run build
npm run preview          # serves the built bundle at http://localhost:4173
```

## 3. Test the apps

Three test layers, smallest to largest:

| Layer | Where | Tool | Speed | Mocks |
| --- | --- | --- | --- | --- |
| Unit / integration (API) | `api/tests/` | pytest + respx | < 1s | NEIS HTTP boundary |
| Unit / integration (Web) | `web/src/**/*.test.*`, `web/src/test/integration/` | Vitest + RTL + MSW | ~4s | `/api/*` (browser) |
| End-to-end | `e2e/tests/` | Playwright (Chromium) | ~5s | `/api/*` (browser, via `page.route`) |

### 3.1 Backend tests (40 tests)

```bash
cd workshop/week-03/src/api
uv sync --all-groups            # installs pytest + respx + pytest-cov
uv run pytest                   # all tests
uv run pytest -m unit           # unit only
uv run pytest -m integration    # integration only
uv run pytest --cov=app         # with coverage
```

`tests/conftest.py` provides shared fixtures (settings override, `TestClient`,
respx mock, NEIS row factories). No test hits the real NEIS service.

### 3.2 Frontend tests (17 tests)

```bash
cd workshop/week-03/src/web
npm install
npm test                   # one-shot
npm run test:watch         # watch mode
npm run test:coverage      # coverage report (HTML in ./coverage)
```

MSW handlers in `src/test/msw/handlers.ts` intercept every `/api/*` call so
tests are deterministic and offline.

### 3.3 End-to-end tests (3 tests)

The E2E suite runs Chromium against the **production Vite bundle** of `web`
and intercepts `/api/*` calls with `page.route()`. The FastAPI backend does
**not** need to be running.

```bash
cd workshop/week-03/src/e2e
npm install
npx playwright install chromium     # one-time, downloads the browser binary
npm test                            # builds ../web (pretest) and runs Playwright
```

Other useful commands:

```bash
npm run test:headed     # watch the browser
npm run test:ui         # Playwright UI mode (great for debugging)
npm run report          # open the latest HTML report
```

### 3.4 Run everything

From `workshop/week-03/src`:

```bash
( cd api  && uv sync --all-groups && uv run pytest ) \
  && ( cd web  && npm install && npm test ) \
  && ( cd e2e  && npm install && npx playwright install chromium && npm test )
```

Expected: **40 + 17 + 3 = 60 tests passing**.

## 4. Layout

```
workshop/week-03/src/
├── README.md            ← you are here
├── api/
│   ├── app/             FastAPI app (routers, NEIS client, schemas, settings)
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── pyproject.toml
│   └── README.md
├── web/
│   ├── src/
│   │   ├── pages/       routed pages (Landing, DateRange, MealsResult)
│   │   ├── components/  UI components (shadcn-flavored)
│   │   ├── lib/         api client + utils (with colocated unit tests)
│   │   └── test/        MSW handlers, integration suites, test utilities
│   ├── package.json
│   └── README.md
└── e2e/
    ├── tests/           happy-path + no-results specs
    ├── support/         POM helpers + `mockApi` fixture
    ├── fixtures/        canned NEIS-shaped payloads
    ├── playwright.config.ts
    ├── package.json
    └── README.md
```

## 5. Troubleshooting

- **Port already in use** — `8000` (api), `5173` (web dev), `4173` (web preview / e2e).
  Change with `--port` or stop the previous process.
- **E2E `webServer` timeout** — Playwright probes `127.0.0.1:4173`. The
  config explicitly binds Vite preview to `127.0.0.1` to match. If you change
  the host, update both ends.
- **NEIS key missing in dev** — only the `api` runtime needs it. Tests don't.
