"""Coordinate parser publications from the webhook, operator UI and command line."""
import fcntl
import hashlib
import json
import os
import time
from pathlib import Path

from green_api import card_fingerprint


PUBLICATIONS = Path(__file__).resolve().parent / "data" / "published_cards.jsonl"


def records(line):
    # An older writer used the two characters backslash+n between JSON objects.
    # Decode each whole object first: a quoted newline inside a fingerprint is data.
    decoder = json.JSONDecoder()
    text = line.strip()
    while text:
        record, end = decoder.raw_decode(text)
        if not isinstance(record, dict) or not isinstance(record.get("fingerprint"), str):
            raise ValueError("Некорректная запись в журнале публикаций")
        yield record
        text = text[end:].lstrip()
        if text:
            if not text.startswith(r"\n"):
                raise ValueError("Неизвестный разделитель в журнале публикаций")
            text = text[2:].lstrip()


def publish_product(client, card, payload, endpoint, message_id=None):
    fingerprint = card_fingerprint(card)
    pending_dir = PUBLICATIONS.parent / "pending_publications"
    pending_dir.mkdir(parents=True, exist_ok=True)
    pending = pending_dir / hashlib.sha256(fingerprint.encode()).hexdigest()
    try:
        # Atomic across threads and processes; preserve the claim across restarts.
        with pending.open("x", encoding="utf-8") as claim:
            json.dump({"fingerprint": fingerprint, "messageId": message_id}, claim, ensure_ascii=False)
            claim.flush()
            os.fsync(claim.fileno())
    except FileExistsError:
        return {"result": "skipped", "reason": "Публикация уже начата. Проверьте товар в CRM перед повторной отправкой."}

    try:
        # a+ creates only a missing journal. I/O and parsing errors prevent the POST.
        with PUBLICATIONS.open("a+", encoding="utf-8") as journal:
            fcntl.flock(journal, fcntl.LOCK_SH)
            journal.seek(0)
            seen = any(row["fingerprint"] == fingerprint for line in journal for row in records(line))
    except Exception:
        pending.unlink()
        raise
    if seen:
        pending.unlink()
        return {"result": "skipped", "reason": "Такая карточка уже опубликована"}

    # On timeout or ambiguous server failure CRM may already have created the box.
    # Leave the claim for reconciliation instead of posting the same card again.
    response = client.create_product(payload, endpoint)
    if response.status_code not in (200, 201):
        if 400 <= response.status_code < 500 and response.status_code != 408:
            pending.unlink()
        return {"result": "failed", "status_code": response.status_code, "response_text": response.text, "payload": payload}

    try:
        body = response.json()
    except ValueError:
        body = None
    record = {"publishedAt": int(time.time()), "fingerprint": fingerprint, "messageId": message_id,
              "productId": body.get("id") if isinstance(body, dict) else None}
    with PUBLICATIONS.open("a+b") as journal:
        fcntl.flock(journal, fcntl.LOCK_EX)
        journal.seek(0, os.SEEK_END)
        if journal.tell():
            journal.seek(-1, os.SEEK_END)
            if journal.read(1) != b"\n":
                journal.write(b"\n")
        journal.write((json.dumps(record, ensure_ascii=False) + "\n").encode())
        journal.flush()
        os.fsync(journal.fileno())
    pending.unlink()
    return {"result": "ok", "response": body}
