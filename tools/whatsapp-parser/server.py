# -*- coding: utf-8 -*-
"""Local web UI for parsing Pâté WhatsApp messages."""
import json
import hashlib
import hmac
import math
import mimetypes
import uuid
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from green_api import (
    WebhookStore,
    build_publication_reply,
    deduplicate_cards,
    duplicate_card_indexes,
    extract_green_api_message,
    group_defaults_for_message,
    is_allowed_group_message,
    normalize_group_name,
    send_green_api_message,
    verify_webhook_token,
)
from parse_daily import available_image_reference, process
from review_store import ReviewStore
from upload_to_crm import CrmClient, resolve_store_id


ROOT = Path(__file__).resolve().parent
WEB_DIR = ROOT / "web"
CATALOG_PATH = ROOT / "catalog_paste.json"
CONFIG_PATH = ROOT / "config.json"
DATA_DIR = ROOT / "data"
WEBHOOK_LOG_PATH = DATA_DIR / "green_api_events.jsonl"
REVIEW_DB_PATH = DATA_DIR / "review_queue.sqlite3"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000
MAX_REQUEST_BYTES = 512 * 1024


def load_catalog():
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_config():
    if not CONFIG_PATH.exists():
        raise FileNotFoundError("config.json не найден. Скопируй config.example.json в config.json и впиши CRM-доступы.")
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


CATALOG = load_catalog()
DEFAULT_IMAGES = {"pate": "pate/default.jpg"}


def apply_scope_default_image(items, scope):
    default_image = available_image_reference(DEFAULT_IMAGES.get(scope))
    if not default_image:
        return items
    for item in items:
        if not item.get("images"):
            item["images"] = [default_image]
            item["photoNeedsReview"] = True
            item["photoIsFallback"] = True
            item["photoReviewReason"] = "Используется общее фото заведения"
            item["needsReview"] = True
            reasons = item.setdefault("reviewReasons", [])
            reasons[:] = [reason for reason in reasons if reason != "Нет доступного фото позиции"]
            if "общее фото требует проверки" not in reasons:
                reasons.append("общее фото требует проверки")
            item["reviewApproved"] = False
    return items


def load_webhook_events(limit=100):
    if not WEBHOOK_LOG_PATH.exists():
        return []
    with WEBHOOK_LOG_PATH.open(encoding="utf-8") as stream:
        tail = deque(stream, maxlen=max(1, min(500, int(limit))))
    events = []
    for line in reversed(tail):
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return events


def catalog_entry_scope(entry):
    scopes = {
        str(size.get("image", "")).split("/", 1)[0].lower()
        for size in (entry.get("sizes") or {}).values()
        if "/" in str(size.get("image", ""))
    }
    scopes.intersection_update({"pate", "coffi", "royalty"})
    if len(scopes) > 1:
        return None
    return next(iter(scopes)) if scopes else "pate"


def catalog_for_scope(catalog, scope):
    if scope not in {"pate", "coffi", "royalty"}:
        return []
    return [entry for entry in catalog if catalog_entry_scope(entry) == scope]


def resolve_catalog_scope(config=None, source=None, raw_text=None):
    green_cfg = (config or {}).get("green_api") or {}
    defaults = green_cfg.get("group_defaults") or {}
    normalized_source = normalize_group_name(source or "")
    for group_name, values in defaults.items():
        if normalize_group_name(group_name) == normalized_source:
            scope = (values or {}).get("catalog_scope")
            if scope in {"pate", "coffi", "royalty"}:
                return scope
    context = normalize_group_name(source or raw_text or "").replace("ё", "е")
    if "pate" in context or "пате" in context:
        return "pate"
    if "coffi" in context or "кофи" in context:
        return "coffi"
    if "royalty" in context or "республика" in context:
        return "royalty"
    return None


def _valid_number(value, maximum):
    return (
        isinstance(value, (int, float)) and not isinstance(value, bool)
        and math.isfinite(value) and 1 <= value <= maximum
    )


