import asyncio
import json
import os
import google.generativeai as genai
from dotenv import load_dotenv

# .env 로드
load_dotenv()

# API 키 설정
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

_MODEL_NAME = "models/gemini-2.5-flash"


def _build_prompt(date: str, summary_type: str, emails: list[dict]) -> str:
    email_list = "\n".join(
        f"- [{e['folder']}] {e['sender']} | {e['subject']} | {e['received_at']}"
        for e in emails
    )

    if summary_type == "일별":
        task = f"당일({date}) 수신된 비즈니스 메일들을 분석해줘."
        structure = (
            "1. **오늘의 주요 업무**: 전체적인 흐름 요약\n"
            "2. **긴급 확인 사항**: 즉시 처리가 필요한 건들\n"
            "3. **폴더별 요약**: 폴더(회사)별 주요 내용 정리"
        )
    else:
        task = "퇴근 이후(어제 18시 ~ 오늘 오전) 수신된 메일들을 분석해줘."
        structure = (
            "1. **밤 사이 주요 소식**: 퇴근 후 도착한 핵심 내용\n"
            "2. **오전 중 처리 필요**: 출근 즉시 확인해야 할 사항\n"
            "3. **참고 사항**: 기타 보고 및 안내 내용"
        )

    return (
        f"{task}\n\n"
        f"메일 리스트:\n{email_list}\n\n"
        f"[summary 작성 구조]\n{structure}\n\n"
        f"위 구조에 따라 한국어 마크다운으로 summary를 작성하고, "
        f"메일에서 즉시 처리가 필요한 업무를 todos 배열로 추출해줘 (최대 5개, 짧은 문장).\n"
        f"반드시 다음 JSON 형식으로만 응답해줘 (코드블록 없이 순수 JSON):\n"
        f'{{\"summary\": \"...\", \"todos\": [\"업무1\", \"업무2\"]}}'
    )


def _sync_generate(prompt: str) -> dict:
    model = genai.GenerativeModel(_MODEL_NAME)
    response = model.generate_content(prompt)
    text = (response.text or "").strip()
    # 코드블록 제거 (Gemini가 ```json ... ``` 형태로 반환할 경우)
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        text = text.rsplit("```", 1)[0].strip()
    try:
        data = json.loads(text)
        return {
            "summary": str(data.get("summary", "") or "요약을 생성할 수 없습니다."),
            "todos": [str(t) for t in data.get("todos", []) if t],
        }
    except (json.JSONDecodeError, KeyError):
        return {"summary": text or "요약을 생성할 수 없습니다.", "todos": []}


async def generate_summary(date: str, summary_type: str, emails: list[dict]) -> dict:
    prompt = _build_prompt(date, summary_type, emails)
    return await asyncio.to_thread(_sync_generate, prompt)
