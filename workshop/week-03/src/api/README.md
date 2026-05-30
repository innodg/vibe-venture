# 급식 정보 조회 — Backend API

FastAPI proxy over NEIS 오픈 API (학교기본정보 / 급식식단정보), serving the React
frontend in `../web`. Always filters meals to 중식 (lunch, `MMEAL_SC_CODE=2`).

## Requirements

- Python 3.12+
- [`uv`](https://docs.astral.sh/uv/)
- A NEIS API key (set as `NEIS_API_KEY` in `../.env`)

## Endpoints

| Method | Path                                                                          | Description                                              |
| ------ | ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| GET    | `/api/health`                                                                 | Liveness probe.                                          |
| GET    | `/api/schools?name={partial}`                                                 | Search schools by partial name.                          |
| GET    | `/api/meals?eduOfficeCode=&schoolCode=&from=YYYY-MM-DD&to=YYYY-MM-DD`         | Lunch meals for the date range (≤ 31 days).              |

## Run

```bash
cd workshop/week-03/src/api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

OpenAPI docs: <http://localhost:8000/docs>

## Tests

Tests live in `tests/` and are split between **unit** (pure functions, no I/O)
and **integration** (FastAPI app via `TestClient` with NEIS HTTP boundary mocked
by `respx`). No test ever hits the real NEIS service.

```text
tests/
├── conftest.py              # fixtures: settings override, TestClient, respx mock, factories
├── unit/
│   ├── test_neis_client.py
│   ├── test_schemas.py
│   └── test_routers_meals_helpers.py
└── integration/
    ├── test_health.py
    ├── test_schools.py
    └── test_meals.py
```

Run:

```bash
uv sync --all-groups            # installs dev deps
uv run pytest                   # all tests
uv run pytest -m unit           # unit only
uv run pytest -m integration    # integration only
uv run pytest --cov=app         # with coverage
```

