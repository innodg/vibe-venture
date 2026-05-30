# PRD — 급식 정보 조회 웹 앱

> Workshop Week 03 결과물. [NEIS 오픈 API(`src/openapi.json`)](./src/openapi.json)를 활용해 학교 중식(점심) 식단을 조회하는 단순한 웹 애플리케이션의 제품 요구사항 문서.

---

## 1. 개요 (Overview)

학생/학부모/교직원 등 누구나 학교 이름의 일부만으로 학교를 검색하고, 선택한 학교의 **중식(점심)** 식단을 원하는 날짜 범위에서 한눈에 확인할 수 있도록 한다.

본 앱은 **NEIS 교육정보 개방 포털**의 두 가지 오픈 API를 사용한다.

- 학교기본정보 (`/schoolInfo`)
- 급식식단정보 (`/mealServiceDietInfo`)

NEIS API 키(`NEIS_API_KEY`)는 보안을 위해 **백엔드에만 보관**하고, 프론트엔드는 백엔드 프록시를 통해서만 NEIS 데이터에 접근한다.

---

## 2. 목적 및 목표 (Goals)

| # | Goal |
| - | ---- |
| G1 | 학교명 부분 일치 검색으로 원하는 학교를 빠르게 찾을 수 있다. |
| G2 | 검색 결과에서 학교를 선택해 시도교육청 정보까지 함께 확인할 수 있다. |
| G3 | 시작일·종료일을 달력으로 선택해 중식 식단을 조회할 수 있다 (최대 31일). |
| G4 | 날짜별 중식 정보(메뉴/원산지/영양정보/칼로리/급식인원수)를 카드 형태로 한눈에 본다. |
| G5 | NEIS API 키를 프론트엔드에 노출하지 않는다. |

### Non-goals (이번 범위에서 제외)

- 사용자 인증/계정 시스템
- 즐겨찾기/구독/푸시 알림
- 조식·석식 조회 (중식만 다룸)
- 자동화된 테스트 (단위/통합/E2E)
- 컨테이너화 및 배포 자동화 (Workshop Week 03 후속 작업으로 분리)
- 학교 검색 결과의 다중 페이지네이션 (단일 페이지 최대 100건만 노출)
- 모바일 네이티브 앱

---

## 3. 사용자 (Personas)

| Persona | Needs |
| ------- | ----- |
| **학부모** | 자녀가 다니는 학교의 이번 주 점심 메뉴와 원산지가 궁금하다. |
| **학생** | 내일 점심 메뉴를 빨리 확인하고 싶다. |
| **영양/교직원** | 특정 기간의 식단을 손쉽게 훑어보고 싶다. |

---

## 4. 핵심 사용자 흐름 (User Flow)

```
[Landing]                       [Date Range]                  [Meals Result]
학교명 부분 검색 → 결과 리스트  →  학교 선택 후 시작일·종료일 →  날짜별 중식 카드
                                  (달력, 최대 1개월)           (메뉴/원산지/영양/칼로리/인원)
```

### 4.1 랜딩 페이지 (`/`)

1. 사용자가 학교 이름의 일부를 입력한다 (예: "서울고").
2. 입력값은 **300ms debounce** 후 백엔드 `/api/schools?name=` 로 전송된다.
3. 결과 카드 목록이 표시된다. 각 카드에는:
   - 학교명 (`SCHUL_NM`)
   - 시도교육청명 (`ATPT_OFCDC_SC_NM`) · 시도명 (`LCTN_SC_NM`)
4. 카드 클릭(또는 Enter/Space) → 날짜 범위 페이지로 이동. URL 쿼리에 학교 메타 정보를 함께 실어 보낸다.

### 4.2 날짜 범위 페이지 (`/school/:schoolCode?...`)

1. 상단에 선택된 학교명·교육청명을 보여준다.
2. **두 달치 달력**(`react-day-picker`, `mode="range"`)에서 시작일·종료일을 선택한다.
3. 기본 선택값: 오늘 ~ 7일 후.
4. **최대 31일** 제한. 초과 시 안내 문구 표시 + 조회 버튼 비활성화.
5. "급식 정보 조회" 버튼 클릭 → 결과 페이지로 이동.

