# CLAUDE.md – 현장 일정 날씨판 작업 규칙

## 프로젝트 개요
- 교육용 프로토타입이다. 무엇을 만들지는 PRD.md를 따른다.
- PRD.md에 없는 기능은 먼저 제안하고, 내가 승인한 뒤에만 구현한다.

## 기술 스택 (변경 금지)
- HTML + CSS + 순수 JavaScript만 사용한다. (React 등 프레임워크, 빌드 도구 사용 금지)
- index.html 을 더블클릭해서 열 수 있어야 한다.
- 외부 스크립트(CDN)는 supabase-js 하나만 쓴다. index.html 은 supabase-js → config.js → logic.js → app.js 순서로 불러온다.
- 키가 필요한 API(기상청 등)는 화면 코드에서 부르지 않는다. api/ 폴더의 서버 함수에서만 부른다.

## 폴더 구조
- index.html : 화면 구조
- style.css  : 디자인
- logic.js   : 판단 규칙만 (화면을 다루는 코드 금지)
- app.js     : 화면 동작 (목록 그리기, 일정 추가). DB 호출은 '저장 위치' 구역(checkConfig · loadData · insertTask)에서만
- config.js  : Supabase 주소와 공개용 키 두 값만 (api/kma.js 가 쓰도록 내보내는 줄 1개 포함)
- api/kma.js : Vercel 서버 함수. 지역의 일정 · 기상청 날씨 · 판단을 JSON으로 돌려줌 (판단은 logic.js 의 judge 를 그대로 씀)
- setup.sql  : 표 · 값 규칙 · 권한(RLS). 내가 Supabase SQL Editor 에서 직접 실행한다
- PRD.md · CLAUDE.md · README.md : 문서

## 작업 방식
1. 코드를 고치기 전에 계획(수정할 파일과 이유)을 먼저 보여 주고 승인을 받는다.
2. 한 번에 한 가지만 고친다.
3. 끝나면 바꾼 파일, 내가 확인할 방법(T-번호), 남은 문제를 보고한다.

## 보안 · 데이터 규칙
- 가상 데이터만 사용한다. 실제 이름 · 연락처 · 기관 내부 자료를 넣지 않는다.
- 일정은 Supabase 표 wx_tasks 에 둔다. (localStorage · data/tasks.json 은 쓰지 않음)
- 표 이름은 wx_ 로 시작한다. 값 규칙(지역 · 구분 · 빈칸)은 화면에서만 막지 않고 setup.sql 에서도 막는다.
- 사용자가 입력한 글자는 textContent 로 표시한다.
- 화면 코드에는 공개용 키(Publishable 또는 anon)만 쓴다. 비밀 키(Secret 또는 service_role)는 절대 코드 · 채팅 · GitHub 에 넣지 않는다.
- 기상청 키는 Vercel 환경변수 KMA_KEY 에만 둔다. .env 는 GitHub에 올리지 않고, .env.example 에는 이름만 적는다.
- SQL을 바꾸면 내가 SQL Editor 에서 직접 실행한다. 실행할 부분만 따로 보여 준다.
