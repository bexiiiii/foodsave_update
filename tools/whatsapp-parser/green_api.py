# -*- coding: utf-8 -*-
"""Helpers for GREEN-API WhatsApp webhooks."""
import json
import hmac
import os
import threading
import time
import unicodedata
from pathlib import Path
from urllib import error, request


TEXT_MESSAGE_TYPES = {"textMessage", "extendedTextMessage"}
MEDIA_MESSAGE_TYPES = {"imageMessage", "videoMessage", "documentMessage", "audioMessage"}
DEFAULT_ALLOWED_GROUP_NAMES = {"royalty foodsave", "foodsave pate", "coffi foodsave"}


def extract_green_api_message(payload):
    """Return a normalized message dict from a GREEN-API webhook payload.

    The exact nested field differs by WhatsApp message type, so this function is
    deliberately tolerant. Unknown notification types return text=None.
    """
    message_data = payload.get("messageData") or {}
    sender_data = payload.get("senderData") or {}
    type_message = message_data.get("typeMessage")

    text = None
    caption = None
    media = None

    if type_message == "textMessage":
        text = (message_data.get("textMessageData") or {}).get("textMessage")
    elif type_message == "extendedTextMessage":
        extended = message_data.get("extendedTextMessageData") or {}
        text = extended.get("text") or extended.get("description")
    elif type_message in MEDIA_MESSAGE_TYPES:
        media_key = {
            "imageMessage": "imageMessageData",
            "videoMessage": "videoMessageData",
            "documentMessage": "documentMessageData",
            "audioMessage": "audioMessageData",
        }.get(type_message)
        media_data = message_data.get(media_key) or message_data.get("fileMessageData") or {}
        caption = media_data.get("caption")
        text = caption
        media = {
            "type": type_message,
            "downloadUrl": media_data.get("downloadUrl"),
            "fileName": media_data.get("fileName"),
            "mimeType": media_data.get("mimeType"),
            "caption": caption,
        }

    return {
        "typeWebhook": payload.get("typeWebhook"),
        "idMessage": payload.get("idMessage"),
        "timestamp": payload.get("timestamp"),
        "chatId": sender_data.get("chatId"),
        "chatName": sender_data.get("chatName"),
        "sender": sender_data.get("sender"),
        "senderName": sender_data.get("senderName"),
        "typeMessage": type_message,
        "text": (text or "").strip() or None,
        "media": media,
        "raw": payload,
    }


def verify_webhook_token(headers, query_params, config):
    expected = ((config.get("green_api") or {}).get("webhook_token") or "").strip()
    if not expected or expected.lower() in {"change_me", "change_me_locally", "set_a_long_random_token"}:
        return False

    candidates = [
        headers.get("Authorization", "").replace("Bearer ", "", 1).strip(),
        headers.get("X-Green-Api-Token", "").strip(),
        query_params.get("token", [""])[0].strip(),
        query_params.get("webhookUrlToken", [""])[0].strip(),
    ]
    return any(hmac.compare_digest(candidate.encode("utf-8"), expected.encode("utf-8")) for candidate in candidates)


def normalize_group_name(value):
    decomposed = unicodedata.normalize("NFKD", (value or "").strip().lower())
    without_diacritics = "".join(char for char in decomposed if not unicodedata.combining(char))
    return " ".join(without_diacritics.split())


def allowed_group_names(config):
    green_cfg = config.get("green_api") or {}
    names = green_cfg.get("allowed_group_names")
    if not names:
        names = sorted(DEFAULT_ALLOWED_GROUP_NAMES)
    return {normalize_group_name(name) for name in names if normalize_group_name(name)}


def allowed_group_chat_ids(config):
    green_cfg = config.get("green_api") or {}
    values = green_cfg.get("allowed_group_chat_ids", [])
    if not isinstance(values, list):
        return set()
    return {str(chat_id).strip() for chat_id in values if str(chat_id).strip()}