### 4.3 결과 페이지 (`/school/:schoolCode/meals?...`)

1. 선택된 학교·기간을 상단에 표시.
2. 날짜 범위 내 **모든 날짜**에 대해 카드 한 개씩 렌더링(달이 비어있는 날짜는 "급식 정보 없음" 카드).
3. 카드는 다음 정보를 **모두 불릿포인트**로 표시한다 (원본 NEIS 응답이 `<br/>` 로 구분된 다중 항목인 경우 각 항목을 별도 불릿으로 분리).
   - **메뉴** (`DDISH_NM`)
   - **원산지** (`ORPLC_INFO`)
   - **영양정보** (`NTR_INFO`)
   - **기타**: 칼로리(`CAL_INFO`), 급식인원수(`MLSV_FGR`)

---

## 5. 기능 요구사항 (Functional Requirements)

### 5.1 학교 검색

- **FR-S1** 입력 1자 이상이면 검색을 수행한다.
- **FR-S2** 검색은 NEIS `SCHUL_NM` 파라미터에 그대로 전달되며 부분 일치 동작을 따른다.
- **FR-S3** 응답은 백엔드에서 다음 필드만 추려 반환한다: `schoolCode, eduOfficeCode, schoolName, eduOfficeName, lctnScNm`.
- **FR-S4** NEIS 가 `INFO-200`(데이터 없음)을 반환하면 빈 배열로 응답한다.

### 5.2 식단 조회

- **FR-M1** `MMEAL_SC_CODE=2` 를 항상 고정하여 **중식만** 조회한다.
- **FR-M2** `from` / `to` 는 `YYYY-MM-DD` 형식으로 받고, 백엔드에서 `MLSV_FROM_YMD`/`MLSV_TO_YMD`(YYYYMMDD)로 변환한다.
- **FR-M3** `to >= from` 이어야 하며, 범위는 최대 31일이다. 위반 시 HTTP 400 반환.
- **FR-M4** 결과는 날짜 오름차순 정렬.
- **FR-M5** `DDISH_NM`/`ORPLC_INFO`/`NTR_INFO` 의 `<br/>` 구분자는 백엔드에서 배열로 분해한다.
- **FR-M6** 데이터 없는 날짜는 결과에 포함되지 않으며, 프론트에서 "급식 정보 없음" 카드로 처리한다.

### 5.3 운영

- **FR-O1** `/api/health` 로 liveness 확인이 가능해야 한다.
- **FR-O2** NEIS 에러(`INFO-000`/`INFO-200` 외)는 HTTP 502 와 `{ code, message }` 본문으로 매핑된다.

---

## 6. 비기능 요구사항 (Non-Functional Requirements)

| 영역 | 요구사항 |
| --- | --- |
| **보안** | `NEIS_API_KEY` 는 서버 전용(`workshop/week-03/src/.env`). 프론트 번들에 포함 금지. |
| **CORS** | 백엔드는 개발용으로 `http://localhost:5173`, `http://127.0.0.1:5173` 만 허용. |
| **성능** | 검색 입력 300ms debounce. 식단 단일 호출(31일 × 1식 ≤ 1000 NEIS 한도). |
| **국제화** | 한국어 UI 고정. 폰트 스택에 `Apple SD Gothic Neo`, `Noto Sans KR` 포함. |
| **접근성** | 결과 카드는 `role="button"` + Enter/Space 키 활성화 지원. |
| **응답시간** | NEIS API 호출 타임아웃 15s (httpx). |

---

## 7. 기술 스택 (Tech Stack)

### 7.1 Backend (`workshop/week-03/src/api`)

