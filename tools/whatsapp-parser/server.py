# -*- coding: utf-8 -*-
"""Local web UI for parsing Pâté WhatsApp messages."""
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from green_api import (
    WebhookStore,
    build_publication_reply,
    extract_green_api_message,
    group_defaults_for_message,
    is_allowed_group_message,
    send_green_api_message,
    verify_webhook_token,
)
from parse_daily import process
from upload_to_crm import CrmClient, resolve_store_id


ROOT = Path(__file__).resolve().parent
WEB_DIR = ROOT / "web"
CATALOG_PATH = ROOT / "catalog_paste.json"
CONFIG_PATH = ROOT / "config.json"
DATA_DIR = ROOT / "data"
WEBHOOK_LOG_PATH = DATA_DIR / "green_api_events.jsonl"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000


def load_catalog():
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_config():
    if not CONFIG_PATH.exists():
        raise FileNotFoundError("config.json не найден. Скопируй config.example.json в config.json и впиши CRM-доступы.")
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


CATALOG = load_catalog()


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

        if path.startswith("/images/"):
            return self.serve_file(ROOT / path.lstrip("/"))

        return self.serve_file(WEB_DIR / path.lstrip("/"))

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/parse":
            return self.handle_parse()
        if parsed.path == "/api/upload":
            return self.handle_upload()
        if parsed.path == "/api/boxes":
            return self.handle_upload()
        if parsed.path == "/api/green-api/webhook":
            return self.handle_green_api_webhook(parsed)
        self.send_json({"error": "not found"}, status=404)

    def handle_parse(self):
        try:
            payload = self.read_json()
            raw_text = payload.get("text", "")
            if not raw_text.strip():
                return self.send_json({"error": "empty text"}, status=400)

            items = process(raw_text, CATALOG)
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
        except Exception as exc:
            return self.send_json({"error": str(exc)}, status=500)

    def handle_upload(self):
        try:
            payload = self.read_json()
            items = payload.get("items", [])
            dry_run = bool(payload.get("dryRun", False))
            force = bool(payload.get("force", False))
            if not items:
                return self.send_json({"error": "empty items"}, status=400)

            report = upload_cards(items, dry_run=dry_run, force=force)
            return self.send_json(report)
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
        try:
            cfg = load_config()
            if not verify_webhook_token(self.headers, parse_qs(parsed.query), cfg):
                return self.send_json({"error": "unauthorized"}, status=401)

            payload = self.read_json()
            message = extract_green_api_message(payload)
            store = WebhookStore(WEBHOOK_LOG_PATH)

            if message.get("idMessage") and store.seen(message["idMessage"]):
                return self.send_json({"ok": True, "duplicate": True})

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
            force = bool(green_cfg.get("force_upload", False))
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
                group_context = group_defaults_for_message(cfg, message.get("chatName"))
                items = process(
                    text,
                    CATALOG,
                    default_store=group_context.get("store"),
                    default_category=group_context.get("category"),
                )
                media = message.get("media") or {}
                download_url = media.get("downloadUrl")
                if download_url and len(items) == 1:
                    items[0]["images"] = [download_url]
                result["parse"] = summarize_items(items)
                result["items"] = items
                if items:
                    upload_report = upload_cards(items, dry_run=dry_run, force=force)
                    result["upload"] = upload_report
                    result["autoUpload"] = auto_upload
                    reply = build_publication_reply(result["parse"], upload_report, auto_upload)
                    result["reply"] = send_green_api_message(cfg, message.get("chatId"), reply)
            else:
                result["parse"] = {"total": 0, "ok": 0, "review": 0, "stores": 0}
                result["note"] = "no text/caption to parse"

            store.append({"message": message, "result": result})
            return self.send_json(result)
        except Exception as exc:
            try:
                WebhookStore(WEBHOOK_LOG_PATH).append({"error": str(exc)})
            except Exception:
                pass
            return self.send_json({"ok": False, "error": str(exc)}, status=500)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw or "{}")

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
        print("%s - %s" % (self.address_string(), fmt % args))


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
    if card.get("needsReview") and not force:
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
