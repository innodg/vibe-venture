# E2E Tests (Playwright)

End-to-end tests for the 급식 정보 조회 web app. These run a real Chromium
browser against the **production Vite bundle** of `../web`, with `/api/*`
calls intercepted at the browser level via `page.route()`. The FastAPI
backend (`../api`) is **not** required to be running.

## Why browser-side mocking?

This is a workshop project. The unit + integration tests in `../api` and
`../web` already cover logic and api↔web wiring (via MSW) thoroughly.
What E2E adds here is:

1. Confidence that the **production bundle** boots, routes, and renders.
2. Smoke coverage of the full happy path through a real browser.
3. A safety net for refactors of routing, layout, or build config.

Mocking at the `/api/*` boundary keeps E2E fast and reliable without losing
that value. If you ever need true api↔web contract verification, run the
integration suite or add a separate full-stack profile.

## Layout

```
e2e/
├── playwright.config.ts          # webServer (vite preview), chromium project
├── tests/
│   ├── happy-path.spec.ts        # search → select school → pick dates → see 중식
│   └── no-results.spec.ts        # empty search + empty meals
├── fixtures/
│   ├── neis-mocks.ts             # canned School/Meal payloads
│   └── types.ts                  # local copy of the API response shapes
└── support/
    ├── test-base.ts              # extended `test` with `mockApi` fixture
    └── pages/                    # Page Object Model (thin wrappers)
        ├── home.page.ts
        ├── date-range.page.ts
        └── meals.page.ts
```

## Running

```bash
# First-time setup
npm install
npx playwright install chromium    # downloads the browser binary

# Run all specs (builds the web app and serves vite preview automatically)
npm test

# Headed (watch the browser do its thing)
npm run test:headed

# UI mode for interactive debugging
npm run test:ui

# Open the last HTML report
npm run report
```

The `webServer` config builds `../web` and serves it via `vite preview` on
port 4173. If the port is already in use locally, the existing server is
reused (CI always starts fresh).

## Adding tests

Use the extended `test` from `support/test-base.ts`. It provides:

- `mockApi.schools(payload)` / `mockApi.meals(payload)` — installs route
  handlers for `**/api/schools*` and `**/api/meals*`.
- `home`, `dateRange`, `meals` — Page Object instances.

Keep the suite small and focused on user-facing flows. Logic-level cases
belong in the integration or unit suites of `../api` / `../web`.
