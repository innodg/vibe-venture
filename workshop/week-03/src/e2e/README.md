# E2E 테스트 (Playwright)

급식 정보 조회 웹 앱에 대한 엔드투엔드 테스트입니다. `../web` 의 **운영 Vite
번들**을 대상으로 실제 Chromium 브라우저에서 실행되며, `/api/*` 호출은
`page.route()`를 통해 브라우저 단에서 가로채집니다. FastAPI 백엔드(`../api`)는
실행 중일 **필요가 없습니다**.

> 전체 워크숍을 한 번에 실행/테스트하는 방법은 `../README.md`를 참고하세요.

## 사전 준비물

- Node.js 22+ (24 LTS 권장)
- npm 10+
- Playwright Chromium 바이너리 (`npx playwright install chromium` — 1회성)

## 디렉터리 구조

```text
e2e/
├── playwright.config.ts          # webServer (vite preview), chromium 프로젝트
├── tests/
│   ├── happy-path.spec.ts        # 검색 → 학교 선택 → 날짜 선택 → 중식 확인
│   └── no-results.spec.ts        # 빈 검색 결과 + 빈 메뉴 결과
├── fixtures/
│   ├── neis-mocks.ts             # 사전 정의된 School/Meal 페이로드
│   └── types.ts                  # API 응답 형식의 로컬 사본
├── support/
│   ├── test-base.ts              # `mockApi` 픽스처를 추가한 확장 `test`
│   └── pages/                    # Page Object Model (얇은 래퍼)
│       ├── home.page.ts
│       ├── date-range.page.ts
│       └── meals.page.ts
├── package.json
├── tsconfig.json
└── README.md                     # 현재 문서
```

## 실행

```bash
cd workshop/week-03/src/e2e
npm install
npx playwright install chromium    # 1회성, 브라우저 바이너리 다운로드
npm test                           # ../web 빌드 (pretest) 후 Playwright 실행
```

- 리포트: `npm run report` 로 최신 HTML 리포트 열기
- Headed 모드: `npm run test:headed` (브라우저 동작을 직접 보면서 실행)
- UI 모드: `npm run test:ui` (인터랙티브 디버깅)

`webServer` 설정은 `../web`을 빌드하고 포트 4173에서 `vite preview`로 서빙합니다.
로컬에서 해당 포트가 이미 사용 중인 경우 기존 서버를 재사용합니다 (CI는 항상
새로 시작).

## 테스트

### 왜 브라우저 측 모킹인가?

이 프로젝트는 워크숍용입니다. `../api`와 `../web`의 단위 + 통합 테스트는 이미
로직과 api↔web 연결(MSW를 통한)을 충분히 다루고 있습니다. E2E가 여기에 더하는
가치는 다음과 같습니다:

1. **운영 번들**이 부팅되고 라우팅되며 렌더링되는지에 대한 확신.
2. 실제 브라우저를 통한 전체 해피 패스에 대한 스모크 커버리지.
3. 라우팅, 레이아웃, 빌드 설정 리팩터링에 대한 안전망.

`/api/*` 경계에서 모킹함으로써 그 가치를 잃지 않으면서 E2E를 빠르고 안정적으로
유지합니다. 실제 api↔web 계약 검증이 필요하다면 통합 스위트를 실행하거나 별도의
풀스택 프로파일을 추가하세요.

### 테스트 추가하기

`support/test-base.ts`의 확장 `test`를 사용하세요. 다음을 제공합니다:

- `mockApi.schools(payload)` / `mockApi.meals(payload)` — `**/api/schools*`
  와 `**/api/meals*`에 대한 라우트 핸들러를 설치합니다.
- `home`, `dateRange`, `meals` — Page Object 인스턴스.

스위트는 작게 유지하고 사용자에게 보이는 흐름에 집중하세요. 로직 수준의 케이스는
`../api` / `../web`의 통합 또는 단위 스위트에 두어야 합니다.

## 트러블슈팅

- **`webServer` 타임아웃** — Playwright는 `127.0.0.1:4173`을 프로빙합니다.
  `../web/vite.config.ts`의 `preview.host`가 `127.0.0.1`인지, 포트가 비어
  있는지 확인하세요.
- **Chromium 미설치 에러** — `npx playwright install chromium`을 1회 실행해야
  합니다. CI에서는 캐시를 확인하세요.
- **포트 4173 사용 중** — 이전 `vite preview` 또는 다른 e2e 실행을 종료한 뒤
  다시 시도하세요. Playwright는 비어 있을 때만 새로 띄웁니다.
