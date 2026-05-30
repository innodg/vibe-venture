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

## Tests

Powered by **Vitest + React Testing Library + MSW**. Unit tests live next to
their source (`*.test.ts`/`*.test.tsx`); integration tests that mount the full
app live under `src/test/integration/`.

```text
src/
├── lib/
│   └── api.ts          api.test.ts        # unit (URL/error logic)
└── test/
    ├── setup.ts                            # jest-dom + MSW lifecycle
    ├── test-utils.tsx                      # renderWithProviders helper
    ├── msw/
    │   ├── handlers.ts                     # /api/* mocks
    │   └── server.ts
    └── integration/
        ├── search-flow.test.tsx
        └── meals-flow.test.tsx
```

> Note: presentational components (e.g. `Button`) and one-line utilities
> (`cn`) deliberately do **not** have unit tests — they have no branching
> logic of their own and are already exercised by the integration suite.
> Add component-level unit tests only when a component owns real logic
> (state machines, form validation, complex keyboard handlers).

`MSW` intercepts all `/api/*` requests so tests are deterministic and offline.

Run:

```bash
npm test              # one-shot
npm run test:watch    # watch mode
npm run test:coverage # coverage report (HTML in ./coverage)
```