def group_defaults_for_message(config, chat_name):
    """Resolve routing defaults by fixed WhatsApp group ID, never its mutable title."""
    green_cfg = config.get("green_api") or {}
    defaults = green_cfg.get("group_defaults_by_chat_id") or {}
    chat_id = str(chat_name or "").strip()
    value = defaults.get(chat_id)
    return value if isinstance(value, dict) else {}


def is_allowed_group_message(message, config):
    if message.get("typeWebhook") != "incomingMessageReceived":
        return False, f"ignored webhook type: {message.get('typeWebhook')}"

    chat_id = message.get("chatId") or ""
    chat_name = normalize_group_name(message.get("chatName"))
    if not chat_id.endswith("@g.us"):
        return False, "not a group chat"

    chat_ids = allowed_group_chat_ids(config)
    if chat_ids and chat_id in chat_ids:
        return True, "chatId allowed"
    if not chat_ids:
        return False, "allowed group chat IDs are not configured"

    return False, f"group not allowed: {message.get('chatName') or chat_id}"


def green_api_send_config(config):
    green_cfg = config.get("green_api") or {}
    api_url = (green_cfg.get("api_url") or "https://api.green-api.com").rstrip("/")
    id_instance = str(green_cfg.get("id_instance") or "").strip()
    api_token = str(green_cfg.get("api_token_instance") or "").strip()
    return api_url, id_instance, api_token


def can_send_green_api_message(config):
    _, id_instance, api_token = green_api_send_config(config)
    return bool(id_instance and api_token)


def send_green_api_message(config, chat_id, message):
    api_url, id_instance, api_token = green_api_send_config(config)
    if not id_instance or not api_token:
        return {"sent": False, "reason": "green_api credentials are not configured"}
    if not chat_id:
        return {"sent": False, "reason": "chatId is empty"}

    url = f"{api_url}/waInstance{id_instance}/sendMessage/{api_token}"
    body = json.dumps({"chatId": chat_id, "message": message}, ensure_ascii=False).encode("utf-8")
    req = request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with request.urlopen(req, timeout=15) as response:
            raw = response.read().decode("utf-8")
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                payload = {"raw": raw}
            return {"sent": True, "status": response.status, "response": payload}
    except error.HTTPError as exc:
        return {"sent": False, "status": exc.code, "error": exc.read().decode("utf-8", errors="replace")}
    except OSError as exc:
        return {"sent": False, "error": str(exc)}


def build_publication_reply(parse_summary, upload_report, auto_upload):
    parse_summary = parse_summary or {}
    upload_summary = (upload_report or {}).get("summary") or {}
    if not auto_upload:
        return (
            "✅ Сообщение разобрано в тестовом режиме.\n"
            f"Найдено боксов: {parse_summary.get('total', 0)}\n"
            f"Готово к публикации: {parse_summary.get('ok', 0)}\n"
            f"На проверку: {parse_summary.get('review', 0)}"
        )

    ok = upload_summary.get("ok", 0)
    skipped = upload_summary.get("skipped", 0)
    failed = upload_summary.get("failed", 0)
    total = parse_summary.get("total", upload_summary.get("total", 0))
    review = parse_summary.get("review", 0)
    lines = [
        "✅ Боксы обработаны.",
        f"Опубликовано: {ok} из {total}",
    ]
    if review:
        lines.append(f"На ручной проверке: {review}")
    if skipped:
        lines.append(f"Не опубликовано: {skipped}")
    if failed:
        lines.append(f"Ошибки: {failed}")
    if ok == total and total and not review and not skipped and not failed:
        lines.append("Все боксы опубликованы.")
    return "\n".join(lines)