| 구분 | 선정 |
| --- | --- |
| 언어 | Python 3.12+ |
| 패키지/가상환경 | **uv** (`pyproject.toml`, `uv.lock`) |
| 웹 프레임워크 | **FastAPI** |
| ASGI 서버 | **Uvicorn** (`--reload`) |
| HTTP 클라이언트 | **httpx** (async) |
| 설정 로딩 | **pydantic-settings**, `python-dotenv` |
| 응답 검증 | **Pydantic v2** |

#### 디렉터리 구조

```
workshop/week-03/src/api/
├── pyproject.toml
├── uv.lock
├── README.md
└── app/
    ├── __init__.py
    ├── main.py          # FastAPI 인스턴스, CORS, 라우터 등록, lifespan
    ├── config.py        # NEIS_API_KEY 등 Settings
    ├── neis_client.py   # NEIS httpx async 래퍼 + RESULT.CODE 처리
    ├── schemas.py       # Pydantic 응답 모델 (School, Meal)
    └── routers/
        ├── health.py    # GET /api/health
        ├── schools.py   # GET /api/schools?name=
        └── meals.py     # GET /api/meals?eduOfficeCode&schoolCode&from&to
```

#### API 엔드포인트 (백엔드)

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/health` | Liveness probe |
| GET | `/api/schools?name={partial}` | 학교명 부분 검색 |
| GET | `/api/meals?eduOfficeCode=&schoolCode=&from=YYYY-MM-DD&to=YYYY-MM-DD` | 중식 식단 조회 |

### 7.2 Frontend (`workshop/week-03/src/web`)

| 구분 | 선정 |
| --- | --- |
| 빌드 도구 | **Vite 7** |
| 프레임워크 | **React 19** + **TypeScript** |
| 라우팅 | **react-router-dom v7** |
| 데이터 페칭 | **@tanstack/react-query v5** |
| 스타일 | **Tailwind CSS v4** (`@tailwindcss/vite`) + `tw-animate-css` |
| UI 컴포넌트 | **shadcn 스타일** 수기 작성 (Button, Input, Card, Calendar) |
| 날짜 위젯 | **react-day-picker v10** (Calendar 래퍼) |
| 날짜 유틸 | **date-fns v4** |
| 클래스 합성 | `clsx` + `tailwind-merge` (`cn` 헬퍼) |
| 아이콘 | `lucide-react` (필요 시) |

#### 디렉터리 구조

```
workshop/week-03/src/web/
├── package.json
├── vite.config.ts        # @tailwindcss/vite, alias '@', proxy /api → :8000
├── tsconfig*.json        # paths: { "@/*": ["./src/*"] }
├── README.md
└── src/
    ├── main.tsx          # QueryClientProvider + BrowserRouter
    ├── App.tsx           # Routes
    ├── index.css         # @import "tailwindcss" + 테마 토큰
    ├── types.ts          # School, Meal
    ├── lib/
    │   ├── api.ts        # fetch 래퍼 (searchSchools, getMeals)
    │   └── utils.ts      # cn()
    ├── components/ui/    # button, input, card, calendar
    └── pages/
        ├── LandingPage.tsx
        ├── DateRangePage.tsx
        └── MealsResultPage.tsx
```

#### 클라이언트 라우트

| Path | Page |
| ---- | ---- |
| `/` | LandingPage (학교 검색) |
| `/school/:schoolCode` | DateRangePage (날짜 범위 선택) |
| `/school/:schoolCode/meals` | MealsResultPage (날짜별 중식 카드) |

#### Vite Dev 프록시

```ts
server: {
  port: 5173,
  proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }
}
```

---

## 8. 데이터 모델 (Internal Schemas)

```ts
// 프론트와 백엔드가 공유하는 응답 형태

interface School {
  schoolCode: string;        // NEIS SD_SCHUL_CODE
  eduOfficeCode: string;     // NEIS ATPT_OFCDC_SC_CODE
  schoolName: string;        // NEIS SCHUL_NM
  eduOfficeName: string;     // NEIS ATPT_OFCDC_SC_NM
  lctnScNm: string | null;   // NEIS LCTN_SC_NM
}

