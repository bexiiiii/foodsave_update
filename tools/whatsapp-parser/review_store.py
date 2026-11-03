"""Durable, idempotent storage for parser moderation items."""
import hashlib
import json
import math
import os
import sqlite3
from pathlib import Path
from green_api import card_fingerprint


class _ClosingConnection(sqlite3.Connection):
    def __exit__(self, exc_type, exc_value, traceback):
        try:
            return super().__exit__(exc_type, exc_value, traceback)
        finally:
            self.close()


class ReviewStore:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.touch(mode=0o600)
        os.chmod(self.path, 0o600)
        with self._connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS review_items (
                    review_id TEXT PRIMARY KEY,
                    source_message_id TEXT NOT NULL,
                    item_index INTEGER NOT NULL,
                    chat_name TEXT,
                    message_text TEXT,
                    item_json TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'PENDING',
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(source_message_id, item_index)
                );
                CREATE TABLE IF NOT EXISTS review_actions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    review_id TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    action TEXT NOT NULL,
                    before_json TEXT,
                    after_json TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS publication_attempts (
                    fingerprint TEXT NOT NULL,
                    review_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY(fingerprint, review_id)
                );
                CREATE INDEX IF NOT EXISTS publication_attempts_fingerprint_status
                    ON publication_attempts(fingerprint, status);
            """)
        self.redact_old_messages()

    def _connect(self):
        db = sqlite3.connect(self.path, timeout=10, factory=_ClosingConnection)
        db.row_factory = sqlite3.Row
        return db

    @staticmethod
    def make_id(message_id, index, item):
        seed = f"{message_id}:{index}:{item.get('rawLine') or item.get('rawLine_name') or item.get('name') or ''}"
        return hashlib.sha256(seed.encode()).hexdigest()[:32]

    def add(self, message_id, index, chat_name, message_text, item):
        message_id = str(message_id or "manual")
        review_id = self.make_id(message_id, index, item)
        with self._connect() as db:
            db.execute("""INSERT OR IGNORE INTO review_items
                (review_id, source_message_id, item_index, chat_name, message_text, item_json)
                VALUES (?, ?, ?, ?, ?, ?)""",
                (review_id, message_id, index, chat_name, message_text,
                 json.dumps(item, ensure_ascii=False)))
        return review_id

    def list_pending(self):
        with self._connect() as db:
            rows = db.execute("SELECT * FROM review_items WHERE status NOT IN ('PUBLISHED','REJECTED') ORDER BY created_at DESC, review_id").fetchall()
        return [self._serialize(row) for row in rows]

    def get(self, review_id):
        with self._connect() as db:
            row = db.execute("SELECT * FROM review_items WHERE review_id=?", (review_id,)).fetchone()
        return self._serialize(row) if row else None

    @staticmethod
    def _publication_fingerprint(item):
        return hashlib.sha256(card_fingerprint(item).encode("utf-8")).hexdigest()

    def find_duplicate_publication(self, item, excluding_review_id=None):
        fingerprint = self._publication_fingerprint(item)
        with self._connect() as db:
            row = db.execute(
                """SELECT review_id FROM publication_attempts
                   WHERE fingerprint=? AND review_id!=?
                     AND status IN ('PUBLISHING','PUBLISHED','PUBLISH_UNKNOWN')
                   ORDER BY updated_at DESC LIMIT 1""",
                (fingerprint, str(excluding_review_id or "")),
            ).fetchone()
        return row["review_id"] if row else None

    @staticmethod
    def _serialize(row):
        return {"reviewId": row["review_id"], "sourceMessageId": row["source_message_id"],
                "itemIndex": row["item_index"], "chatName": row["chat_name"],
                "messageText": row["message_text"], "item": json.loads(row["item_json"]),
                "status": row["status"], "createdAt": row["created_at"]}

    @staticmethod
    def _redact_json_text(value):
        if not value:
            return value
        try:
            payload = json.loads(value)
        except (TypeError, json.JSONDecodeError):
            return value

        def clean(node):
            if isinstance(node, dict):
                result = {}
                for key, child in node.items():
                    if key in {"rawLine", "rawLine_name", "messageText", "message_text", "raw", "media", "downloadUrl"}:
                        continue
                    cleaned = clean(child)
                    if cleaned is not None:
                        result[key] = cleaned
                return result
            if isinstance(node, list):
                return [
                    clean(child) for child in node
                    if not (isinstance(child, str) and child.lower().startswith(("http://", "https://")))
                ]
            if isinstance(node, str) and node.lower().startswith(("http://", "https://")):
                return None
            return node

        return json.dumps(clean(payload), ensure_ascii=False)

    def update(self, review_id, item, actor="admin"):
        with self._connect() as db:
            row = db.execute("SELECT item_json FROM review_items WHERE review_id=?", (review_id,)).fetchone()
            if not row:
                return False
            before = row[0]
            after = json.dumps(item, ensure_ascii=False)
            cursor = db.execute("UPDATE review_items SET item_json=?, status='PENDING', updated_at=CURRENT_TIMESTAMP WHERE review_id=? AND status IN ('PENDING','SNOOZED')", (after, review_id))
            if cursor.rowcount != 1:
                return False
            db.execute("INSERT INTO review_actions(review_id,actor,action,before_json,after_json) VALUES(?,?,?,?,?)",
                       (review_id, actor, "edit", before, after))
        return True

    def resolve(self, review_id, status, actor="admin"):
        if status not in {"PUBLISHED", "REJECTED", "SNOOZED", "PUBLISH_UNKNOWN"}:
            raise ValueError("invalid review status")
        with self._connect() as db:
            row = db.execute("SELECT item_json,status FROM review_items WHERE review_id=?", (review_id,)).fetchone()
            if not row:
                return False
            allowed_sources = {
                "PUBLISHED": {"PUBLISHING"},
                "PUBLISH_UNKNOWN": {"PUBLISHING"},
                "REJECTED": {"PENDING", "SNOOZED"},
                "SNOOZED": {"PENDING"},
            }
            if row["status"] not in allowed_sources[status]:
                return False
            cursor = db.execute(
                "UPDATE review_items SET status=?,updated_at=CURRENT_TIMESTAMP WHERE review_id=? AND status=?",
                (status, review_id, row["status"]),
            )
            if cursor.rowcount != 1:
                return False
            if status in {"PUBLISHED", "PUBLISH_UNKNOWN"}:
                db.execute(
                    "UPDATE publication_attempts SET status=?,updated_at=CURRENT_TIMESTAMP WHERE review_id=? AND status='PUBLISHING'",
                    (status, review_id),
                )
            db.execute("INSERT INTO review_actions(review_id,actor,action,before_json,after_json) VALUES(?,?,?,?,?)",
                       (review_id, actor, status.lower(), row[0], row[0]))
        return True

    def claim_publish(self, review_id, allow_duplicate=False, actor="admin"):
        """Atomically claim an approved item and return its current persisted version."""
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT * FROM review_items WHERE review_id=?", (review_id,)).fetchone()
            if not row or row["status"] not in {"PENDING", "SNOOZED"}:
                return None
            item = json.loads(row["item_json"])
            price = item.get("price")
            original = item.get("originalPrice")
            quantity = item.get("stockQuantity", 1)
            photo_publishable = bool(item.get("images")) and not (
                (item.get("photoIsFallback") or item.get("photoNeedsReview"))
                and item.get("photoFallbackConfirmed") is not True
            )
            numbers_valid = all(
                isinstance(value, (int, float)) and not isinstance(value, bool)
                and math.isfinite(value) and 1 <= value <= limit
                for value, limit in ((price, 1_000_000), (original, 1_000_000), (quantity, 1000))
            )
            if (
                item.get("reviewApproved") is not True
                or item.get("needsReview") is not False
                or item.get("error")
                or item.get("reviewReasons")
                or not numbers_valid
                or price > original
                or not photo_publishable
            ):
                return None
            fingerprint = self._publication_fingerprint(item)
            duplicate = db.execute(
                """SELECT review_id FROM publication_attempts
                   WHERE fingerprint=? AND review_id!=?
                     AND status IN ('PUBLISHING','PUBLISHED','PUBLISH_UNKNOWN')
                   LIMIT 1""",
                (fingerprint, review_id),
            ).fetchone()
            if duplicate and not allow_duplicate:
                return None
            cursor = db.execute(
                "UPDATE review_items SET status='PUBLISHING',updated_at=CURRENT_TIMESTAMP WHERE review_id=? AND status=?",
                (review_id, row["status"]),
            )
            if cursor.rowcount != 1:
                return None
            db.execute(
                "INSERT INTO publication_attempts(fingerprint,review_id,status) VALUES(?,?,'PUBLISHING')",
                (fingerprint, review_id),
            )
            if duplicate:
                db.execute(
                    "INSERT INTO review_actions(review_id,actor,action,before_json,after_json) VALUES(?,?,?,?,?)",
                    (review_id, actor, "publish_duplicate_override", row["item_json"], row["item_json"]),
                )
            claimed = db.execute("SELECT * FROM review_items WHERE review_id=?", (review_id,)).fetchone()
            return self._serialize(claimed)

    def release_publish_claim(self, review_id, actor="system", reason="local validation failed"):
        """Return a claim to review only when no CRM request has been made."""
        with self._connect() as db:
            row = db.execute("SELECT item_json FROM review_items WHERE review_id=? AND status='PUBLISHING'", (review_id,)).fetchone()
            if not row:
                return False
            cursor = db.execute(
                "UPDATE review_items SET status='PENDING',updated_at=CURRENT_TIMESTAMP WHERE review_id=? AND status='PUBLISHING'",
                (review_id,),
            )
            if cursor.rowcount != 1:
                return False
            db.execute("DELETE FROM publication_attempts WHERE review_id=? AND status='PUBLISHING'", (review_id,))
            db.execute("INSERT INTO review_actions(review_id,actor,action,before_json,after_json) VALUES(?,?,?,?,?)",
                       (review_id, actor, "release_publish_claim", row[0], json.dumps({"reason": reason}, ensure_ascii=False)))
        return True

    def reconcile(self, review_id, status, actor="admin"):
        """Record an explicit CRM check after an ambiguous publication outcome."""
        if status not in {"PUBLISHED", "PENDING"}:
            raise ValueError("invalid reconciliation status")
        with self._connect() as db:
            row = db.execute("SELECT item_json,status FROM review_items WHERE review_id=?", (review_id,)).fetchone()
            if not row or row["status"] != "PUBLISH_UNKNOWN":
                return False
            before = row["status"]
            cursor = db.execute(
                "UPDATE review_items SET status=?,updated_at=CURRENT_TIMESTAMP WHERE review_id=? AND status=?",
                (status, review_id, before),
            )
            if cursor.rowcount != 1:
                return False
            if status == "PUBLISHED":
                db.execute(
                    "UPDATE publication_attempts SET status='PUBLISHED',updated_at=CURRENT_TIMESTAMP WHERE review_id=? AND status='PUBLISH_UNKNOWN'",
                    (review_id,),
                )
            else:
                db.execute("DELETE FROM publication_attempts WHERE review_id=? AND status='PUBLISH_UNKNOWN'", (review_id,))
            db.execute("INSERT INTO review_actions(review_id,actor,action,before_json,after_json) VALUES(?,?,?,?,?)",
                       (review_id, actor, f"reconcile_{status.lower()}", row[0], row[0]))
        return True

    def recover_orphaned_publishes(self, min_age_seconds=600):
        """Move stale CRM claims to manual reconciliation; never retry on recovery."""
        min_age_seconds = max(1, int(min_age_seconds))
        stale_clause = "updated_at <= datetime('now', ?)"
        stale_age = f"-{min_age_seconds} seconds"
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            rows = db.execute(
                f"SELECT review_id,item_json FROM review_items WHERE status='PUBLISHING' AND {stale_clause}",
                (stale_age,),
            ).fetchall()
            if not rows:
                return 0
            db.execute(
                f"UPDATE review_items SET status='PUBLISH_UNKNOWN',updated_at=CURRENT_TIMESTAMP WHERE status='PUBLISHING' AND {stale_clause}",
                (stale_age,),
            )
            db.execute(
                f"UPDATE publication_attempts SET status='PUBLISH_UNKNOWN',updated_at=CURRENT_TIMESTAMP WHERE status='PUBLISHING' AND updated_at <= datetime('now', ?)",
                (stale_age,),
            )
            for row in rows:
                db.execute(
                    "INSERT INTO review_actions(review_id,actor,action,before_json,after_json) VALUES(?,?,?,?,?)",
                    (row["review_id"], "system", "recover_interrupted_publish", row["item_json"], row["item_json"]),
                )
            return len(rows)

    def redact_old_messages(self, days=90):
        """Expire source content and resolved card details while keeping active reviews and hash guards."""
        days = max(1, int(days))
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            rows = db.execute(
                "SELECT review_id,item_json,source_message_id,status FROM review_items WHERE created_at <= datetime('now', ?)",
                (f"-{days} days",),
            ).fetchall()
            for row in rows:
                redacted = "{}" if row["status"] in {"PUBLISHED", "REJECTED"} else self._redact_json_text(row["item_json"])
                db.execute(
                    "UPDATE review_items SET message_text=NULL,item_json=?,chat_name=NULL,source_message_id=? WHERE review_id=?",
                    (redacted,
                     row["source_message_id"] if str(row["source_message_id"]).startswith("retained:")
                     else "retained:" + hashlib.sha256(str(row["source_message_id"]).encode("utf-8")).hexdigest(),
                     row["review_id"]),
                )
                actions = db.execute(
                    "SELECT id FROM review_actions WHERE review_id=?",
                    (row["review_id"],),
                ).fetchall()
                for action in actions:
                    db.execute(
                        "UPDATE review_actions SET actor='retained',before_json=NULL,after_json=NULL WHERE id=?",
                        (action["id"],),
                    )
            return len(rows)
