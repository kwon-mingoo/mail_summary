import asyncio
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
        return f"""당일({date}) 수신된 비즈니스 메일들을 요약해줘.
다음 메일 리스트를 바탕으로 핵심 내용을 정리해줘:

{email_list}

한국어로 답변하고 다음 구조를 지켜줘:
1. **오늘의 주요 업무**: 전체적인 흐름 요약
2. **긴급 확인 사항**: 즉시 처리가 필요한 건들
3. **폴더별 요약**: 폴더(회사)별 주요 내용 정리"""

    # 퇴근후
    return f"""퇴근 이후(어제 18시 ~ 오늘 오전) 수신된 메일들을 요약해줘.
밤 사이에 새로 들어온 중요한 소식들을 정리해줘:

{email_list}

한국어로 답변하고 다음 구조를 지켜줘:
1. **밤 사이 주요 소식**: 퇴근 후 도착한 핵심 내용
2. **오전 중 처리 필요**: 출근 즉시 확인해야 할 사항
3. **참고 사항**: 기타 보고 및 안내 내용"""


def _sync_generate(prompt: str) -> str:
    model = genai.GenerativeModel(_MODEL_NAME)
    response = model.generate_content(prompt)
    return response.text or "요약을 생성할 수 없습니다."


async def generate_summary(date: str, summary_type: str, emails: list[dict]) -> str:
    prompt = _build_prompt(date, summary_type, emails)
    return await asyncio.to_thread(_sync_generate, prompt)