interface Meal {
  date: string;              // YYYY-MM-DD
  dishes: string[];          // NEIS DDISH_NM (<br/> split)
  calorie: string | null;    // NEIS CAL_INFO (예: "1107.8 Kcal")
  origin: string[];          // NEIS ORPLC_INFO (<br/> split)
  nutrition: string[];       // NEIS NTR_INFO (<br/> split)
  servings: number | null;   // NEIS MLSV_FGR
}
```

---

## 9. 설계 결정 및 트레이드오프 (Decisions & Trade-offs)

### 9.1 백엔드 프록시 패턴

NEIS API 를 프론트에서 직접 호출하지 않고 백엔드 프록시를 둔다.

- **이유**: `NEIS_API_KEY` 노출 방지, 응답 정규화(`<br/>` 분해, INFO/ERROR 매핑), 향후 캐싱/리트라이 추가 용이.
- **트레이드오프**: 호출 한 번에 두 hop 발생. 단, NEIS 자체 응답이 빠르며 단순 패스스루라서 영향은 미미.

### 9.2 중식 고정 (`MMEAL_SC_CODE=2`)

요구사항이 "중식만"이므로 백엔드에서 코드를 고정한다. 프론트는 식사 종류를 선택할 수 없다.

- **확장 가능성**: 추후 조식/석식 토글 추가 시 백엔드 쿼리 파라미터로 노출하면 됨.

### 9.3 최대 31일 제한

- NEIS 자체 한도(`pSize=1000`)는 매우 넉넉하나, UX 와 응답 페이로드 안정성을 위해 1개월로 제한.
- 백엔드와 프론트 양쪽에서 검증 (Defense in depth).

### 9.4 shadcn CLI 미사용, 컴포넌트 수기 작성

- 워크샵 환경에서 shadcn CLI 초기화가 인터랙티브 프롬프트로 멈추는 이슈를 회피.
- 실제로 사용하는 컴포넌트가 4종(Button, Input, Card, Calendar)으로 적어 수기 작성이 더 단순.
- Tailwind v4 의 `@theme inline` 블록으로 shadcn 스타일 CSS 변수 토큰을 동일하게 유지.

### 9.5 react-router-dom v7 + react-query v5

- 모두 React 19 호환 최신 메이저.
- 검색·식단 데이터는 react-query 캐시 키(`["schools", query]`, `["meals", ...]`)로 자동 캐싱.

### 9.6 학교 검색 페이지네이션 미지원

- NEIS 의 단일 응답(최대 100건) 만 사용.
- 결과가 너무 많을 경우 더 구체적인 검색어를 권장. 추후 페이지네이션이 필요하면 백엔드 `?page=` 파라미터 추가.

---

## 10. 환경 변수 (Environment)

`workshop/week-03/src/.env`

```env
NEIS_API_KEY=발급받은_NEIS_인증키
```

- 미발급 시 `sample` 키로 동작 가능하나 페이지/건수가 제한되어 검색 결과가 빈약함.
- `.env` 는 리포지토리 루트 `.gitignore` 의 `*.env` 패턴으로 커밋되지 않는다.

---

## 11. 실행 방법 (Run)

두 개의 터미널에서:

```bash
# 백엔드 (http://localhost:8000, /docs 에 OpenAPI UI)
cd workshop/week-03/src/api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

```bash
# 프론트엔드 (http://localhost:5173)
cd workshop/week-03/src/web
npm install
npm run dev
```

브라우저에서 <http://localhost:5173> 접속.

---

## 12. 검증 (Acceptance Criteria)

- [x] 학교명 부분 검색 시 결과 카드(학교명 + 교육청)가 표시된다.
- [x] 학교 카드를 클릭하면 날짜 범위 페이지로 이동한다.
- [x] 달력에서 1개월 이내 범위를 선택할 수 있고, 초과 시 조회 버튼이 비활성화된다.
- [x] 결과 페이지에서 각 날짜 카드에 메뉴/원산지/영양정보/칼로리/급식인원수가 **모두 불릿**으로 표시된다.
- [x] 데이터 없는 날짜는 "급식 정보 없음" 카드로 표시된다.
- [x] `NEIS_API_KEY` 가 프론트엔드 번들에 포함되지 않는다 (백엔드 환경변수만으로 동작).
- [x] `npm run build` 가 타입 오류 없이 성공한다.
- [x] 실제 NEIS API 키로 서울고등학교 5월 식단을 정상 조회한다 (수동 검증 완료).

