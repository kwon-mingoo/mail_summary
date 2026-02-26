import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'mail_summary.db')


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS emails (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                folder         TEXT    NOT NULL,
                subject        TEXT    NOT NULL,
                sender         TEXT    NOT NULL,
                received_at    TEXT    NOT NULL,
                is_after_hours INTEGER NOT NULL DEFAULT 0,
                body           TEXT    NOT NULL DEFAULT ''
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS summaries (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                date        TEXT    NOT NULL,
                type        TEXT    NOT NULL,
                folder      TEXT    NOT NULL DEFAULT '전체',
                content     TEXT    NOT NULL,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
        """)
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_summaries_unique
            ON summaries (date, type, folder)
        """)
        # 기존 DB 마이그레이션: body 컬럼이 없는 경우 추가
        try:
            conn.execute("ALTER TABLE emails ADD COLUMN body TEXT NOT NULL DEFAULT ''")
        except sqlite3.OperationalError:
            pass  # 이미 존재하면 무시
        conn.commit()


def get_folders() -> list[str]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT DISTINCT folder FROM emails ORDER BY folder"
        ).fetchall()
    return [row["folder"] for row in rows]


def get_emails_by_date_folder(date: str | None, folder: str | None) -> list[dict]:
    query = "SELECT * FROM emails WHERE 1=1"
    params: list = []

    if date:
        query += " AND DATE(received_at) = ?"
        params.append(date)

    if folder and folder != '전체':
        query += " AND folder = ?"
        params.append(folder)

    query += " ORDER BY received_at DESC"

    with get_conn() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(row) for row in rows]


def get_summary(date: str, summary_type: str, folder: str) -> str | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT content FROM summaries WHERE date = ? AND type = ? AND folder = ?",
            (date, summary_type, folder)
        ).fetchone()
    return row["content"] if row else None


def save_summary(date: str, summary_type: str, folder: str, content: str):
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO summaries (date, type, folder, content)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(date, type, folder) DO UPDATE SET
                content = excluded.content,
                created_at = datetime('now', 'localtime')
        """, (date, summary_type, folder, content))
        conn.commit()


def email_exists(subject: str, sender: str, received_at: str) -> bool:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM emails WHERE subject = ? AND sender = ? AND received_at = ?",
            (subject, sender, received_at)
        ).fetchone()
    return row is not None


def save_email(
    folder: str,
    subject: str,
    sender: str,
    received_at: str,
    is_after_hours: bool,
    body: str = "",
):
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO emails (folder, subject, sender, received_at, is_after_hours, body)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (folder, subject, sender, received_at, int(is_after_hours), body))
        conn.commit()
