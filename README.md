# NAMI Business Suite

> 건설업 특화 업무 자동화 통합 플랫폼 — 메일 요약 & 견적 관리

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-009688?logo=fastapi)
![React](https://img.shields.io/badge/React-TypeScript-61DAFB?logo=react)
![SQLite](https://img.shields.io/badge/SQLite-database-003B57?logo=sqlite)
![Gemini](https://img.shields.io/badge/Gemini-API-4285F4?logo=google)

---

## Overview

NAMI Business Suite는 건설업 실무 환경에 특화된 업무 자동화 웹 애플리케이션입니다.  
Daum IMAP 메일을 자동 수집하고 Gemini API로 요약하여 업무 효율을 높이며,  
입찰/견적 데이터를 체계적으로 관리할 수 있는 통합 솔루션입니다.

---

## Features

### 메일 요약 서비스
- **자동 메일 수집** — APScheduler로 30분마다 Daum IMAP 전체 폴더 순회
- **하루치 요약** — 선택한 날짜의 전체 수신 메일 AI 요약
- **퇴근 후 요약** — 오후 6시 ~ 다음날 오전 9시 수신 메일 요약 (출근 후 바로 확인)
- **폴더별 필터링** — 회사/거래처별 메일함 단위로 필터링
- **요약 캐싱** — 동일 날짜/타입 요약은 DB에서 즉시 반환 (API 비용 절약)
- **30일 이내 수집** — 최근 30일치 메일만 수집하여 성능 최적화

### 견적 프로그램
- 과거 입찰 데이터(재료비/노무비/경비) 등록 및 관리
- 낙찰/탈락 결과 추적 및 낙찰률 통계
- 현장별 견적 상세 조회
- AI 비딩 인사이트 (데이터 기반 투찰 전략 분석)

---

## Tech Stack

| 영역 | 기술 |
|------|------|
| Backend | FastAPI, APScheduler, imaplib |
| Database | SQLite |
| AI | Google Gemini API (`gemini-1.5-flash`) |
| Frontend | React + TypeScript (Vite) |
| 메일 수집 | IMAP SSL (imap.daum.net:993) |
| 인코딩 처리 | imaputf7 (Modified UTF-7 폴더명 디코딩) |

---

## Project Structure

```
nami-business-suite/
├── AI/
│   └── summarizer.py           # Gemini API 요약 로직
├── Backend/
│   ├── main.py                 # FastAPI 앱 + APScheduler
│   ├── database.py             # SQLite 연결 및 테이블 관리
│   └── imap_collector.py       # Daum IMAP 메일 수집
├── FrontEnd/
│   ├── src/
│   │   └── App.tsx             # React 메인 컴포넌트
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts          # /api 프록시 설정
├── .env                        # 환경변수 (gitignore)
├── .env.example                # 환경변수 템플릿
├── .gitignore
└── requirements.txt
```

---

## Getting Started

### 1. 사전 요구사항

- Python 3.11
- Node.js 18+
- Daum 메일 IMAP 활성화 (`환경설정 → 메일 사용 설정 → IMAP 사용`)
- Daum/카카오 앱 비밀번호 발급 (`카카오 계정 보안 → 앱 비밀번호`)
- Google Gemini API 키 발급

### 2. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 아래 값을 입력합니다.

```env
DAUM_EMAIL=yourmail@daum.net
DAUM_PASSWORD=앱비밀번호
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Backend 실행

```bash
# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
uvicorn Backend.main:app --host 127.0.0.1 --port 8000 --reload
```

서버 시작 시 APScheduler가 함께 실행되며, 30분마다 메일을 자동 수집합니다.

### 4. Frontend 실행

```bash
cd FrontEnd
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

---

## API Endpoints

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/api/folders` | 수집된 메일 폴더(회사) 목록 반환 |
| `GET` | `/api/emails` | 날짜 + 폴더 기준 메일 목록 반환 |
| `POST` | `/api/summary` | 메일 요약 생성 또는 캐시 반환 |

### POST /api/summary Request Body

```json
{
  "date": "2026-02-26",
  "type": "일별",
  "folder": "전체"
}
```

`type` 값: `"일별"` | `"퇴근후"`

---

## Database Schema

### emails

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | PK, 자동증가 |
| folder | TEXT | 메일 폴더명 (회사명) |
| subject | TEXT | 메일 제목 |
| sender | TEXT | 발신자 |
| received_at | TEXT | 수신 시간 (KST, ISO 8601) |
| body | TEXT | 본문 내용 |
| is_after_hours | BOOLEAN | 퇴근 후 수신 여부 (18:00 이후 또는 09:00 이전) |
| created_at | TEXT | DB 저장 시간 |

### summaries

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | PK, 자동증가 |
| folder | TEXT | 폴더명 (NULL = 전체) |
| summary_date | TEXT | 요약 날짜 (YYYY-MM-DD) |
| summary_type | TEXT | `"일별"` 또는 `"퇴근후"` |
| content | TEXT | 요약 내용 |
| created_at | TEXT | 생성 시간 |

---

## Notes

- 메일 수집은 **최근 30일치**만 수행합니다.
- 동일 메일 중복 저장 방지를 위해 `subject + sender + received_at` 기준으로 중복 체크합니다.
- Daum IMAP 폴더명은 Modified UTF-7로 인코딩되어 있어 `imaputf7` 라이브러리로 디코딩합니다.
- `.env` 파일은 절대 커밋하지 마세요. `.env.example`만 커밋합니다.

---

## License

MIT
