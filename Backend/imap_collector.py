import base64
import email
import email.utils
import imaplib
import quopri
from email.header import decode_header
from datetime import datetime, timezone, timedelta
import os
from html.parser import HTMLParser
from Backend.database import email_exists, save_email

KST = timezone(timedelta(hours=9))

IMAP_HOST = "imap.daum.net"
IMAP_PORT = 993
DAUM_EMAIL = os.getenv("DAUM_EMAIL", "")
DAUM_PASSWORD = os.getenv("DAUM_PASSWORD", "")

# 영어 월 약어 (strftime %b 가 로케일에 따라 달라지는 문제 방지)
_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# ─── 문자열 디코딩 헬퍼 ───────────────────────────────────────────────────────

def _decode_header(raw: str) -> str:
    if not raw:
        return ""
    parts = decode_header(raw)
    decoded = []
    for part, charset in parts:
        if isinstance(part, bytes):
            if charset:
                for enc in [charset, 'utf-8', 'euc-kr', 'cp949', 'latin-1']:
                    try:
                        decoded.append(part.decode(enc))
                        break
                    except Exception:
                        continue
                else:
                    decoded.append(part.decode('latin-1', errors='replace'))
            else:
                for enc in ['utf-8', 'euc-kr', 'cp949', 'latin-1']:
                    try:
                        decoded.append(part.decode(enc))
                        break
                    except Exception:
                        continue
        else:
            decoded.append(part)
    return "".join(decoded)


def _decode_folder_name(raw: bytes | str) -> str:
    """
    IMAP LIST에서 추출한 폴더명 → 사람이 읽을 수 있는 문자열.
    Modified UTF-7 (RFC 3501)을 순수 Python으로 디코딩.
    &...- 형식의 인코딩을 UTF-16-BE base64로 변환.
    """
    if isinstance(raw, bytes):
        try:
            name = raw.decode('ascii', errors='replace')
        except Exception:
            name = raw.decode('utf-8', errors='replace')
    else:
        name = raw

    # Modified UTF-7 디코딩
    # IMAP Modified UTF-7: &...-, 표준 UTF-7과 달리 ',' 대신 '/' 사용
    result = []
    i = 0
    while i < len(name):
        if name[i] == '&':
            end = name.find('-', i + 1)
            if end == -1:
                result.append(name[i])
                i += 1
                continue
            encoded = name[i+1:end]
            if encoded == '':
                # &- 는 리터럴 &
                result.append('&')
            else:
                try:
                    # Modified UTF-7: ',' → '/' 로 치환 후 base64 디코딩
                    b64 = encoded.replace(',', '/')
                    # base64 패딩 맞추기
                    pad = (-len(b64)) % 4
                    b64 += '=' * pad
                    decoded_bytes = base64.b64decode(b64)
                    result.append(decoded_bytes.decode('utf-16-be'))
                except Exception:
                    result.append(name[i:end+1])
            i = end + 1
        else:
            result.append(name[i])
            i += 1

    return ''.join(result)


# ─── 날짜/시각 헬퍼 ──────────────────────────────────────────────────────────

def _parse_received_at(msg: email.message.Message) -> datetime:
    """Date 헤더 → KST datetime. 실패 시 현재 시각."""
    date_str = msg.get("Date", "")
    try:
        dt = email.utils.parsedate_to_datetime(date_str)
        return dt.astimezone(KST)
    except Exception:
        return datetime.now(KST)


def _is_after_hours(dt: datetime) -> bool:
    h = dt.hour
    return h >= 18 or h < 9


def _since_date_str(days: int = 30) -> str:
    """오늘 기준 N일 전 날짜를 IMAP SINCE 형식(DD-Mon-YYYY)으로 반환."""
    dt = datetime.now() - timedelta(days=days)
    return f"{dt.day:02d}-{_MONTHS[dt.month - 1]}-{dt.year}"


# ─── 본문 추출 ────────────────────────────────────────────────────────────────

def _get_body(msg: email.message.Message) -> str:
    """
    메일 메시지에서 본문 텍스트 추출.
    - multipart: text/plain 우선, 없으면 text/html (태그 제거)
    - singlepart: content-type에 따라 처리
    CTE를 명시적으로 처리 (base64 / quoted-printable).
    """


    class HTMLTextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.text = []

        def handle_data(self, data):
            self.text.append(data)

        def get_text(self):
            return ' '.join(self.text).strip()

    def decode_payload(part) -> str:
        # get_payload(decode=True) 가 base64/quoted-printable 을 자동 처리
        payload = part.get_payload(decode=True)
        if not payload:
            return ""
        charset = part.get_content_charset()

        for enc in [charset, 'utf-8', 'euc-kr', 'cp949', 'latin-1']:
            if not enc:
                continue
            try:
                return payload.decode(enc)
            except Exception:
                continue
        return payload.decode('latin-1', errors='replace')

    plain_text = ""
    html_text = ""

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == 'text/plain' and not plain_text:
                plain_text = decode_payload(part)
            elif content_type == 'text/html' and not html_text:
                raw_html = decode_payload(part)
                extractor = HTMLTextExtractor()
                extractor.feed(raw_html)
                html_text = extractor.get_text()
    else:
        content_type = msg.get_content_type()
        if content_type == 'text/plain':
            plain_text = decode_payload(msg)
        elif content_type == 'text/html':
            raw_html = decode_payload(msg)
            extractor = HTMLTextExtractor()
            extractor.feed(raw_html)
            html_text = extractor.get_text()

    return plain_text or html_text or ""


