# -*- coding: utf-8 -*-
"""
Соединяет результат parse_daily.py с реальной CRM:
  1) логинится (POST /api/auth/login), хранит accessToken/refreshToken
  2) подтягивает справочники /api/categories/active и /api/stores/active,
     резолвит categoryId и storeId по имени (без ручного хардкода id)
  3) для каждой карточки заливает локальную картинку (POST /api/upload/image)
  4) создаёт товар (POST /api/products)
  5) если accessToken истёк (401) — обновляет через /api/auth/refresh-token и повторяет запрос
  6) пишет отчёт report.json (что создалось, что упало, с текстом ошибки)

ЗАПУСК:
    python3 upload_to_crm.py result.json --config config.json
    python3 upload_to_crm.py result.json --config config.json --dry-run   # ничего не отправляет, только показывает план
    python3 upload_to_crm.py result.json --config config.json --force    # включить и needsReview-позиции

result.json — то, что выводит parse_daily.py (можно просто перенаправить >result.json)
"""
import argparse
import json
import os
import sys
import time
from difflib import SequenceMatcher

import requests


def log(msg):
    print(msg, file=sys.stderr)


class CrmClient:
    def __init__(self, base_url, email, password):
        self.base_url = base_url.rstrip("/")
        self.email = email
        self.password = password
        self.access_token = None
        self.refresh_token = None

    def login(self):
        r = requests.post(f"{self.base_url}/auth/login", json={
            "email": self.email, "password": self.password
        }, timeout=20)
        r.raise_for_status()
        data = r.json()
        self.access_token = data["accessToken"]
        self.refresh_token = data["refreshToken"]
        log("Логин ок.")

    def refresh(self):
        r = requests.post(f"{self.base_url}/auth/refresh-token", headers={
            "Authorization": f"Bearer {self.refresh_token}"
        }, timeout=20)
        r.raise_for_status()
        data = r.json()
        self.access_token = data["accessToken"]
        self.refresh_token = data.get("refreshToken", self.refresh_token)
        log("Токен обновлён.")

    def _auth_headers(self):
        return {"Authorization": f"Bearer {self.access_token}"}

    def _request_with_retry(self, method, path, **kwargs):
        url = f"{self.base_url}{path}"
        headers = kwargs.pop("headers", {})
        for attempt in range(1, 5):
            request_headers = {**headers, **self._auth_headers()}
            try:
                r = requests.request(method, url, headers=request_headers, timeout=30, **kwargs)
                if r.status_code == 401 and attempt == 1:
                    log("401 — обновляю токен и повторяю запрос...")
                    self.refresh()
                    continue
                if r.status_code not in {408, 425, 429} and r.status_code < 500:
                    return r
                log(f"CRM {r.status_code} для {method} {path}, повтор {attempt}/4")
            except requests.RequestException as exc:
                log(f"Ошибка сети для {method} {path}: {exc}, повтор {attempt}/4")
                if attempt == 4:
                    raise
            if attempt < 4:
                time.sleep(2 ** (attempt - 1))
        return r

    def get_categories(self):
        r = self._request_with_retry("GET", "/categories/active")
        r.raise_for_status()
        return r.json()

    def get_stores(self):
        r = self._request_with_retry("GET", "/stores/active")
        r.raise_for_status()
        return r.json()

    def upload_image(self, filepath):
        with open(filepath, "rb") as f:
            files = {"file": (os.path.basename(filepath), f, "image/jpeg")}
            r = self._request_with_retry("POST", "/upload/image", files=files)
        r.raise_for_status()
        return r.json()["url"]

    def create_product(self, payload, endpoint="/products"):
        r = self._request_with_retry("POST", endpoint, json=payload)
        return r


def best_name_match(target, candidates_with_names):
    """candidates_with_names: список (id, name). Возвращает (id, name, score) лучшего совпадения."""
    target_n = target.lower().strip()
    best = (None, None, 0.0)
    for cid, cname in candidates_with_names:
        score = SequenceMatcher(None, target_n, cname.lower().strip()).ratio()
        if target_n in cname.lower() or cname.lower() in target_n:
            score = max(score, 0.9)
        if score > best[2]:
            best = (cid, cname, score)
    return best


def resolve_store_id(store_name_raw, stores, store_aliases):
    key = store_name_raw.lower().strip()
    alias = store_aliases.get(key)
    candidates = [(s["id"], s["name"]) for s in stores]
    target = alias if alias else store_name_raw
    sid, sname, score = best_name_match(target, candidates)
    return sid, sname, score


