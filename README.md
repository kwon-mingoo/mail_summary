# NAMI Business Suite

> 건설업 특화 업무 자동화 통합 플랫폼

![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=flat-square&logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_API-4285F4?style=flat-square&logo=google&logoColor=white)
![Status](https://img.shields.io/badge/status-WIP-yellow?style=flat-square)

<br>

## Overview

건설업 실무 환경에서 발생하는 반복 업무를 자동화하는 웹 애플리케이션입니다.

- **메일 요약**: Daum IMAP 메일을 자동 수집하고 Gemini API로 요약
- **견적 관리**: 과거 입찰 데이터 관리 및 낙찰률 분석

> **현재 개발 중 (WIP)** — 메일 수집/요약 기능 구현 완료, 리팩토링 진행 중

<br>

## Features

### 메일 요약 서비스
- Daum IMAP 전체 폴더 자동 순회 수집 (APScheduler, 30분 간격)
- 최근 30일치 메일만 수집하여 성능 최적화
- **일별 요약**: 선택한 날짜의 전체 수신 메일 AI 요약
- **퇴근 후 요약**: 오후 6시 ~ 다음날 오전 9시 수신 메일 요약
- 폴더(회사/거래처)별 필터링
- 요약 결과 DB 캐싱 (동일 날짜/타입 재요청 시 즉시 반환)
- Modified UTF-7 IMAP 폴더명 디코딩 (순수 Python 구현)
- euc-kr / cp949 / base64 / quoted-printable 인코딩 처리

### 견적 프로그램
- 과거 입찰 데이터(재료비/노무비/경비) 등록 및 관리
- 낙찰/탈락 결과 추적 및 낙찰률 통계
- 현장별 견적 상세 조회 (직접비 테이블)
- AI 비딩 인사이트 (데이터 기반 투찰 전략 분석)

<br>

## Tech Stack

| 분류 | 기술 |
|------|------|
| Backend | Python 3.11, FastAPI, APScheduler |
| Database | SQLite |
| AI | Google Gemini API (`gemini-1.5-flash`) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| 메일 수집 | IMAP SSL (`imap.daum.net:993`) |
| 애니메이션 | Framer Motion |

<br>

## Project Structure

```
nami-business-suite/
├── AI/
│   └── summarizer.py              # Gemini API 요약 로직
├── Backend/
│   ├── main.py                    # FastAPI 앱 진입점 + APScheduler
│   ├── database.py                # SQLite 스키마 및 쿼리
│   └── imap_collector.py          # Daum IMAP 메일 수집
├── FrontEnd/
│   ├── src/
│   │   ├── App.tsx                # 메인 컴포넌트 (리팩토링 예정)
│   │   ├── types.ts               # 공통 타입 정의
│   │   ├── services.ts            # 서비스 라우팅 설정
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── TabBar.tsx
│   │   └── pages/
│   │       ├── Home.tsx
│   │       ├── MailSummary.tsx
│   │       └── Estimation.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts             # /api 프록시 설정
├── .env.example
├── .gitignore
└── requirements.txt
```

<br>

## Getting Started

### Prerequisites

- Python 3.11
- Node.js 18+
- Daum 메일 IMAP 활성화
  - `환경설정 → 메일 사용 설정 → IMAP 사용`
- Daum/카카오 앱 비밀번호 발급
  - `카카오 계정 보안 → 앱 비밀번호 생성`
- [Google AI Studio](https://aistudio.google.com) Gemini API 키 발급

### Installation

```bash
# 1. 레포지토리 클론
git clone https://github.com/your-username/nami-business-suite.git
cd nami-business-suite

# 2. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 아래 값 입력

# 3. Python 가상환경 생성 및 패키지 설치
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 4. 프론트엔드 패키지 설치
cd FrontEnd && npm install
```

### Run

```bash
# 백엔드 (프로젝트 루트에서 실행)
uvicorn Backend.main:app --host 127.0.0.1 --port 8000 --reload

# 프론트엔드 (별도 터미널)
cd FrontEnd && npm run dev
```

| 서비스 | 주소 |
|--------|------|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

> 서버 시작 시 APScheduler가 함께 실행되며 30분마다 메일을 자동 수집합니다.

<br>

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/folders` | 수집된 메일 폴더 목록 반환 |
| `GET` | `/api/emails` | 날짜 + 폴더 기준 메일 목록 반환 |
| `POST` | `/api/summary` | 메일 요약 생성 또는 캐시 반환 |

#### POST `/api/summary`

```json
// Request Body
{
  "date": "2026-02-26",
  "type": "일별",
  "folder": "전체"
}

// Response
{
  "summary": "요약 내용..."
}
```

`type` 가능한 값: `"일별"` | `"퇴근후"`

<br>

## Database Schema

### emails

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | PK, Auto Increment |
| folder | TEXT | 메일 폴더명 (회사/거래처명) |
| subject | TEXT | 메일 제목 |
| sender | TEXT | 발신자 |
| received_at | TEXT | 수신 시간 (KST, ISO 8601) |
| body | TEXT | 본문 내용 |
| is_after_hours | INTEGER | 퇴근 후 수신 여부 (18:00 이후 또는 09:00 이전) |
| created_at | TEXT | DB 저장 시간 |

### summaries

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | PK, Auto Increment |
| folder | TEXT | 폴더명 (`전체` 또는 특정 폴더명) |
| date | TEXT | 요약 날짜 (YYYY-MM-DD) |
| type | TEXT | `일별` \| `퇴근후` |
| content | TEXT | 요약 내용 |
| created_at | TEXT | 생성 시간 |

<br>

## Known Issues & Roadmap

### 현재 알려진 이슈
- [ ] 첨부파일 포함 메일 본문 미수집

### 진행 예정
- [ ] `App.tsx` 모듈 분리 리팩토링 (`services.ts` 기반 라우팅)
- [ ] 메일 본문 인코딩 안정성 개선
- [ ] 사용자 인증
- [ ] 모바일 반응형 UI

<br>

## Environment Variables

`.env.example` 참고

```env
DAUM_EMAIL=yourmail@daum.net
DAUM_PASSWORD=앱비밀번호
GEMINI_API_KEY=gemini_api_key
```

<br>

## License

© 2026 NAMI. All rights reserved.
