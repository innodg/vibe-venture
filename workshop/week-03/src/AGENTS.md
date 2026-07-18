# AGENTS.md

이 문서는 AI 코딩 에이전트가 `workshop/week-03/src` 코드베이스에서 작업할 때
따라야 할 규칙·명령어·주의사항을 정리한 가이드입니다. 사람용 상세 문서는 각
패키지의 `README.md`를 참고하고, 이 문서는 **에이전트 전용 규칙**에 집중합니다.

## 1. 프로젝트 개요

NEIS 오픈 API(학교기본정보 / 급식식단정보) 위에 구축한 풀스택 급식 조회 앱.

- 급식은 항상 **중식(lunch, `MMEAL_SC_CODE=2`)** 으로 필터링합니다.
- 프런트엔드 ↔ 백엔드는 `/api/*` 경로로 통신합니다.
  - 개발: Vite dev 서버가 `/api`를 `http://localhost:8000`으로 프록시.
  - 운영: 프런트엔드와 백엔드가 같은 오리진의 `/api` 아래에서 동작.

## 2. 디렉터리 구조

```text
src/
├── api/          FastAPI 백엔드 (Python 3.12+ / uv)
├── web/          React 19 + Vite + TypeScript + Tailwind v4 프런트엔드
├── e2e/          Playwright 엔드투엔드 테스트 (Chromium)
├── infra/        Bicep (Container Apps + ACR + LAW + App Insights)
├── azure.yaml    azd 서비스 매핑 (api + web → Azure Container Apps)
├── compose.yaml  Docker Compose: 두 컨테이너 앱 오케스트레이션
├── .env.example  환경 변수 템플릿 (NEIS_API_KEY, 선택: WEB_PORT)
└── openapi.json  백엔드 구현 기준이 된 NEIS Open API 스펙
```

### 백엔드 내부 구조 (`api/app/`)

- `main.py` — FastAPI 앱 팩토리, CORS, lifespan, 라우터 등록
- `config.py` — `pydantic-settings` 기반 설정(`NEIS_API_KEY`, `CORS_ORIGINS` 등)
- `neis_client.py` — NEIS Open API용 얇은 `httpx` 비동기 클라이언트
- `schemas.py` — 요청/응답 Pydantic 모델
- `routers/` — `/api/*` 라우트 핸들러 (`health.py`, `schools.py`, `meals.py`)

### 프런트엔드 내부 구조 (`web/src/`)

- `pages/` — 라우팅되는 페이지(`LandingPage`, `DateRangePage`, `MealsResultPage`)
- `components/ui/` — shadcn 스타일 UI 컴포넌트
- `lib/api.ts` — `/api/*` 호출 래퍼
- `test/` — 테스트 인프라(MSW 핸들러, `renderWithProviders` 헬퍼, 통합 스위트)

## 3. 사전 준비물

| 도구 | 버전 | 사용 위치 |
| --- | --- | --- |
| Python | 3.12+ | `api` |
| `uv` | latest | `api` |
| Node.js | 22+ (24 LTS 권장) | `web`, `e2e` |
| npm | 10+ | `web`, `e2e` |
| Docker | 24+ (Compose 플러그인) | Compose / azd (선택) |
| NEIS API 키 | — | `api` 런타임 (실데이터 호출용) |

- NEIS 키는 `workshop/week-03/src/.env`에 `NEIS_API_KEY=...` 형태로 둡니다.
- **테스트는 NEIS 키가 필요 없습니다** — NEIS / `/api/*`를 경계에서 모킹합니다.

## 4. 명령어 (작업 디렉터리 기준)

### 백엔드 (`api/`)

```bash
uv sync                         # 런타임 의존성 설치
uv sync --all-groups            # 개발 의존성(pytest, respx, pytest-cov)까지 설치
uv run uvicorn app.main:app --reload --port 8000   # 개발 서버
uv run pytest                   # 전체 테스트
uv run pytest -m unit           # 단위 테스트만
uv run pytest -m integration    # 통합 테스트만
uv run pytest --cov=app         # 커버리지와 함께
```

### 프런트엔드 (`web/`)

```bash
npm install
npm run dev                     # Vite 개발 서버 (http://localhost:5173)
npm run build                   # tsc -b && vite build → dist/
npm run preview                 # 빌드 산출물 미리보기 (http://localhost:4173)
npm run lint                    # ESLint
npm test                        # Vitest 1회 실행
npm run test:watch              # Vitest watch
npm run test:coverage           # 커버리지 리포트
```

