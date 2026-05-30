# 급식 정보 조회 — Apps

Full-stack 급식 (school lunch) lookup app for the week-03 workshop.

```
src/
├── api/         FastAPI backend (Python 3.12+ / uv)
├── web/         React + Vite + TypeScript frontend (served by nginx in prod)
├── e2e/         Playwright end-to-end tests
├── infra/       Bicep used by `azd up` (Container Apps + ACR + LAW + App Insights)
├── azure.yaml   azd service map (api + web → Azure Container Apps)
├── compose.yaml Docker Compose: orchestrates the two containerised apps
├── .env.example Template env file (NEIS_API_KEY, optional WEB_PORT)
└── openapi.json NEIS Open API spec the backend was built against
```

The frontend talks to the backend via `/api/*`. In `npm run dev` mode that's
proxied to `http://localhost:8000`; in production builds the frontend assumes
the backend is reachable at the same origin under `/api`.

For deeper details on each app, see its own `README.md`. This document is the
**single starting point** for running and testing everything.

## 1. Prerequisites

| Tool | Version | Used by |
| --- | --- | --- |
| Python | 3.12+ | `api` (native dev) |
| [`uv`](https://docs.astral.sh/uv/) | latest | `api` (native dev) |
| Node.js | 22+ (24 LTS recommended) | `web`, `e2e` (native dev) |
| npm | 10+ | `web`, `e2e` |
| Docker | 24+ with Compose plugin | container/compose flow (optional) |
| A NEIS API key | — | `api` runtime (real data) |

For native dev, the NEIS key goes in `workshop/week-03/src/.env` as
`NEIS_API_KEY=...` (the api auto-loads it via pydantic-settings, and Docker
Compose / azd read the same variable). The test suites do **not** need it —
they mock NEIS / `/api/*` at the appropriate boundary.

## 2. Run the apps locally

You have two options: run the apps directly with `uv` and `npm` (best for
fast inner-loop dev), or run the production-style containers with Docker
Compose (best for a smoke test of what actually ships).

### 2.1 Native (uv + npm)

You'll want two terminals: one for the API and one for the web app.

#### Backend (terminal 1)

```bash
cd workshop/week-03/src/api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

- App: <http://localhost:8000>
- OpenAPI docs: <http://localhost:8000/docs>

#### Frontend (terminal 2)

```bash
cd workshop/week-03/src/web
npm install
npm run dev
```

- App: <http://localhost:5173> (Vite dev server, with `/api` proxied to `:8000`)

#### Production-style frontend build

```bash
cd workshop/week-03/src/web
npm run build
npm run preview          # serves the built bundle at http://localhost:4173
```

### 2.2 Docker Compose (production-style, both apps together)

`workshop/week-03/src/compose.yaml` builds and orchestrates the two
hardened images (FastAPI + uv on the backend, Vite build served by
unprivileged nginx on the frontend). The web container is the only
public entrypoint and reverse-proxies `/api/*` to the backend over a
private network.

Prerequisites: Docker 24+ with the Compose plugin (`docker compose ...`).

```bash
cd workshop/week-03/src
cp .env.example .env             # then edit and set NEIS_API_KEY
docker compose up -d --build     # build images + start both services
```

- App: <http://localhost:8080> (set `WEB_PORT` in `.env` to use a different host port)
- API (proxied through web): <http://localhost:8080/api/health>
- The `api` service is **not** published on the host — it's only reachable from inside the compose network as `http://api:8000`.

Useful commands:

```bash
docker compose ps                # see service health
docker compose logs -f web api   # tail logs
docker compose down              # stop and remove containers
docker compose down -v           # also drop the network
```

Hardening that ships in `compose.yaml`:

- Both services run as non-root with `cap_drop: ALL`,
  `no-new-privileges`, and a read-only root filesystem; writable paths
  (`/tmp`, nginx's runtime dirs, the envsubst output dir) are explicit
  tmpfs mounts only.
- The `web` service waits for `api` to report `healthy` before starting.
- `NEIS_API_KEY` is required — Compose fails fast with a clear error if
  it's not set.

### 2.3 Azure Container Apps via `azd up`

Provisions and deploys both apps to Azure Container Apps using the Bicep
under `infra/` and the existing Dockerfiles. The frontend (`web`) is the
only public ingress; the backend (`api`) is internal-only and reachable
only from `web` via the env's private DNS.

What gets provisioned:

- Resource group (`rg-<env-name>`)
- Log Analytics + Application Insights
- User-Assigned Managed Identity (used by both apps to pull from ACR)
- Azure Container Registry (admin disabled, `AcrPull` granted to the UAMI)
- Azure Container Apps Environment (Consumption, logs to Log Analytics)
- `api` Container App — **internal** ingress, port 8000, NEIS_API_KEY as a secret
- `web` Container App — **external** ingress, port 8080, `API_UPSTREAM` wired to `https://<api-internal-fqdn>`

Prerequisites: [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli), [Azure Developer CLI (`azd`)](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd), Docker.

```bash
cd workshop/week-03/src

# One-time per environment
azd auth login
azd env new dev                   # any name; controls the resource group suffix
azd env set NEIS_API_KEY <key>    # required; stored as a Container App secret

# Provision + build + push + deploy
azd up
```

`azd up` will pick a region (or you can set `AZURE_LOCATION`), provision
infra, build the two Docker images locally, push them to the provisioned
ACR, and update the Container Apps to use the new images. The web URL is
printed at the end of the run as `SERVICE_WEB_URI`.

Useful follow-ups:

```bash
azd deploy            # rebuild + push + redeploy after code changes (no infra)
azd provision         # bicep-only (no image push)
azd show              # show endpoints and resource references
azd monitor --live    # live App Insights logs
azd down --purge      # delete everything provisioned
```

Notes:

- The `azd-service-name` tag on each Container App (`api`, `web`) is what
  azd uses to find which app to update. Keep service names in
  `azure.yaml` and the Bicep tags in sync.
- Cross-app wiring is computed deterministically in `infra/resources.bicep`
  (no circular reference between the two Container Apps): `web` knows
  `api`'s internal FQDN, and `api`'s `CORS_ORIGINS` is pre-populated with
  `web`'s public URL.
- Web → API in production goes nginx → `https://<api>.internal.<env-domain>`
  (HTTPS, terminated at the env's edge). The nginx config sets
  `proxy_set_header Host $proxy_host` and `proxy_ssl_server_name on` so
  the upstream's host-header routing and TLS SNI both work.

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
├── azure.yaml           azd service map (api + web → containerapp)
├── compose.yaml         Docker Compose: orchestrates api + web
├── .env.example         Template env (NEIS_API_KEY, WEB_PORT)
├── openapi.json         NEIS Open API spec used to build the backend
├── infra/               Bicep used by `azd up`
│   ├── main.bicep            subscription scope: RG + module call
│   ├── main.parameters.json  pulls AZURE_ENV_NAME / NEIS_API_KEY etc. from azd env
│   └── resources.bicep       RG scope: LAW, App Insights, UAMI, ACR, ACA env, api+web
├── api/
│   ├── app/             FastAPI app
│   │   ├── routers/         /api/* route handlers (health, schools, meals)
│   │   ├── main.py          app factory, CORS, lifespan
│   │   ├── config.py        pydantic-settings (NEIS_API_KEY, CORS_ORIGINS, ...)
│   │   ├── neis_client.py   thin httpx client over the NEIS Open API
│   │   └── schemas.py       request/response models
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── conftest.py      shared fixtures (settings override, respx, factories)
│   ├── Dockerfile       Hardened multi-stage image (uv builder + slim runtime)
│   ├── .dockerignore
│   ├── pyproject.toml
│   ├── uv.lock
│   └── README.md
├── web/
│   ├── src/
│   │   ├── pages/       routed pages (Landing, DateRange, MealsResult)
│   │   ├── components/  UI components (shadcn-flavored)
│   │   ├── lib/         api client + utils (with colocated unit tests)
│   │   ├── assets/      static assets bundled by Vite
│   │   └── test/        MSW handlers, integration suites, test utilities
│   ├── public/          static files served as-is
│   ├── nginx/           nginx.conf + default.conf.template (prod runtime)
│   ├── Dockerfile       Multi-stage Node builder + nginx-unprivileged runtime
│   ├── .dockerignore
│   ├── index.html
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── package.json
│   └── README.md
└── e2e/
    ├── tests/           happy-path + no-results specs
    ├── support/
    │   └── pages/       Playwright Page Object Models
    ├── fixtures/        canned NEIS-shaped payloads
    ├── playwright.config.ts
    ├── package.json
    └── README.md
```

## 5. Troubleshooting

- **Port already in use** — `8000` (api), `5173` (web dev), `4173` (web preview / e2e),
  `8080` (compose web). Change with `--port`, set `WEB_PORT=...` in `.env` for compose, or stop the previous process.
- **E2E `webServer` timeout** — Playwright probes `127.0.0.1:4173`. The
  config explicitly binds Vite preview to `127.0.0.1` to match. If you change
  the host, update both ends.
- **NEIS key missing in dev** — only the `api` runtime needs it. Tests don't.
- **Compose: `NEIS_API_KEY is required`** — copy `.env.example` to `.env` and set the key, or export it in your shell before `docker compose up`.
