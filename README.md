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

> **현재 개발 중 (WIP)** — 메일 수집/요약 기능 구현 완료, 미해결 이슈 대응 중

<br>

## Features

### 메일 요약 서비스
- Daum IMAP 전체 폴더 자동 순회 수집 (APScheduler, 30분 간격)
- 최근 30일치 메일 수집 (IMAP SINCE 필터)
- **어제 / 오늘 / 퇴근 후** 버튼으로 구분 요약
  - 퇴근 후: 오후 6시 ~ 다음날 오전 9시 수신 메일
- 폴더(회사/거래처)별 필터링
- 요약 결과 DB 캐싱 + 재생성 시 캐시 삭제 후 재호출
- Gemini API 응답에서 할 일(Action Item) 자동 추출
- 할 일 체크리스트 + 항목별 비고 입력
- 메일 수동 새로고침 버튼 (POST /api/collect)
- Modified UTF-7 IMAP 폴더명 디코딩 (순수 Python 구현)
- euc-kr / cp949 / quoted-printable 인코딩 처리
- UID 기반 증분 수집으로 중복 다운로드 방지

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
│   └── summarizer.py              # Gemini API 요약 + 할 일 추출
├── Backend/
│   ├── main.py                    # FastAPI 앱 진입점 + APScheduler
│   ├── database.py                # SQLite 스키마 및 쿼리
│   └── imap_collector.py          # Daum IMAP 메일 수집
├── FrontEnd/
│   ├── src/
│   │   ├── App.tsx                # 레이아웃 + 전역 상태 관리
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

> 서버 시작 시 APScheduler가 함께 실행되며 3분마다 메일을 자동 수집합니다.

> DB 초기화가 필요한 경우: `rm mail_summary.db` 후 서버 재시작

<br>

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/folders` | 수집된 메일 폴더 목록 반환 |
| `GET` | `/api/emails` | 날짜 + 폴더 기준 메일 목록 반환 |
| `GET` | `/api/summary` | 캐시된 요약 조회 |
| `POST` | `/api/summary` | 메일 요약 생성 또는 캐시 반환 |
| `DELETE` | `/api/summary` | 요약 캐시 삭제 |
| `POST` | `/api/collect` | 메일 즉시 수집 요청 |

#### POST `/api/summary`

```json
// Request Body
{
  "date": "2026-03-05",
  "type": "일별",
  "folder": "전체"
}

// Response
{
  "summary": "요약 내용...",
  "todos": ["견적서 제출", "시정 조치 확인"]
}
```

`type` 가능한 값: `"일별"` | `"퇴근후"`

#### POST `/api/collect`

```json
// Response
{
  "status": "ok",
  "message": "메일 수집이 완료되었습니다.",
  "saved": 3,
  "skipped": 12
}
```

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
| content | TEXT | 요약 + 할 일 목록 (JSON) |
| created_at | TEXT | 생성 시간 |

<br>

## Known Issues

현재 미해결 상태로 추가 대응 필요한 항목들입니다.

- [ ] **안 읽은 메일 수집 안 됨**: IMAP UNSEEN 검색 시 Daum 서버에서 정상 반환되지 않는 문제. `mail.uid('search', None, 'UNSEEN')` 으로 별도 수집 시도했으나 미해결
- [ ] **HTML 형식 메일 본문 깨짐**: HTML 전용 메일에서 태그 제거 후에도 인코딩이 깨지는 경우 존재
- [ ] **첨부파일 포함 메일 본문 미수집**: multipart/mixed 구조에서 본문이 누락되는 케이스
- [ ] **메일 새로고침 후 최신 메일 반영 지연**: POST /api/collect 완료 후 DB 반영 타이밍 불일치

<br>

## Roadmap

- [ ] 안 읽은 메일 수집 문제 근본 해결
- [ ] HTML 메일 본문 파싱 개선
- [ ] 견적 데이터 백엔드 API 연동
- [ ] 사용자 인증 (로그인)

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