### E2E (`e2e/`)

```bash
npm install
npm test                        # playwright test (pretest에서 ../web 빌드 수행)
npm run test:headed             # 브라우저 표시
npm run test:ui                 # Playwright UI 모드
npm run report                  # 마지막 리포트 보기
```

### 풀스택 / 배포 (`src/`)

```bash
docker compose up -d --build    # 두 서비스 컨테이너 기동 (web만 외부 노출)
docker compose down             # 중지 및 제거

azd auth login
azd env new <name>
azd env set NEIS_API_KEY <key>  # 필수 (Container App 시크릿)
azd up                          # 프로비저닝 + 빌드 + 푸시 + 배포
azd deploy                      # 코드 변경 후 재배포 (인프라 변경 없음)
azd down --purge                # 모든 리소스 삭제
```

## 5. 코딩 규칙 및 패턴

- **백엔드**: 앱 팩토리 패턴(`main.py`), 설정은 `pydantic-settings`로만 주입,
  외부 호출은 `neis_client.py`의 `httpx` 비동기 클라이언트를 통해서만 수행.
  새 엔드포인트는 `routers/` 아래에 추가하고 `main.py`에 등록.
- **타입/스키마**: 요청·응답 모델은 `schemas.py`의 Pydantic 모델로 정의.
- **프런트엔드**: 모든 백엔드 호출은 `lib/api.ts` 래퍼를 거칩니다. 컴포넌트에서
  `fetch`를 직접 호출하지 마세요. 서버 상태는 `@tanstack/react-query`로 관리.
- **급식 조회 제약**: 날짜 범위는 **최대 31일**.

## 6. 테스트 원칙

| 계층 | 위치 | 도구 | 모킹 경계 |
| --- | --- | --- | --- |
| 단위/통합 (API) | `api/tests/` | pytest + respx | NEIS HTTP 경계 |
| 단위/통합 (Web) | `web/src/**/*.test.*`, `web/src/test/integration/` | Vitest + RTL + MSW | `/api/*` |
| 엔드투엔드 | `e2e/tests/` | Playwright | `/api/*` (`page.route`) |

- **어떤 테스트도 실제 NEIS 서비스에 접근하지 않습니다.** 항상 경계에서 모킹.
- 백엔드 마커: `unit`(순수 함수, I/O 없음), `integration`(`TestClient` + respx).
  `--strict-markers`가 켜져 있으므로 새 마커는 `pyproject.toml`에 먼저 등록.
- 프런트엔드: 프레젠테이션 컴포넌트(`Button` 등)와 한 줄짜리 유틸(`cn`)에는
  **의도적으로 단위 테스트를 두지 않습니다**. 실제 로직(state machine, 폼
  유효성 검사, 복잡한 키보드 핸들러 등)이 있을 때만 컴포넌트 단위 테스트를
  추가하세요. 불필요한 테스트를 양산하지 마세요.

## 7. 주의사항 / 가드레일

- **시크릿**: `.env`는 절대 커밋하지 않습니다. 키는 로컬 `.env` 또는
  `azd env set`으로만 주입합니다.
- **의존성**: 백엔드는 `uv add`로 추가해 `uv.lock`을 갱신, 프런트엔드는 `npm`으로
  추가해 `package-lock.json`을 갱신합니다. 락 파일을 수동 편집하지 마세요.
- **azd 서비스 동기화**: `azure.yaml`의 서비스 이름(`api`, `web`)과 Bicep의
  `azd-service-name` 태그를 항상 일치시키세요.
- **컨테이너 보안 강화 유지**: `compose.yaml`/Dockerfile은 non-root, `cap_drop: ALL`,
  `no-new-privileges`, read-only 루트 파일시스템을 사용합니다. 디버깅 편의를 위해
  이 설정을 약화시키지 마세요.
- **운영 nginx 프록시**: Web→API는 nginx에서 `proxy_set_header Host $proxy_host`와
  `proxy_ssl_server_name on`으로 HTTPS 업스트림에 연결됩니다. 이 설정을 변경할 때
  TLS SNI / 호스트 라우팅이 깨지지 않도록 주의하세요.
- **CORS**: 허용 오리진은 `config.py`의 `CORS_ORIGINS`로 제어합니다. 운영에서는
  `infra/`가 자동으로 채웁니다.