def prepare_review_item(original, submitted, catalog=CATALOG):
    """Apply only moderator-editable fields; derive venue/catalog fields server-side."""
    if not isinstance(original, dict) or not isinstance(submitted, dict):
        raise ValueError("review item is invalid")
    item = dict(original)
    for field in ("name", "description", "price", "originalPrice", "stockQuantity",
                  "matchedCanonical", "sizeDetected"):
        if field in submitted:
            item[field] = submitted[field]

    item["name"] = str(item.get("name") or "").strip()
    if not item["name"]:
        raise ValueError("name is required")
    if not _valid_number(item.get("price"), 1_000_000):
        raise ValueError("invalid price")
    if not _valid_number(item.get("originalPrice"), 1_000_000):
        raise ValueError("invalid originalPrice")
    if not _valid_number(item.get("stockQuantity", 1), 1000) or int(item.get("stockQuantity", 1)) != item.get("stockQuantity", 1):
        raise ValueError("invalid stockQuantity")

    canonical = item.get("matchedCanonical")
    selected = next((entry for entry in catalog if entry.get("canonical") == canonical), None)
    if canonical and not selected:
        raise ValueError("catalog item is not recognized")

    scope = original.get("catalogScope")
    if scope not in {"pate", "coffi", "royalty"}:
        scope = None
    if scope:
        item["catalogScope"] = scope
    is_pate = scope == "pate"
    if is_pate:
        if not selected:
            raise ValueError("select a catalog item before approval")
        if not is_pate_catalog_item(selected):
            raise ValueError("catalog item is not available for Pate")
        sizes = selected.get("sizes") or {}
        variant = item.get("sizeDetected")
        size = sizes.get(variant)
        if not size:
            raise ValueError("select a valid catalog variant")
        item["originalPrice"] = size.get("price")
        if not _valid_number(item["originalPrice"], 1_000_000):
            raise ValueError("catalog variant has no valid price")
        item["matchedCanonical"] = selected["canonical"]
        item["name"] = f"{selected['canonical']} ({variant})"
        item["description"] = " ".join(filter(None, [selected.get("description"), size.get("detail")]))
        exact_image = available_image_reference(size.get("image"))
        if exact_image:
            item["images"] = [exact_image]
            item["photoIsFallback"] = False
            item["photoNeedsReview"] = False
            item["photoReviewReason"] = ""
        else:
            fallback_image = available_image_reference(DEFAULT_IMAGES.get("pate"))
            item["images"] = [fallback_image] if fallback_image else []
            item["photoIsFallback"] = bool(fallback_image)
            item["photoNeedsReview"] = True
            item["photoReviewReason"] = "Используется общее фото заведения" if fallback_image else "Нет доступного фото"
    else:
        item["matchedCanonical"] = None
        if item["name"] != str(original.get("name") or ""):
            item["images"] = []
            item["photoNeedsReview"] = True
            item["photoReviewReason"] = "Название изменено, фото не подтверждено"

    if item["price"] > item["originalPrice"]:
        raise ValueError("sale price exceeds original price")
    item["discountPercentage"] = round((1 - item["price"] / item["originalPrice"]) * 100)
    if item.get("photoIsFallback") and item.get("images"):
        fallback_confirmed = submitted.get("confirmFallbackPhoto") is True
        item["photoFallbackConfirmed"] = fallback_confirmed
        if fallback_confirmed:
            item["needsReview"] = False
            item["reviewReasons"] = []
            item["reviewApproved"] = True
        else:
            item["needsReview"] = True
            item["reviewReasons"] = ["подтвердите общее фото перед публикацией"]
            item["reviewApproved"] = False
    elif not item.get("images") or item.get("photoNeedsReview"):
        item["photoFallbackConfirmed"] = False
        item["needsReview"] = True
        item["reviewReasons"] = ["для публикации нужно подтвердить фото товара"]
        item["reviewApproved"] = False
    else:
        item["photoFallbackConfirmed"] = False
        item["needsReview"] = False
        item["reviewReasons"] = []
        item["reviewApproved"] = True
    return item