---

## 13. 향후 작업 (Out of Scope / Follow-ups)

- Workshop Week 03 후속: 컨테이너화(Dockerfile) 및 배포 자동화
- 조식/석식 토글 추가
- 검색 결과 페이지네이션 / 무한 스크롤
- 즐겨찾기 학교 (localStorage)
- 단위/통합/E2E 테스트 추가 (pytest, Vitest, Playwright)
- 에러/빈 상태에 대한 더 풍부한 UI (Skeleton, Toast 등)

---

## 14. 작업 진행 기록 (Discussion & Decisions Log)

본 PRD 는 다음 사전 논의를 거쳐 작성되었다.

### 14.1 사용자와의 사전 합의

| # | 질문 | 결정 |
| - | --- | --- |
| 1 | 중식 결과 카드에 어떤 필드를 표시할까? | **메뉴/원산지/영양정보/칼로리/급식인원수 전부**를 불릿포인트로 표시 |
| 2 | 프론트엔드 스타일링은? | **shadcn/ui** (실제 구현은 shadcn 스타일 컴포넌트를 수기 작성, §9.4 참고) |
| 3 | 날짜 범위 최대 허용 기간은? | **1개월 (31일)** |
| 4 | 백엔드 언어/패키지 매니저? | 사용자 지정: **Python + uv** (FastAPI 채택) |
| 5 | 프론트엔드 프레임워크? | 사용자 지정: **React + Vite** (TypeScript 추가 채택) |
| 6 | 디렉터리? | 사용자 지정: 백엔드 `src/api`, 프론트 `src/web` → 이후 `workshop/week-03/src/{api,web}` 로 이동 |
| 7 | 식사 종류? | 사용자 지정: **중식만** (`MMEAL_SC_CODE=2` 고정) |

### 14.2 구현 단계 (15개 todo, 모두 완료)

1. `bootstrap-api` — `uv init` + FastAPI/httpx/python-dotenv/pydantic 설치
2. `api-config` — `.env` 로딩 + Settings 모듈
3. `api-neis-client` — NEIS httpx 비동기 래퍼
4. `api-schools-route` — `GET /api/schools`
5. `api-meals-route` — `GET /api/meals` (중식 고정, 31일 제한)
6. `api-cors-health` — CORS 미들웨어 + `/api/health` + 에러 매핑
7. `api-manual-verify` — cURL 로 서울고등학교 식단 조회 검증
8. `bootstrap-web` — Vite + React + TS 스캐폴딩
9. `web-tailwind-shadcn` — Tailwind v4 + shadcn 스타일 컴포넌트
10. `web-routing-query` — react-router-dom, react-query, Vite proxy
11. `web-landing` — 검색 페이지 (300ms debounce)
12. `web-date-range` — 1개월 한도 range date picker
13. `web-meals-result` — 날짜별 중식 카드 (불릿)
14. `web-manual-verify` — 전체 흐름 수동 검증
15. `docs` — 루트 `README.md` 업데이트

### 14.3 구현 중 마주친 이슈와 해결

- **npm create vite 인터랙티브 프롬프트** → `yes "" | npm create vite@7 -- web --template react-ts` 로 우회.
- **shadcn CLI init 행 잠김** → 컴포넌트 수기 작성 (§9.4).
- **lucide-react 버전 혼동** → 공식 `latest` 가 `1.17.0` 임을 확인하고 그대로 사용.
- **NEIS 응답 두 가지 형태** (정상 / `RESULT` 만 있는 에러) → `_extract_result()` 가 두 케이스 모두 처리.
