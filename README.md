# 바이브 벤처 프로젝트

바이브 벤처 프로젝트에 오신 여러분을 환영합니다!

## 사전 워크샵

### [1주차](./workshop/week-01/README.md)

- 개발 환경 설정

### [2주차](./workshop/week-02/README.md)

- GitHub Copilot 활용 간단한 앱 만들어보기
- GitHub Copilot 활용 앱 설계하기
- GitHub Copilot 활용 앱 개발하기
- GitHub Copilot 활용 앱 테스트하기

### [3주차](./workshop/week-03/README.md)

- GitHub Copilot 활용 앱 배포하기

## 궁금한 내용이 있다면?

궁금한 내용이 있거나 공유하고 싶은 내용이 있다면 [Discussion](https://github.com/innodg/vibe-venture/discussions) 보드를 이용해 보세요!

## 급식 정보 조회 앱

NEIS 오픈 API(`workshop/week-03/src/openapi.json`)를 활용한 학교 중식(점심) 식단 조회 웹 앱입니다.

- **Backend** (`workshop/week-03/src/api`) — FastAPI + `uv`. NEIS 프록시. 자세한 내용은 [`workshop/week-03/src/api/README.md`](./workshop/week-03/src/api/README.md).
- **Frontend** (`workshop/week-03/src/web`) — React + Vite + TypeScript + Tailwind v4 + shadcn 스타일 컴포넌트. 자세한 내용은 [`workshop/week-03/src/web/README.md`](./workshop/week-03/src/web/README.md).

### 사전 준비

`workshop/week-03/src/.env` 파일에 NEIS 인증키를 설정합니다.

```env
NEIS_API_KEY=발급받은_인증키
```

### 실행

두 개의 터미널에서 각각:

```bash
# 백엔드 (포트 8000)
cd workshop/week-03/src/api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

```bash
# 프론트엔드 (포트 5173)
cd workshop/week-03/src/web
npm install
npm run dev
```

브라우저에서 <http://localhost:5173> 를 엽니다. Vite dev 서버가 `/api` 요청을 백엔드로 프록시합니다.

### 사용 흐름

1. 학교 이름의 일부를 입력해 검색합니다.
2. 결과 목록에서 학교를 선택합니다.
3. 달력에서 시작일과 종료일을 선택합니다 (최대 31일).
4. 날짜별 중식 카드(메뉴 · 원산지 · 영양정보 · 칼로리 · 급식인원수)가 표시됩니다.
