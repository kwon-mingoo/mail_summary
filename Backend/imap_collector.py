import base64
import email
import email.utils
import imaplib
import quopri
import re
from email.header import decode_header
from html.parser import HTMLParser
from datetime import datetime, timezone, timedelta
import os

from Backend.database import email_exists, save_email

KST = timezone(timedelta(hours=9))

IMAP_HOST = "imap.daum.net"
IMAP_PORT = 993
DAUM_EMAIL = os.getenv("DAUM_EMAIL", "")
DAUM_PASSWORD = os.getenv("DAUM_PASSWORD", "")

# 영어 월 약어 (strftime %b 가 로케일에 따라 달라지는 문제 방지)
_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# imaputf7 라이브러리 (없으면 fallback 사용)
try:
    import imaputf7 as _imaputf7
    _HAS_IMAPUTF7 = True
except ImportError:
    _HAS_IMAPUTF7 = False


# ─── 문자열 디코딩 헬퍼 ───────────────────────────────────────────────────────

def _decode_str(value: str | bytes | None, charset: str | None = None) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        for enc in [charset, "utf-8", "euc-kr", "cp949", "latin-1"]:
            if enc is None:
                continue
            try:
                return value.decode(enc, errors="strict")
            except Exception:
                continue
        return value.decode("latin-1", errors="replace")
    return value


def _decode_header(raw: str) -> str:
    parts = decode_header(raw or "")
    decoded = []
    for part, charset in parts:
        decoded.append(_decode_str(part, charset))
    return "".join(decoded)


def _decode_folder_bytes(raw: bytes) -> str:
    """
    IMAP LIST에서 추출한 폴더명 bytes → 사람이 읽을 수 있는 문자열.
    1) imaputf7 라이브러리 (modified UTF-7, 가장 정확)
    2) ASCII decode → utf-7 codec (표준 UTF-7 fallback)
    3) 원본 latin-1 반환
    """
    if _HAS_IMAPUTF7:
        try:
            return _imaputf7.decode(raw)
        except Exception:
            pass

    try:
        name_str = raw.decode('ascii')
        return name_str.encode('ascii').decode('utf-7')
    except Exception:
        pass

    return raw.decode('latin-1', errors='replace')


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

class _MLStripper(HTMLParser):
    """HTML 태그를 제거하고 텍스트만 추출."""

    def __init__(self):
        super().__init__()
        self._parts: list[str] = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag.lower() in ('style', 'script'):
            self._skip = True

    def handle_endtag(self, tag):
        if tag.lower() in ('style', 'script'):
            self._skip = False

    def handle_data(self, data):
        if not self._skip:
            self._parts.append(data)

    def get_text(self) -> str:
        return re.sub(r'\s+', ' ', ''.join(self._parts)).strip()


def _strip_html(html: str) -> str:
    """HTML → 순수 텍스트. HTMLParser 실패 시 regex fallback."""
    stripper = _MLStripper()
    try:
        stripper.feed(html)
        return stripper.get_text()
    except Exception:
        text = re.sub(r'<[^>]+>', '', html)
        return re.sub(r'\s+', ' ', text).strip()


def _decode_payload(raw_bytes: bytes, cte: str, charset: str | None) -> str:
    """
    Content-Transfer-Encoding 명시 처리 후 charset fallback으로 str 반환.
    cte: 'base64' | 'quoted-printable' | '7bit' | '8bit' | 'binary'
    """
    try:
        if cte == 'base64':
            raw_bytes = base64.b64decode(raw_bytes)
        elif cte == 'quoted-printable':
            raw_bytes = quopri.decodestring(raw_bytes)
        # 7bit / 8bit / binary → 그대로 사용
    except Exception:
        pass  # CTE 디코딩 실패 시 원본 bytes 그대로

    for enc in [charset, 'utf-8', 'euc-kr', 'cp949', 'latin-1']:
        if not enc:
            continue
        try:
            return raw_bytes.decode(enc, errors='strict')
        except Exception:
            continue
    return raw_bytes.decode('latin-1', errors='replace')


def _get_body(msg: email.message.Message) -> str:
    """
    메일 메시지에서 본문 텍스트 추출.
    - multipart: text/plain 우선, 없으면 text/html (태그 제거)
    - singlepart: content-type에 따라 처리
    CTE를 명시적으로 처리 (base64 / quoted-printable).
    """
    plain: str | None = None
    html: str | None = None

    def _extract(part: email.message.Message) -> str:
        cte = (part.get('Content-Transfer-Encoding') or '').lower().strip()
        charset = part.get_content_charset()
        raw_str = part.get_payload(decode=False)
        if not raw_str or isinstance(raw_str, list):
            return ""
        raw_bytes = raw_str.encode('ascii', errors='replace')
        return _decode_payload(raw_bytes, cte, charset)

    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            if ct.startswith('multipart/'):
                continue
            cd = str(part.get_content_disposition() or '')
            if 'attachment' in cd:
                continue

            if ct == 'text/plain' and plain is None:
                plain = _extract(part)
            elif ct == 'text/html' and html is None:
                html = _extract(part)
    else:
        ct = msg.get_content_type()
        text = _extract(msg)
        if ct == 'text/html':
            html = text
        else:
            plain = text

    if plain and plain.strip():
        return plain.strip()
    if html and html.strip():
        return _strip_html(html)
    return ""


# ─── LIST 응답 파싱 ──────────────────────────────────────────────────────────

def _parse_folder_name(item: bytes) -> bytes | None:
    """
    IMAP LIST 응답 한 줄에서 폴더명 bytes 추출.
    split 우선순위: b'"/"' → b' "/" ' → rsplit 마지막 공백
    """
    if b'"/"' in item:
        return item.split(b'"/"', 1)[1].strip().strip(b'"')
    if b' "/" ' in item:
        return item.split(b' "/" ', 1)[1].strip().strip(b'"')
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

        display_name = _decode_folder_bytes(raw_name)
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