class WebhookStore:
    _claims = set()
    _claims_lock = threading.Lock()
    _append_lock = threading.Lock()
    RETENTION_SECONDS = 90 * 24 * 60 * 60

    @staticmethod
    def _safe_log_value(value, key=None):
        private_keys = {
            "text", "raw", "media", "downloadUrl", "caption", "rawLine", "rawLine_name",
            "messageText", "message_text", "chatId", "senderName",
        }
        if key in private_keys:
            return None
        if key == "error":
            return "processing error"
        if isinstance(value, dict):
            safe = {}
            for child_key, child_value in value.items():
                child = WebhookStore._safe_log_value(child_value, child_key)
                if child is not None:
                    safe[child_key] = child
            return safe
        if isinstance(value, list):
            return [
                child for entry in value
                if (child := WebhookStore._safe_log_value(entry, key)) is not None
            ]
        if isinstance(value, str) and value.lower().startswith(("http://", "https://")):
            return None
        return value

    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.touch(mode=0o600)
        os.chmod(self.path, 0o600)

    def seen(self, id_message):
        if not id_message or not self.path.exists():
            return False
        needle = f'"idMessage": "{id_message}"'
        try:
            with self.path.open(encoding="utf-8") as f:
                return any(needle in line for line in f)
        except OSError:
            return False

    def claim(self, id_message):
        """Atomically claim an incoming message for processing in this server."""
        if not id_message:
            return True
        key = (str(self.path.resolve()), id_message)
        with self._claims_lock:
            if key in self._claims or self.seen(id_message):
                return False
            self._claims.add(key)
            return True

    def release(self, id_message):
        if id_message:
            key = (str(self.path.resolve()), id_message)
            with self._claims_lock:
                self._claims.discard(key)

    def append(self, event):
        record = self._safe_log_value({**event, "receivedAt": int(time.time())})
        with self._append_lock:
            self._prune_expired_locked()
            with self.path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")

    def _prune_expired_locked(self):
        if not self.path.exists():
            return
        cutoff = int(time.time()) - self.RETENTION_SECONDS
        retained = []
        try:
            with self.path.open(encoding="utf-8") as stream:
                for line in stream:
                    try:
                        event = json.loads(line)
                        received_at = int(event.get("receivedAt", 0))
                    except (ValueError, TypeError, json.JSONDecodeError):
                        continue
                    if received_at >= cutoff:
                        retained.append(json.dumps(event, ensure_ascii=False) + "\n")
            temp_path = self.path.with_name(self.path.name + ".tmp")
            flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
            if hasattr(os, "O_NOFOLLOW"):
                flags |= os.O_NOFOLLOW
            descriptor = os.open(temp_path, flags, 0o600)
            try:
                with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
                    stream.writelines(retained)
                os.chmod(temp_path, 0o600)
                os.replace(temp_path, self.path)
            except Exception:
                try:
                    os.close(descriptor)
                except OSError:
                    pass
                try:
                    temp_path.unlink()
                except OSError:
                    pass
                raise
        except OSError:
            # Preserve webhook handling if log pruning is blocked by filesystem permissions.
            return


def card_fingerprint(card):
    """Return a stable signature for one CRM product, excluding parser-only fields."""
    fields = (
        "storeId", "storeName", "categoryId", "categoryName", "name", "description",
        "price", "originalPrice", "discountPercentage", "stockQuantity", "images",
        "expiryDate", "status",
    )
    data = {field: card.get(field) for field in fields}
    return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def deduplicate_cards(cards):
    """Keep the first of byte-for-byte equivalent product cards in one publication."""
    unique_cards = []
    duplicate_cards = []
    seen = set()
    for card in cards:
        if card.get("error"):
            unique_cards.append(card)
            continue
        fingerprint = card_fingerprint(card)
        if fingerprint in seen:
            duplicate_cards.append(card)
            continue
        seen.add(fingerprint)
        unique_cards.append(card)
    return unique_cards, duplicate_cards


def duplicate_card_indexes(cards):
    """Return repeated positions without deleting them from the moderation record."""
    seen = set()
    duplicates = set()
    for index, card in enumerate(cards):
        if not isinstance(card, dict) or card.get("error"):
            continue
        fingerprint = card_fingerprint(card)
        if fingerprint in seen:
            duplicates.add(index)
        else:
            seen.add(fingerprint)
    return duplicates