# ─── LIST 응답 파싱 ──────────────────────────────────────────────────────────

def _parse_folder_name(item: bytes) -> bytes | None:
    """
    IMAP LIST 응답 한 줄에서 폴더명 bytes 추출.
    split 우선순위: b'"/"' → b' "/" ' → b'/' → rsplit 마지막 공백
    """
    if b'"/"' in item:
        return item.split(b'"/"', 1)[1].strip().strip(b'"')
    if b' "/" ' in item:
        return item.split(b' "/" ', 1)[1].strip().strip(b'"')
    if b'/' in item:
        return item.split(b'/', 1)[1].strip().strip(b'"')
    parts = item.rsplit(b' ', 1)
    if len(parts) == 2:
        return parts[1].strip().strip(b'"')
    return None


def _parse_list_response(items: list) -> list[tuple[bytes, str]]:
    """
    IMAP LIST 응답 → [(select_name_bytes, display_name_str), ...]
    select_name_bytes : mail.select()에 그대로 전달할 원본 bytes
    display_name_str  : DB에 저장할 사람이 읽을 수 있는 이름
    """
    results = []
    for item in items:
        if item is None:
            continue
        if isinstance(item, str):
            item = item.encode()

        raw_name = _parse_folder_name(item)
        if raw_name is None:
            print(f"[IMAP][WARN] LIST 파싱 실패: {item!r}")
            continue

        display_name = _decode_folder_name(raw_name)
        results.append((raw_name, display_name))

    return results


# ─── 메인 수집 함수 ──────────────────────────────────────────────────────────

def collect_emails():
    if not DAUM_EMAIL or not DAUM_PASSWORD:
        print("[IMAP] 환경변수 DAUM_EMAIL / DAUM_PASSWORD 미설정 — 수집 건너뜀")
        return

    # ── 로그인
    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
        mail.login(DAUM_EMAIL, DAUM_PASSWORD)
        print("[IMAP] 로그인 성공")
    except Exception as e:
        print(f"[IMAP] 로그인 실패: {e}")
        return

    since_date = _since_date_str(30)
    print(f"[IMAP] 수집 기간: {since_date} 이후")

    try:
        # ── 폴더 목록
        _, folder_list = mail.list()
        if not folder_list:
            print("[IMAP] 폴더 목록이 비어 있습니다.")
            return

        folders = _parse_list_response(folder_list)
        print(f"[IMAP] 전체 폴더 수: {len(folders)}")
        for _, dname in folders:
            print(f"[IMAP]   폴더: {dname!r}")

        saved = 0
        for raw_name, display_name in folders:
            try:
                # ── 폴더 선택 (원본 bytes 그대로 사용)
                select_arg = b'"' + raw_name + b'"'
                status, select_data = mail.select(select_arg, readonly=True)
                if status != "OK":
                    print(f"[IMAP] SELECT 실패 ({display_name!r}): status={status}, data={select_data}")
                    continue

                # ── 30일 이내 메일만 검색
                _, data = mail.search(None, f'SINCE {since_date}')
                if not data or not data[0]:
                    print(f"[IMAP] '{display_name}' — 메일 없음")
                    continue

                uids = data[0].split()
                print(f"[IMAP] '{display_name}' — {since_date} 이후 {len(uids)}통")

                folder_saved = 0
                for uid in uids:
                    _, msg_data = mail.fetch(uid, "(RFC822)")
                    if not msg_data or not msg_data[0]:
                        print(f"[IMAP]   UID {uid!r}: fetch 결과 없음")
                        continue

                    raw = msg_data[0][1] if isinstance(msg_data[0], tuple) else msg_data[0]
                    if not raw:
                        print(f"[IMAP]   UID {uid!r}: raw 데이터 없음")
                        continue

                    msg = email.message_from_bytes(raw)

                    subject = _decode_header(msg.get("Subject", "(제목없음)"))
                    sender = _decode_header(msg.get("From", "(발신자없음)"))
                    dt = _parse_received_at(msg)
                    received_at = dt.strftime("%Y-%m-%dT%H:%M:%S")
                    after_hours = _is_after_hours(dt)

                    if email_exists(subject, sender, received_at):
                        continue  # 중복 건너뜀

                    body = _get_body(msg)[:10_000]  # DB 저장 크기 제한

                    print(f"[IMAP]   저장: [{display_name}] {sender!r} | {subject!r} | {received_at}")
                    save_email(display_name, subject, sender, received_at, after_hours, body)
                    folder_saved += 1
                    saved += 1

                print(f"[IMAP] '{display_name}' — 신규 저장 {folder_saved}건")

            except Exception as e:
                print(f"[IMAP] 폴더 '{display_name}' 처리 오류: {type(e).__name__}: {e}")
                continue

        print(f"[IMAP] 수집 완료 — 신규 {saved}건 저장")

    finally:
        try:
            mail.logout()
        except Exception:
            pass