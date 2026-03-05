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

# 폴더별 마지막으로 처리한 최대 UID (서버 재시작 시 초기화 → 첫 수집은 전체 30일치)
_last_uid: dict[str, int] = {}

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
    global _last_uid

    if not DAUM_EMAIL or not DAUM_PASSWORD:
        print("[IMAP] 환경변수 DAUM_EMAIL / DAUM_PASSWORD 미설정 — 수집 건너뜀")
        return {"saved": 0, "skipped": 0}

    start_kst = datetime.now(KST)
    print(f"[IMAP] {start_kst.strftime('%H:%M:%S')} 수집 시작")

    # ── 로그인
    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
        mail.login(DAUM_EMAIL, DAUM_PASSWORD)
    except Exception as e:
        print(f"[IMAP] 로그인 실패: {e}")
        return {"saved": 0, "skipped": 0}

    since_date = _since_date_str(30)

    try:
        # ── 폴더 목록
        _, folder_list = mail.list()
        if not folder_list:
            print("[IMAP] 폴더 목록이 비어 있습니다.")
            return {"saved": 0, "skipped": 0}

        folders = _parse_list_response(folder_list)
        print(f"[IMAP] 전체 폴더 수: {len(folders)}")

        total_saved = 0
        total_skipped = 0
        for raw_name, display_name in folders:
            try:
                # ── 폴더 선택 (원본 bytes 그대로 사용, readonly=True 로 읽음 상태 변경 없음)
                select_arg = b'"' + raw_name + b'"'
                status, select_data = mail.select(select_arg, readonly=True)
                if status != "OK":
                    print(f"[IMAP] SELECT 실패 ({display_name!r}): status={status}, data={select_data}")
                    continue

                # ── SINCE 조건으로 신규 UID 검색 (조건을 별도 인자로 분리 → IMAP 서버 파싱 안정성)
                last = _last_uid.get(display_name, 0)
                if last > 0:
                    _, data_since = mail.uid('search', None,
                                            f'SINCE {since_date}',
                                            f'UID {last + 1}:*')
                else:
                    _, data_since = mail.uid('search', None,
                                            f'SINCE {since_date}')

                uids_since = set(data_since[0].split()) if data_since and data_since[0] else set()

                # ── UNSEEN 메일 별도 검색 (날짜 무관, 안 읽은 메일 누락 방지)
                _, data_unseen = mail.uid('search', None, 'UNSEEN')
                uids_unseen = set(data_unseen[0].split()) if data_unseen and data_unseen[0] else set()

                # ── 합산 후 UID 오름차순 정렬
                uid_list = sorted(
                    uids_since | uids_unseen,
                    key=lambda x: int(x.decode('ascii'))
                )

                if not uid_list:
                    print(f"[IMAP] '{display_name}' — 신규 없음")
                    continue

                print(f"[IMAP] '{display_name}' — "
                      f"SINCE {len(uids_since)}건 + UNSEEN {len(uids_unseen)}건 "
                      f"= 총 {len(uid_list)}건")

                # ── 최대 UID 업데이트는 SINCE 기준으로만 (다음 수집에서 이 UID 이후만 검색)
                if uids_since:
                    _last_uid[display_name] = max(int(u.decode('ascii')) for u in uids_since)

                folder_saved = 0
                folder_skipped = 0
                for uid in uid_list:
                    uid_bytes = uid if isinstance(uid, bytes) else str(uid).encode()
                    # 1단계: 헤더만 fetch → subject/sender/received_at 파싱
                    _, hdr_data = mail.uid('fetch', uid_bytes, '(RFC822.HEADER)')
                    if not hdr_data or not hdr_data[0]:
                        continue
                    raw_hdr = hdr_data[0][1] if isinstance(hdr_data[0], tuple) else hdr_data[0]
                    if not raw_hdr:
                        continue

                    hdr_msg = email.message_from_bytes(raw_hdr)
                    subject = _decode_header(hdr_msg.get("Subject", "(제목없음)"))
                    sender = _decode_header(hdr_msg.get("From", "(발신자없음)"))
                    dt = _parse_received_at(hdr_msg)
                    received_at = dt.strftime("%Y-%m-%dT%H:%M:%S")
                    after_hours = _is_after_hours(dt)

                    # 2단계: 중복 확인 — 중복이면 전문 다운로드 생략
                    if email_exists(subject, sender, received_at):
                        folder_skipped += 1
                        continue

                    # 3단계: 새 메일만 RFC822 전문 fetch → 본문 추출
                    _, msg_data = mail.uid('fetch', uid_bytes, '(RFC822)')
                    if not msg_data or not msg_data[0]:
                        continue
                    raw = msg_data[0][1] if isinstance(msg_data[0], tuple) else msg_data[0]
                    if not raw:
                        continue

                    body = _get_body(email.message_from_bytes(raw))[:10_000]

                    save_email(display_name, subject, sender, received_at, after_hours, body)
                    folder_saved += 1
                    total_saved += 1

                print(f"[IMAP] '{display_name}' — 신규 {folder_saved}건 / 중복 {folder_skipped}건 스킵")
                total_skipped += folder_skipped

            except Exception as e:
                print(f"[IMAP] 폴더 '{display_name}' 처리 오류: {type(e).__name__}: {e}")
                continue

        end_kst = datetime.now(KST)
        print(f"[IMAP] {end_kst.strftime('%H:%M:%S')} 수집 완료 — 총 신규 {total_saved}건")
        return {"saved": total_saved, "skipped": total_skipped}

    finally:
        try:
            mail.logout()
        except Exception:
            pass