def is_review_item_publishable(item, catalog=CATALOG, catalog_scope=None):
    if not isinstance(item, dict) or item.get("error") or item.get("needsReview") is not False:
        return False
    if item.get("reviewApproved") is not True or item.get("reviewReasons"):
        return False
    if not item.get("images"):
        return False
    if item.get("photoIsFallback") and item.get("photoFallbackConfirmed") is not True:
        return False
    if item.get("photoNeedsReview") and item.get("photoIsFallback") is not True:
        return False
    price, original, quantity = item.get("price"), item.get("originalPrice"), item.get("stockQuantity", 1)
    if not (_valid_number(price, 1_000_000) and _valid_number(original, 1_000_000)
            and _valid_number(quantity, 1000) and int(quantity) == quantity and price <= original):
        return False
    scope = catalog_scope or item.get("catalogScope")
    if scope not in {"pate", "coffi", "royalty"}:
        return False
    selected = next((entry for entry in catalog if entry.get("canonical") == item.get("matchedCanonical")), None)
    if item.get("matchedCanonical") and (not selected or catalog_entry_scope(selected) != scope):
        return False
    if scope == "pate":
        if not selected or not is_pate_catalog_item(selected):
            return False
        variant = (selected.get("sizes") or {}).get(item.get("sizeDetected"))
        if not variant or variant.get("price") != original:
            return False
        exact_image = available_image_reference(variant.get("image"))
        fallback_image = available_image_reference(DEFAULT_IMAGES.get("pate"))
        expected_images = [exact_image] if exact_image else ([fallback_image] if fallback_image else [])
        if item.get("images", []) != expected_images:
            return False
        if bool(item.get("photoIsFallback")) != (not bool(exact_image) and bool(fallback_image)):
            return False
        if item.get("name") != f"{selected['canonical']} ({item['sizeDetected']})":
            return False
    return True


def filter_confident_items(items):
    return [item for item in items if isinstance(item, dict) and not item.get("error")
            and item.get("needsReview") is False and not item.get("photoNeedsReview")
            and not item.get("photoIsFallback")]


def is_pate_catalog_item(entry):
    return catalog_entry_scope(entry) == "pate"


