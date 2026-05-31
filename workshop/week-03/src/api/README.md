# 급식 정보 조회 — 백엔드 API

NEIS 오픈 API(학교기본정보 / 급식식단정보) 위의 FastAPI 프록시로, `../web` 의
React 프런트엔드에 데이터를 제공합니다. 급식은 항상 중식(lunch, `MMEAL_SC_CODE=2`)
으로 필터링됩니다.

> 전체 워크숍을 한 번에 실행/테스트하는 방법은 `../README.md`를 참고하세요.

## 사전 준비물

- Python 3.12+
- [`uv`](https://docs.astral.sh/uv/)
- NEIS API 키 (`../.env`에 `NEIS_API_KEY` 로 설정)

## 디렉터리 구조

```text
api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 앱 팩토리, CORS, lifespan, 라우터 등록
│   ├── config.py            # pydantic-settings (NEIS_API_KEY, CORS_ORIGINS 등)
│   ├── neis_client.py       # NEIS Open API용 얇은 httpx 비동기 클라이언트
│   ├── schemas.py           # 요청/응답 Pydantic 모델
│   └── routers/             # /api/* 라우트 핸들러
│       ├── __init__.py
│       ├── health.py        # GET /api/health
│       ├── schools.py       # GET /api/schools
│       └── meals.py         # GET /api/meals
├── tests/                   # pytest 스위트 (단위 + 통합)
├── Dockerfile               # 강화된 멀티스테이지 이미지 (uv builder + slim 런타임)
├── .dockerignore
├── pyproject.toml           # 프로젝트 메타데이터 및 의존성
├── uv.lock                  # 잠긴(lock) 의존성 트리
└── README.md                # 현재 문서
```

## 엔드포인트

| Method | Path                                                                          | 설명                                                       |
| ------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/health`                                                                 | Liveness 프로브.                                           |
| GET    | `/api/schools?name={partial}`                                                 | 부분 이름으로 학교 검색.                                   |
| GET    | `/api/meals?eduOfficeCode=&schoolCode=&from=YYYY-MM-DD&to=YYYY-MM-DD`         | 해당 기간의 중식 메뉴 조회 (최대 31일).                    |

## 실행

```bash
cd workshop/week-03/src/api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

OpenAPI 문서: <http://localhost:8000/docs>

## 테스트

테스트는 `tests/` 아래에 위치하며 **단위 테스트**(I/O 없는 순수 함수)와
**통합 테스트**(`TestClient`를 통한 FastAPI 앱, `respx`로 NEIS HTTP 경계 모킹)
로 나뉩니다. 어떤 테스트도 실제 NEIS 서비스에 접근하지 않습니다.

```text
tests/
├── conftest.py              # 픽스처: 설정 오버라이드, TestClient, respx 모의, 팩토리
├── unit/
│   ├── test_neis_client.py
│   ├── test_schemas.py
│   └── test_routers_meals_helpers.py
└── integration/
    ├── test_health.py
    ├── test_schools.py
    └── test_meals.py
```

실행:

```bash
uv sync --all-groups            # 개발 의존성 설치
uv run pytest                   # 전체 테스트
uv run pytest -m unit           # 단위 테스트만
uv run pytest -m integration    # 통합 테스트만
uv run pytest --cov=app         # 커버리지와 함께 실행
```

## 트러블슈팅

- **포트 8000 사용 중** — `--port`로 다른 포트를 지정하거나 기존 프로세스를
  종료하세요.
- **`NEIS_API_KEY` 누락 / 401** — `../.env`에 `NEIS_API_KEY=...`를 설정했는지
  확인하세요. 테스트는 NEIS 호출을 모킹하므로 키가 필요 없습니다.
- **CORS 차단** — 브라우저에서 직접 호출 시 `CORS_ORIGINS` 환경 변수가 웹
  오리진을 포함하는지 확인하세요. 운영 환경에서는 `../infra`가 자동으로
  채워줍니다.