def resolve_category_id(cfg, categories):
    if cfg.get("category_id") is not None:
        return cfg["category_id"]

    category_name = cfg.get("category_name")
    if category_name and categories:
        cat_match = [c for c in categories if c.get("name") == category_name]
        if cat_match:
            return cat_match[0]["id"]
    return None


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

    fallback_id = resolve_category_id(cfg, categories)
    if fallback_id is not None:
        match = next((c for c in categories if c.get("id") == fallback_id), None)
        return fallback_id, {"id": fallback_id, "name": match.get("name") if match else cfg.get("category_name")}

    return None, None


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
            except Exception as exc:
                log(f"  !!! не удалось залить картинку {local_path}: {exc}")
        else:
            log(f"  !!! локальный файл не найден: {local_path}")
    return prepared


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("result_json", help="вывод parse_daily.py")
    ap.add_argument("--config", default="config.json")
    ap.add_argument("--dry-run", action="store_true", help="ничего не отправлять, только показать план")
    ap.add_argument("--force", action="store_true", help="включить и needsReview-позиции")
    args = ap.parse_args()

    with open(args.config, encoding="utf-8") as f:
        cfg = json.load(f)
    with open(args.result_json, encoding="utf-8") as f:
        cards = json.load(f)

    images_dir = cfg.get("images_dir", "./images")
    store_aliases = cfg.get("store_aliases", {})

    client = CrmClient(cfg["base_url"], cfg["email"], cfg["password"])

    client.login()
    categories = client.get_categories()
    stores = client.get_stores()
    if args.dry_run:
        log("[DRY-RUN] справочники загружены, товары не создаю")

    report = []
    skipped = 0

    for card in cards:
        if card.get("error"):
            report.append({**card, "result": "skipped", "reason": "не распознана строка изначально"})
            skipped += 1
            continue
        if card.get("price") is None or card.get("originalPrice") is None:
            report.append({**card, "result": "skipped", "reason": "нет цены/originalPrice — нужна ручная правка"})
            skipped += 1
            continue
        if card.get("needsReview") and not args.force:
            report.append({**card, "result": "skipped", "reason": "needsReview=true (запусти с --force чтобы включить)"})
            skipped += 1
            continue

        # storeId
        store_id = card.get("storeId")
        store_label = card.get("storeName", "")
        if store_id is None and stores:
            sid, sname, score = resolve_store_id(store_label, stores, store_aliases)
            if sid and score >= 0.5:
                store_id = sid
                log(f"  точка '{store_label}' -> '{sname}' (id={sid}, score={score:.2f})")
            else:
                report.append({**card, "result": "failed", "reason": f"не нашли storeId для точки '{store_label}'"})
                continue

        category_id, category_match = resolve_category_for_card(card, cfg, categories)
        if category_id is None:
            report.append({**card, "result": "skipped", "reason": "нет categoryId/categoryName"})
            skipped += 1
            continue

        image_urls = prepare_images(card, client, images_dir, dry_run=args.dry_run)

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

        if args.dry_run:
            log(
                f"[DRY-RUN] would POST /products: {payload['name']} | "
                f"store={store_id} cat={category_id} "
                f"expiryDate={payload['expiryDate']} expirationDate={payload['expirationDate']} "
                f"img={image_urls}"
            )
            report.append({**card, "result": "dry-run", "payload": payload, "categoryMatch": category_match})
            continue

        try:
            r = client.create_product(payload, cfg.get("create_endpoint", "/products"))
            if r.status_code in (200, 201):
                report.append({**card, "result": "ok", "response": r.json(), "categoryMatch": category_match})
            else:
                report.append({**card, "result": "failed", "status_code": r.status_code, "response_text": r.text, "payload": payload, "categoryMatch": category_match})
        except Exception as e:
            report.append({**card, "result": "error", "reason": str(e)})

        time.sleep(0.2)  # не долбим API слишком часто

    ok = sum(1 for r in report if r["result"] == "ok")
    failed = sum(1 for r in report if r["result"] in ("failed", "error"))
    log(f"\n--- ИТОГО: успешно={ok}, ошибок={failed}, пропущено={skipped}, всего={len(cards)} ---")

    with open("report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    log("Полный отчёт: report.json")


if __name__ == "__main__":
    main()