def message_log_record(message):
    """Keep minimal routing metadata without persisting chat IDs or sender identity."""
    return {
        key: message.get(key)
        for key in ("idMessage", "timestamp", "chatName", "typeMessage")
        if message.get(key) is not None
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "PateParser/1.0"

    def do_HEAD(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if path == "/":
            path = "/index.html"
        if path.startswith("/images/"):
            return self.serve_file(ROOT / path.lstrip("/"), head_only=True)
        return self.serve_file(WEB_DIR / path.lstrip("/"), head_only=True)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if path == "/":
            path = "/index.html"

        if parsed.path == "/api/images":
            return self.handle_images()
        if parsed.path == "/api/admin/review-queue":
            if not self.verify_admin_access():
                return self.send_json({"error": "unauthorized"}, status=401)
            queue = ReviewStore(REVIEW_DB_PATH)
            queue.recover_orphaned_publishes()
            return self.send_json({"items": queue.list_pending()})
        if parsed.path == "/api/admin/events":
            if not self.verify_admin_access():
                return self.send_json({"error": "unauthorized"}, status=401)
            try:
                limit = min(500, max(1, int(parse_qs(parsed.query).get("limit", ["100"])[0])))
            except (TypeError, ValueError):
                return self.send_json({"error": "invalid limit"}, status=400)
            return self.send_json({"events": load_webhook_events(limit)})
        if parsed.path == "/api/admin/catalog":
            if not self.verify_admin_access():
                return self.send_json({"error": "unauthorized"}, status=401)
            return self.send_json({"items": [entry for entry in CATALOG if is_pate_catalog_item(entry)]})

        if path.startswith("/images/"):
            return self.serve_file(ROOT / path.lstrip("/"))

        return self.serve_file(WEB_DIR / path.lstrip("/"))

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path in {"/api/admin/parse", "/api/admin/publish"}:
            if not self.verify_admin_access():
                return self.send_json({"error": "unauthorized"}, status=401)
            if parsed.path.endswith("/parse"):
                return self.handle_parse()
            return self.handle_admin_publish()
        if parsed.path == "/api/parse":
            return self.handle_parse(persist=False)
        if parsed.path in {"/api/upload", "/api/boxes"}:
            if not self.verify_admin_access():
                return self.send_json({"error": "unauthorized"}, status=401)
            return self.handle_admin_publish()
        if parsed.path == "/api/green-api/webhook":
            return self.handle_green_api_webhook(parsed)
        if parsed.path.startswith("/api/admin/review-queue/"):
            if not self.verify_admin_access():
                return self.send_json({"error": "unauthorized"}, status=401)
            return self.handle_review_action(parsed.path.rsplit("/", 1)[-1])
        self.send_json({"error": "not found"}, status=404)

    def verify_admin_access(self):
        green_cfg = load_config().get("green_api") or {}
        expected = str(green_cfg.get("admin_api_token") or "").strip()
        if (not expected or expected.lower() in {"change_me", "change_me_locally", "set_a_long_random_token"}
                or expected == str(green_cfg.get("webhook_token") or "").strip()):
            return False
        supplied = self.headers.get("X-Parser-Admin-Token", "")
        return hmac.compare_digest(supplied.encode("utf-8"), expected.encode("utf-8"))

    def handle_review_action(self, action):
        try:
            payload = self.read_json()
        except (ValueError, UnicodeDecodeError) as exc:
            return self.send_json({"error": str(exc)}, status=400)
        queue = ReviewStore(REVIEW_DB_PATH)
        review_id = str(payload.get("reviewId") or "")
        actor = self.headers.get("X-Parser-Actor", "SUPER_ADMIN")[:120]
        if action == "edit":
            submitted = payload.get("item")
            if not isinstance(submitted, dict) or not review_id:
                return self.send_json({"error": "reviewId and item are required"}, status=400)
            record = queue.get(review_id)
            if not record:
                return self.send_json({"error": "review item not found"}, status=404)
            scope = record["item"].get("catalogScope")
            original = dict(record["item"])
            if scope:
                original["catalogScope"] = scope
            try:
                item = prepare_review_item(original, submitted)
            except ValueError as exc:
                return self.send_json({"error": str(exc)}, status=400)
            if not queue.update(review_id, item, actor):
                return self.send_json({"error": "item is no longer editable"}, status=409)
            return self.send_json({"updated": True})
        if action in {"reject", "snooze"}:
            status = "REJECTED" if action == "reject" else "SNOOZED"
            resolved = queue.resolve(review_id, status, actor)
            return self.send_json({"resolved": resolved}, status=200 if resolved else 409)
        if action in {"reconcile-published", "reconcile-not-published"}:
            status = "PUBLISHED" if action == "reconcile-published" else "PENDING"
            resolved = queue.reconcile(review_id, status, actor)
            return self.send_json({"reconciled": resolved}, status=200 if resolved else 409)
        if action == "publish":
            report, status = self.publish_review_id(
                queue, review_id, actor, allow_duplicate=payload.get("allowDuplicate") is True
            )
            return self.send_json(report, status=status)
        return self.send_json({"error": "unknown review action"}, status=404)

    def publish_review_id(self, queue, review_id, actor="admin", allow_duplicate=False):
        record = queue.get(review_id)
        if not record:
            return {"error": "review item not found"}, 404
        scope = record["item"].get("catalogScope")
        duplicate_id = queue.find_duplicate_publication(record["item"], excluding_review_id=review_id)
        if duplicate_id and not allow_duplicate:
            return {
                "error": "this offer was already published or has an unresolved CRM result",
                "duplicatePublication": True,
                "duplicateReviewId": duplicate_id,
            }, 409
        claimed = queue.claim_publish(review_id, allow_duplicate=allow_duplicate, actor=actor)
        if not claimed:
            duplicate_id = queue.find_duplicate_publication(record["item"], excluding_review_id=review_id)
            if duplicate_id and not allow_duplicate:
                return {
                    "error": "this offer was already published or has an unresolved CRM result",
                    "duplicatePublication": True,
                    "duplicateReviewId": duplicate_id,
                }, 409
            return {"error": "item is not approved or is already being published"}, 409
        if not scope or not is_review_item_publishable(claimed["item"], CATALOG, scope):
            queue.release_publish_claim(review_id, actor, "server validation failed")
            return {"error": "item is not ready for publication"}, 409
        try:
            report = upload_cards([claimed["item"]], dry_run=False, force=False)
        except Exception:
            queue.resolve(review_id, "PUBLISH_UNKNOWN", actor)
            return {"error": "CRM outcome is unknown; check the item before retrying"}, 502
        summary = report.get("summary") or {}
        if summary.get("ok") == 1:
            queue.resolve(review_id, "PUBLISHED", actor)
        else:
            queue.resolve(review_id, "PUBLISH_UNKNOWN", actor)
        return report, 200

    def handle_admin_publish(self):
        try:
            payload = self.read_json()
        except (ValueError, UnicodeDecodeError) as exc:
            return self.send_json({"error": str(exc)}, status=400)
        if payload.get("confirm") is not True:
            return self.send_json({"error": "publication confirmation is required"}, status=400)
        review_ids = payload.get("reviewIds")
        if not isinstance(review_ids, list) or not review_ids or len(review_ids) > 100:
            return self.send_json({"error": "reviewIds must contain 1 to 100 saved review ids"}, status=400)
        if any(not isinstance(review_id, str) or not review_id for review_id in review_ids):
            return self.send_json({"error": "invalid review id"}, status=400)
        queue = ReviewStore(REVIEW_DB_PATH)
        actor = self.headers.get("X-Parser-Actor", "SUPER_ADMIN")[:120]
        report = {"summary": {"total": 0, "ok": 0, "skipped": 0, "failed": 0, "dryRun": False}, "report": []}
        for review_id in review_ids:
            result, _status = self.publish_review_id(queue, review_id, actor)
            if "summary" in result:
                summary = result["summary"]
                for field in ("total", "ok", "skipped", "failed"):
                    report["summary"][field] += int(summary.get(field, 0) or 0)
                report["report"].extend(result.get("report") or [])
            else:
                report["summary"]["total"] += 1
                report["summary"]["skipped"] += 1
                report["report"].append({"result": "skipped", "reviewId": review_id, "reason": result.get("error", "publication failed")})
        return self.send_json(report)

    def handle_parse(self, persist=True):
        try:
            payload = self.read_json()
            raw_text = payload.get("text") or payload.get("message", "")
            if not isinstance(raw_text, str) or not raw_text.strip():
                return self.send_json({"error": "empty text"}, status=400)

            source = payload.get("source")
            if source is not None and not isinstance(source, str):
                return self.send_json({"error": "source must be a string"}, status=400)
            cfg = load_config() if persist else {}
            scope = resolve_catalog_scope(cfg, source, raw_text)
            items = process(raw_text, catalog_for_scope(CATALOG, scope))
            if scope:
                for item in items:
                    item["catalogScope"] = scope
            items = apply_scope_default_image(items, scope)
            if persist:
                source_id = "manual:" + uuid.uuid4().hex
                queue = ReviewStore(REVIEW_DB_PATH)
                for index, item in enumerate(items):
                    duplicate_id = queue.find_duplicate_publication(item)
                    if duplicate_id:
                        item["needsReview"] = True
                        item["reviewApproved"] = False
                        item.setdefault("reviewReasons", []).append("возможный повтор уже опубликованной позиции")
                        item["possibleDuplicateReviewId"] = duplicate_id
                    approved = not item.get("needsReview") and not item.get("error")
                    item["reviewApproved"] = approved
                    if approved:
                        item["reviewReasons"] = []
                    item["reviewId"] = queue.add(source_id, index, source or scope or "manual", raw_text, item)
            ok_count = sum(1 for item in items if not item.get("needsReview"))
            review_count = sum(1 for item in items if item.get("needsReview"))
            store_count = len({item.get("storeName") for item in items if item.get("storeName")})
            return self.send_json(
                {
                    "items": items,
                    "summary": {
                        "total": len(items),
                        "ok": ok_count,
                        "review": review_count,
                        "stores": store_count,
                    },
                }
            )
        except (ValueError, UnicodeDecodeError) as exc:
            return self.send_json({"error": str(exc)}, status=400)
        except Exception as exc:
            return self.send_json({"error": str(exc)}, status=500)

    def handle_images(self):
        try:
            image_dir = ROOT / "images"
            files = []
            if image_dir.exists():
                files = sorted(
                    [entry.name for entry in image_dir.iterdir() if entry.is_file() and not entry.name.startswith(".")]
                )
            return self.send_json({"images": files})
        except Exception as exc:
            return self.send_json({"error": str(exc)}, status=500)

    def handle_green_api_webhook(self, parsed):
        claimed_message_id = None
        try:
            cfg = load_config()
            if not verify_webhook_token(self.headers, parse_qs(parsed.query), cfg):
                return self.send_json({"error": "unauthorized"}, status=401)

            payload = self.read_json()
            message = extract_green_api_message(payload)
            store = WebhookStore(WEBHOOK_LOG_PATH)

            message_id = message.get("idMessage")
            if message_id and not store.claim(message_id):
                return self.send_json({"ok": True, "duplicate": True})
            claimed_message_id = message_id

            group_allowed, group_reason = is_allowed_group_message(message, cfg)
            if not group_allowed:
                result = {
                    "ok": True,
                    "ignored": True,
                    "reason": group_reason,
                    "message": {
                        "idMessage": message.get("idMessage"),
                        "chatId": message.get("chatId"),
                        "chatName": message.get("chatName"),
                        "senderName": message.get("senderName"),
                        "typeMessage": message.get("typeMessage"),
                    },
                }
                store.append({"message": message, "result": result})
                return self.send_json(result)

            text = message.get("text")
            green_cfg = cfg.get("green_api", {})
            auto_upload = bool(green_cfg.get("auto_upload", False))
            dry_run = not auto_upload

            result = {
                "ok": True,
                "message": {
                    "idMessage": message.get("idMessage"),
                    "chatId": message.get("chatId"),
                    "chatName": message.get("chatName"),
                    "senderName": message.get("senderName"),
                    "typeMessage": message.get("typeMessage"),
                    "hasText": bool(text),
                    "hasMedia": bool(message.get("media")),
                },
            }

            if text:
                group_context = group_defaults_for_message(cfg, message.get("chatId"))
                scope = group_context.get("catalog_scope")
                items = process(
                    text,
                    catalog_for_scope(CATALOG, scope),
                    default_store=group_context.get("store"),
                    default_category=group_context.get("category"),
                )
                if scope:
                    for item in items:
                        item["catalogScope"] = scope
                items = apply_scope_default_image(items, scope)
                duplicate_indexes = duplicate_card_indexes(items)
                duplicates = [items[index] for index in sorted(duplicate_indexes)]
                queue = ReviewStore(REVIEW_DB_PATH)
                source_id = message.get("idMessage")
                if not source_id:
                    source_seed = "\n".join((str(message.get("chatId") or ""), str(message.get("timestamp") or ""), text))
                    source_id = "webhook:" + hashlib.sha256(source_seed.encode("utf-8")).hexdigest()
                for index, item in enumerate(items):
                    if index in duplicate_indexes:
                        item["needsReview"] = True
                        item["reviewApproved"] = False
                        item.setdefault("reviewReasons", []).append("такая же позиция уже есть в этом сообщении")
                    if not scope:
                        item["needsReview"] = True
                        item["reviewApproved"] = False
                        item.setdefault("reviewReasons", []).append("чат не привязан к каталогу по WhatsApp ID")
                    duplicate_id = queue.find_duplicate_publication(item)
                    if duplicate_id:
                        item["needsReview"] = True
                        item["reviewApproved"] = False
                        item.setdefault("reviewReasons", []).append("возможный повтор уже опубликованной позиции")
                        item["possibleDuplicateReviewId"] = duplicate_id
                    else:
                        item["reviewApproved"] = not item.get("needsReview") and not item.get("error")
                        if item["reviewApproved"]:
                            item["reviewReasons"] = []
                    review_id = queue.add(source_id, index, message.get("chatName"), text, item)
                    item["reviewId"] = review_id
                result["parse"] = summarize_items(items)
                result["items"] = items
                if duplicates:
                    result["duplicateItems"] = len(duplicates)
                publishable_items = filter_confident_items([
                    item for index, item in enumerate(items) if index not in duplicate_indexes
                ])
                if publishable_items:
                    if auto_upload:
                        upload_report = {"summary": {"total": 0, "ok": 0, "skipped": 0, "failed": 0, "dryRun": False}, "report": []}
                        for item in publishable_items:
                            one_result, _status = self.publish_review_id(queue, item["reviewId"], "GREEN_API")
                            one_summary = one_result.get("summary") or {}
                            if one_summary:
                                for field in ("total", "ok", "skipped", "failed"):
                                    upload_report["summary"][field] += int(one_summary.get(field, 0) or 0)
                                upload_report["report"].extend(one_result.get("report") or [])
                            else:
                                upload_report["summary"]["total"] += 1
                                upload_report["summary"]["skipped"] += 1
                                upload_report["report"].append({"result": "skipped", "reviewId": item["reviewId"], "reason": one_result.get("error", "publication failed")})
                    else:
                        upload_report = upload_cards(publishable_items, dry_run=True, force=False)
                    result["upload"] = upload_report
                    result["autoUpload"] = auto_upload
                if items:
                    reply = build_publication_reply(result["parse"], result.get("upload"), auto_upload)
                    result["reply"] = send_green_api_message(cfg, message.get("chatId"), reply)
            else:
                result["parse"] = {"total": 0, "ok": 0, "review": 0, "stores": 0}
                result["note"] = "no text/caption to parse"

            store.append({"message": message_log_record(message), "result": result})
            return self.send_json(result)
        except Exception as exc:
            try:
                WebhookStore(WEBHOOK_LOG_PATH).append({"error": str(exc)})
            except Exception:
                pass
            return self.send_json({"ok": False, "error": str(exc)}, status=500)
        finally:
            if claimed_message_id:
                WebhookStore(WEBHOOK_LOG_PATH).release(claimed_message_id)

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except (TypeError, ValueError):
            raise ValueError("invalid content length")
        if length < 0 or length > MAX_REQUEST_BYTES:
            raise ValueError("request body is too large")
        raw = self.rfile.read(length).decode("utf-8")
        try:
            payload = json.loads(raw or "{}")
        except json.JSONDecodeError as exc:
            raise ValueError("invalid JSON body") from exc
        if not isinstance(payload, dict):
            raise ValueError("JSON body must be an object")
        return payload

    def serve_file(self, path, head_only=False):
        try:
            resolved = path.resolve()
            if not (str(resolved).startswith(str(WEB_DIR.resolve())) or str(resolved).startswith(str((ROOT / "images").resolve()))):
                return self.send_error(403)
            if not resolved.is_file():
                return self.send_error(404)

            content_type = mimetypes.guess_type(str(resolved))[0] or "application/octet-stream"
            data = resolved.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if not head_only:
                self.wfile.write(data)
        except OSError:
            self.send_error(404)

    def send_json(self, payload, status=200):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        message = fmt % args
        request_target = getattr(self, "path", "")
        if request_target and request_target in message:
            message = message.replace(request_target, urlparse(request_target).path or "/")
        print("%s - %s" % (self.address_string(), message))


def summarize_items(items):
    ok_count = sum(1 for item in items if not item.get("needsReview"))
    review_count = sum(1 for item in items if item.get("needsReview"))
    store_count = len({item.get("storeName") for item in items if item.get("storeName")})
    return {
        "total": len(items),
        "ok": ok_count,
        "review": review_count,
        "stores": store_count,
    }


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()

    recovered = ReviewStore(REVIEW_DB_PATH).recover_orphaned_publishes()
    if recovered:
        print(f"Moved {recovered} interrupted CRM publications to manual reconciliation.")
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Web UI: http://{args.host}:{args.port}")
    print("Press Ctrl+C to stop.")
    server.serve_forever()


def upload_cards(cards, dry_run=False, force=False):
    cfg = load_config()
    images_dir = ROOT / cfg.get("images_dir", "./images")
    store_aliases = cfg.get("store_aliases", {})
    client = CrmClient(cfg["base_url"], cfg["email"], cfg["password"])

    client.login()
    categories = client.get_categories()
    stores = client.get_stores()

    cards, duplicates = deduplicate_cards(cards)
    report = []
    for card in cards:
        result = upload_one_card(
            card=card,
            client=client,
            cfg=cfg,
            categories=categories,
            stores=stores,
            store_aliases=store_aliases,
            images_dir=images_dir,
            dry_run=dry_run,
            force=force,
        )
        report.append(result)

    for card in duplicates:
        report.append({
            "result": "skipped",
            "name": card.get("name") or card.get("rawLine") or "unknown",
            "reason": "дублирующаяся карточка в одной публикации",
        })
    ok = sum(1 for item in report if item["result"] in {"ok", "dry-run"})
    skipped = sum(1 for item in report if item["result"] == "skipped")
    failed = sum(1 for item in report if item["result"] in {"failed", "error"})
    return {
        "summary": {
            "total": len(report),
            "ok": ok,
            "skipped": skipped,
            "failed": failed,
            "dryRun": dry_run,
        },
        "report": report,
    }


def resolve_category(cfg, categories):
    if cfg.get("category_id") is not None:
        category_id = cfg["category_id"]
        match = next((c for c in categories if c.get("id") == category_id), None)
        return category_id, {"id": category_id, "name": match.get("name") if match else None}

    category_name = cfg.get("category_name")
    if category_name and categories:
        match = [c for c in categories if c.get("name") == category_name]
        if match:
            return match[0]["id"], {"id": match[0]["id"], "name": match[0].get("name")}
    return None, None


def resolve_category_for_card(card, cfg, categories):
    card_category_id = card.get("categoryId")
    if card_category_id is not None:
        match = next((c for c in categories if c.get("id") == card_category_id), None)
        return card_category_id, {"id": card_category_id, "name": match.get("name") if match else card.get("categoryName")}

    card_category_name = (card.get("categoryName") or "").strip()
    if card_category_name and categories:
        match = next((c for c in categories if c.get("name") == card_category_name), None)
        if match:
            return match["id"], {"id": match["id"], "name": match.get("name")}

    return resolve_category(cfg, categories)


def prepare_images(card, client, images_dir, dry_run=False):
    prepared = []
    for entry in card.get("images", []) or []:
        if not entry:
            continue
        if isinstance(entry, str) and entry.startswith(("http://", "https://")):
            prepared.append(entry)
            continue

        local_path = images_dir / entry
        if dry_run:
            prepared.append(f"[DRY-RUN]{local_path}")
        elif local_path.exists():
            try:
                prepared.append(client.upload_image(str(local_path)))
            except Exception:
                continue
    return prepared


def upload_one_card(card, client, cfg, categories, stores, store_aliases, images_dir, dry_run=False, force=False):
    label = card.get("name") or card.get("rawLine_name") or card.get("rawLine") or "unknown"
    if card.get("error"):
        return {"result": "skipped", "name": label, "reason": "не распознана строка"}
    if card.get("price") is None or card.get("originalPrice") is None:
        return {"result": "skipped", "name": label, "reason": "нет цены/originalPrice"}
    if card.get("needsReview"):
        return {"result": "skipped", "name": label, "reason": "needsReview=true"}
    store_id = card.get("storeId")
    store_label = card.get("storeName", "")
    store_match = None
    if store_id is None and stores:
        sid, sname, score = resolve_store_id(store_label, stores, store_aliases)
        if sid and score >= 0.5:
            store_id = sid
            store_match = {"id": sid, "name": sname, "score": round(score, 2)}
        else:
            return {"result": "failed", "name": label, "reason": f"не нашли storeId для точки '{store_label}'"}

    category_id, category_match = resolve_category_for_card(card, cfg, categories)
    if category_id is None:
        return {"result": "skipped", "name": label, "reason": "нет categoryId/categoryName"}

    image_urls = prepare_images(card, client, images_dir, dry_run=dry_run)

    payload = {
        "name": card["name"],
        "description": card.get("description", ""),
        "originalPrice": card["originalPrice"],
        "discountPercentage": card.get("discountPercentage", 0),
        "stockQuantity": card.get("stockQuantity", 1),
        "storeId": store_id,
        "categoryId": category_id,
        "images": image_urls,
        "expiryDate": card.get("expiryDate"),
        "expirationDate": card.get("expiryDate"),
        "status": card.get("status", "AVAILABLE"),
        "active": True,
    }

    if dry_run:
        return {
            "result": "dry-run",
            "name": label,
            "payload": payload,
            "storeMatch": store_match,
            "categoryMatch": category_match,
        }

    try:
        response = client.create_product(payload, cfg.get("create_endpoint", "/products"))
        if response.status_code in (200, 201):
            return {"result": "ok", "name": label, "response": response.json(), "storeMatch": store_match, "categoryMatch": category_match}
        return {
            "result": "failed",
            "name": label,
            "status_code": response.status_code,
            "response_text": response.text,
            "payload": payload,
            "storeMatch": store_match,
            "categoryMatch": category_match,
        }
    except Exception as exc:
        return {"result": "error", "name": label, "reason": str(exc)}


if __name__ == "__main__":
    main()
