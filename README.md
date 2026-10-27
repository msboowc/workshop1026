# 현장 일정 날씨판

오늘 현장 일정과 지역별 날씨를 한 화면에서 보고, 날씨 때문에 주의 · 중지를 검토할 일정을 표시합니다. (교육용 가상 데이터)

## 여는 법
- 내 PC : `index.html` 더블클릭
- 인터넷 : https://workshop1026.vercel.app/

## 파일
| 파일 | 역할 |
|---|---|
| index.html | 화면 구조 |
| style.css | 디자인 |
| logic.js | 판단 규칙 |
| app.js | 화면 동작 |
| config.js | Supabase 주소 · 공개용 키 |
| setup.sql | Supabase 표 wx_tasks 만들기 (SQL Editor 에서 실행) |
| api/kma.js | 서버 함수 : `/api/kma?region=대전` → 그 지역 일정 · 날씨 · 판단 (JSON) |
| .env.example | 필요한 키 이름 견본 (KMA_KEY) — 진짜 키는 Vercel 환경변수에 |
| PRD.md | 무엇을 · 왜 만드는지 |
| CLAUDE.md | AI가 지킬 작업 규칙 |
| .gitignore | GitHub에 올리지 않을 파일 목록 |
