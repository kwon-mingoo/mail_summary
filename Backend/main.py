import sys
import os
import asyncio
import json

# 프로젝트 루트를 sys.path에 추가 (uvicorn 실행 위치 무관하게 import 동작)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from pydantic import BaseModel

from Backend.database import init_db, get_folders, get_emails_by_date_folder, get_summary, save_summary, delete_summary
from Backend.imap_collector import collect_emails
from AI.summarizer import generate_summary


scheduler = AsyncIOScheduler()

# 중복 수집 방지 플래그
_collecting = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # 서버 시작 시 즉시 1회 수집
    try:
        collect_emails()
    except Exception as e:
        print(f"[Startup] 메일 수집 오류: {e}")

    scheduler.add_job(collect_emails, "interval", minutes=1, id="imap_collector")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Mail Summary API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/api/folders")
def api_get_folders():
    return {"folders": get_folders()}


@app.get("/api/emails")
def api_get_emails(
    date: str | None = Query(None, description="YYYY-MM-DD"),
    folder: str | None = Query(None),
):
    emails = get_emails_by_date_folder(date, folder)
    return {"emails": emails}


class SummaryRequest(BaseModel):
    date: str
    type: str   # '일별' | '퇴근후'
    folder: str = "전체"


@app.post("/api/collect")
async def api_collect():
    global _collecting
    if _collecting:
        return {"status": "busy", "message": "이미 수집 중입니다.", "saved": 0, "skipped": 0}
    _collecting = True
    try:
        result = await asyncio.to_thread(collect_emails)
        result = result or {"saved": 0, "skipped": 0}
        return {"status": "ok", "message": "메일 수집이 완료되었습니다.", **result}
    except Exception as e:
        print(f"[Collect] 오류: {e}")
        return {"status": "ok", "message": "수집 중 오류가 발생했습니다.", "saved": 0, "skipped": 0}
    finally:
        _collecting = False


@app.get("/api/summary")
def api_get_summary(
    date: str = Query(...),
    type: str = Query(...),
    folder: str = Query("전체"),
):
    content = get_summary(date, type, folder)
    if content:
        try:
            return json.loads(content)
        except Exception:
            return {"summary": content, "todos": []}
    return {"summary": None, "todos": []}


@app.delete("/api/summary")
def api_delete_summary(
    date: str = Query(...),
    type: str = Query(...),
    folder: str = Query("전체"),
):
    delete_summary(date, type, folder)
    return {"status": "ok"}


@app.post("/api/summary")
async def api_post_summary(req: SummaryRequest):
    if req.type not in ("일별", "퇴근후"):
        raise HTTPException(status_code=400, detail="type은 '일별' 또는 '퇴근후'여야 합니다.")

    # 캐시 확인
    cached = get_summary(req.date, req.type, req.folder)
    if cached:
        try:
            data = json.loads(cached)
            return {"summary": data.get("summary", cached), "todos": data.get("todos", [])}
        except Exception:
            return {"summary": cached, "todos": []}

    emails = get_emails_by_date_folder(req.date, req.folder if req.folder != "전체" else None)

    if req.type == "퇴근후":
        emails = [e for e in emails if e["is_after_hours"]]

    if not emails:
        return {"summary": f"해당 조건({req.date}, {req.type})에 맞는 메일이 없습니다.", "todos": []}

    result = await generate_summary(req.date, req.type, emails)
    save_summary(req.date, req.type, req.folder, json.dumps({"summary": result["summary"], "todos": result["todos"]}))
    return {"summary": result["summary"], "todos": result["todos"]}
