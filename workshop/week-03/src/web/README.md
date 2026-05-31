# 급식 정보 조회 — 프런트엔드

학교를 검색하고 날짜 범위에 대한 중식(lunch) 메뉴를 조회하는 Vite + React +
TypeScript 앱입니다. Vite 개발 프록시(`/api` → `http://localhost:8000`)를 통해
`../api`의 FastAPI 백엔드와 통신합니다.

> 전체 워크숍을 한 번에 실행/테스트하는 방법은 `../README.md`를 참고하세요.

## 사전 준비물

- Node.js 22+ (24 LTS 권장)
- npm 10+
- 백엔드(`../api`)가 `http://localhost:8000`에서 실행 중 (또는 `vite.config.ts`의 프록시 대상 수정)

## 디렉터리 구조

```text
web/
├── src/
│   ├── main.tsx                  # 앱 엔트리 (React 18 root)
│   ├── App.tsx                   # 라우터 및 최상위 레이아웃
│   ├── index.css                 # Tailwind 진입 스타일
│   ├── types.ts                  # 공용 타입 정의
│   ├── pages/                    # 라우팅되는 페이지
│   │   ├── LandingPage.tsx
│   │   ├── DateRangePage.tsx
│   │   └── MealsResultPage.tsx
│   ├── components/
│   │   └── ui/                   # shadcn 스타일 UI 컴포넌트
│   ├── lib/
│   │   ├── api.ts                # `/api/*` 호출 래퍼
│   │   ├── api.test.ts           # api.ts 단위 테스트
│   │   └── utils.ts              # cn 등 유틸
│   └── test/                     # 테스트 인프라
│       ├── setup.ts              # jest-dom + MSW lifecycle
│       ├── test-utils.tsx        # renderWithProviders 헬퍼
│       ├── msw/                  # /api/* 모의 핸들러
│       └── integration/          # 전체 앱 마운트 통합 스위트
├── public/                       # 그대로 서빙되는 정적 파일
├── nginx/                        # 운영용 nginx.conf + default.conf.template
├── Dockerfile                    # Node 빌더 + nginx-unprivileged 런타임
├── index.html                    # Vite HTML 엔트리
├── vite.config.ts                # 개발 프록시 + 빌드 설정
├── vitest.config.ts              # Vitest 설정
├── package.json
└── README.md                     # 현재 문서
```

## 실행

```bash
cd workshop/week-03/src/web
npm install
npm run dev
```

- 앱: <http://localhost:5173> (Vite 개발 서버, `/api`는 `:8000`으로 프록시됨)

## 빌드

```bash
npm run build            # 운영용 번들을 dist/ 로 출력
npm run preview          # 빌드된 번들을 http://localhost:4173 에서 서빙
```

## 테스트

**Vitest + React Testing Library + MSW** 기반입니다. 단위 테스트는 소스 옆에
위치하며(`*.test.ts`/`*.test.tsx`), 전체 앱을 마운트하는 통합 테스트는
`src/test/integration/` 아래에 위치합니다. `MSW` 가 모든 `/api/*` 요청을
가로채므로 테스트는 결정적이고 오프라인에서 실행됩니다.

```text
src/
├── lib/
│   └── api.ts                    # 본체
│       └── api.test.ts           # 단위 (URL/에러 로직)
└── test/
    ├── setup.ts                  # jest-dom + MSW lifecycle
    ├── test-utils.tsx            # renderWithProviders 헬퍼
    ├── msw/
    │   ├── handlers.ts           # /api/* 모의 응답
    │   └── server.ts
    └── integration/
        ├── search-flow.test.tsx
        └── meals-flow.test.tsx
```

> 참고: 프레젠테이션 컴포넌트(예: `Button`)와 한 줄짜리 유틸리티(`cn`)는
> 자체 분기 로직이 없고 이미 통합 스위트에서 충분히 검증되므로 의도적으로
> 단위 테스트를 두지 **않습니다**. 컴포넌트가 실제 로직(state machine, 폼
> 유효성 검사, 복잡한 키보드 핸들러 등)을 가질 때에만 컴포넌트 단위 테스트를
> 추가하세요.

실행:

```bash
npm test                 # 1회 실행
npm run test:watch       # watch 모드
npm run test:coverage    # 커버리지 리포트 (HTML은 ./coverage)
```

## 트러블슈팅

- **포트 5173 / 4173 사용 중** — `npm run dev -- --port <N>` 또는
  `npm run preview -- --port <N>` 으로 변경하거나 기존 프로세스를 종료하세요.
- **`/api/*` 호출이 404 / 네트워크 에러** — 개발 서버에서는 `../api`가
  `:8000`에서 실행 중이어야 합니다. 백엔드를 띄우거나 `vite.config.ts`의
  프록시 대상을 수정하세요.
- **빌드 후 화면이 흰색** — `dist/`를 직접 열면 라우팅이 동작하지 않습니다.
  반드시 `npm run preview` 또는 nginx 컨테이너를 사용하세요.
