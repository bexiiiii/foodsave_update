# -*- coding: utf-8 -*-
"""
Парсер PDF каталогов Pâté → catalog_merged.json

Читает Старый каталог.pdf как базу, затем Новый каталог.pdf:
  - совпало по имени → status: "updated" (если цены изменились) или "unchanged"
  - новый товар → status: "new"
  - есть только в старом → status: "old_only"

Дополнительно вытаскивает картинки из PDF → images_from_pdf/

ИСПОЛЬЗОВАНИЕ:
    python3 parse_catalog.py
    # → catalog_merged.json + images_from_pdf/
"""

import re
import json
import sys
import os
import unicodedata
from pathlib import Path

try:
    import pymupdf
except ImportError:
    print("Нужно: pip install pymupdf --break-system-packages", file=sys.stderr)
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# Конфиг
# ─────────────────────────────────────────────────────────────────────────────
OLD_PDF = "Старый каталог.pdf"
NEW_PDF = "Новый каталог.pdf"
OUT_JSON = "catalog_merged.json"
IMAGES_DIR = Path("images_from_pdf")
IMAGES_DIR.mkdir(exist_ok=True)

# Категории которые нас интересуют (для parse_daily.py)
# None = все
RELEVANT_CATEGORIES = None  # парсим всё

# Y-позиции трёх зон карточек на странице (центры, допуск ±110)
CARD_ZONES_Y = [90, 260, 430]
ZONE_RADIUS = 115

# Минимальный размер шрифта для названий товаров (bold)
NAME_MIN_FONT = 11
NAME_MAX_FONT = 16

# ─────────────────────────────────────────────────────────────────────────────
# Утилиты
# ─────────────────────────────────────────────────────────────────────────────

def translit(text: str) -> str:
    """Транслитерация кириллицы → латиница для имён файлов."""
    table = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
        'з':'z','и':'i','й':'j','к':'k','л':'l','м':'m','н':'n','о':'o',
        'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
        'ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu',
        'я':'ya',
    }
    res = []
    for c in text.lower():
        res.append(table.get(c, c))
    s = ''.join(res)
    s = re.sub(r'[^a-z0-9]+', '_', s).strip('_')
    return s


def fix_cmap(text: str) -> str:
    """Исправление битой кодировки жирных шрифтов из PDF."""
    charmap = {
        'Ӣ': ', ',
        'љ': 'я',
        'щ': 'ш',
        'ш': 'ц',
        'ю': 'ы',
        'х': 'ф',
        'ъ': 'щ',
        'ц': 'х',
        'ѓ': 'э',
        'ј': 'ю',
        'Ӹ': '-',
        'ӂ': '1',
        'Ӵ': '(',
        'ӵ': ')',
        'ӄ': '4',
        'Ӂ': '0',
        'ӭ': '/',
        'Ӊ': '8',
        'Ӄ': '3',
        'ӆ': '5',
    }
    return ''.join(charmap.get(c, c) for c in text)


def normalize_name(s: str) -> str:
    """Нормализация для сравнения имён."""
    s = s.lower().strip()
    s = re.sub(r'ё', 'е', s)
    s = re.sub(r'\s+', ' ', s)
    return s


def parse_price(text: str) -> int | None:
    """'12 000' → 12000, '2300' → 2300."""
    digits = re.sub(r'[\s\u00a0]', '', text)
    if re.match(r'^\d+$', digits):
        return int(digits)
    return None

# ─────────────────────────────────────────────────────────────────────────────
# Основной парсер
# ─────────────────────────────────────────────────────────────────────────────

def get_zone(y: float) -> int | None:
    """Возвращает индекс зоны (0/1/2) или None если вне зон."""
    for i, cy in enumerate(CARD_ZONES_Y):
        if abs(y - cy) <= ZONE_RADIUS:
            return i
    return None


def extract_page_items(page, page_num: int, pdf_stem: str) -> tuple[str, list[dict]]:
    """
    Извлекает категорию страницы и список товаров.
    Возвращает (category_name, [item_dict, ...])
    """
    blocks = page.get_text("dict")["blocks"]
    category = ""

    # Собираем все текстовые спаны
    spans = []
    for b in blocks:
        if b["type"] != 0:
            continue
        for line in b["lines"]:
            for span in line["spans"]:
                txt = span["text"].strip()
                if not txt:
                    continue
                # Нормализуем кодировку и исправляем cmap
                txt = unicodedata.normalize('NFC', txt)
                txt = fix_cmap(txt).strip()
                if not txt:
                    continue
                spans.append({
                    "text": txt,
                    "x": span["bbox"][0],
                    "y": span["bbox"][1],
                    "y2": span["bbox"][3],
                    "size": round(span["size"]),
                    "bold": bool(span["flags"] & 2**4),
                    "bbox": span["bbox"],
                })

    # Категория страницы — самый крупный текст (size≥20, CAPS)
    for sp in sorted(spans, key=lambda s: -s["size"]):
        if sp["size"] >= 18 and sp["text"].isupper() and len(sp["text"]) > 2:
            category = sp["text"]
            break

    # Группируем по зонам
    zones: dict[int, list] = {0: [], 1: [], 2: []}
    for sp in spans:
        z = get_zone(sp["y"])
        if z is not None:
            zones[z].append(sp)

    items = []
    for zone_idx, zone_spans in zones.items():
        if not zone_spans:
            continue

        item = _parse_zone(zone_spans, zone_idx, page_num, pdf_stem, page)
        if item:
            item["category"] = category
            items.append(item)

    return category, items


def _parse_zone(spans: list, zone_idx: int, page_num: int, pdf_stem: str, page) -> dict | None:
    """Разбирает один блок из 3 на странице."""

    # Имя: bold спан с размером 11-16
    name_spans = [s for s in spans if s["bold"] and NAME_MIN_FONT <= s["size"] <= NAME_MAX_FONT
                  and s["text"] not in ("NEW", "ТАРТЫ", "ГАЛЕТЫ", "ДЕСЕРТЫ", "КИШ")]
    if not name_spans:
        return None

    # Берём bold-спаны с минимальным Y в зоне — это название
    name_spans_sorted = sorted(name_spans, key=lambda s: s["y"])
    name_parts = []
    base_y = name_spans_sorted[0]["y"]
    for sp in name_spans_sorted:
        if sp["y"] - base_y < 25:  # несколько строк названия
            name_parts.append(sp["text"])
    name = " ".join(name_parts).strip()
    if not name or len(name) < 2:
        return None

    # NEW флаг
    is_new_in_catalog = any(s["text"] == "NEW" for s in spans)

    # Цены — числа размером 12-16
    price_spans = [s for s in spans if not s["bold"] and s["size"] >= 11
                   and re.match(r'^[\d\s\u00a0]+$', s["text"])
                   and parse_price(s["text"]) is not None
                   and parse_price(s["text"]) > 100]

    # Подписи к ценам (размер 6-10, содержат слова типа "мини", "большой", etc.)
    label_spans = [s for s in spans if s["size"] <= 10 and not s["bold"]
                   and any(w in s["text"].lower() for w in
                           ["мини", "большой", "порция", "целый", "средний", "большая",
                            "пирог", "тарт", "шт", "500 г", "1 кг", "1шт"])]

    # Группируем цены по X-позиции:
    # x < 90 → "мини/порция", x >= 90 → "большой/целый"
    sizes = {}
    for ps in price_spans:
        price_val = parse_price(ps["text"])
        if price_val is None:
            continue
        # Ищем ближайшую подпись по Y
        nearest_label = None
        min_dist = 999
        for ls in label_spans:
            dist = abs(ls["y"] - ps["y"])
            if dist < min_dist:
                min_dist = dist
                nearest_label = ls

        # Определяем размер по X и подписи
        if ps["x"] < 90:
            size_key = "мини"
            if nearest_label:
                lab = nearest_label["text"].lower()
                if "порция" in lab:
                    size_key = "порция"
                elif "целый" in lab:
                    size_key = "целый"
                elif "мини" in lab or "500 г" in lab:
                    size_key = "мини"
        else:
            size_key = "большой"
            if nearest_label:
                lab = nearest_label["text"].lower()
                if "средний" in lab:
                    size_key = "средний"
                elif "большой" in lab or "1 кг" in lab:
                    size_key = "большой"
                elif "целый" in lab or "большой киш" in lab:
                    size_key = "целый"

        if size_key not in sizes:
            sizes[size_key] = {"price": price_val, "image": None}
        else:
            # дублирующая цена — пропускаем
            pass

    # Одиночная цена (только x~70-120, нет второй)
    if not sizes and price_spans:
        ps = price_spans[0]
        price_val = parse_price(ps["text"])
        if price_val:
            sizes["штука"] = {"price": price_val, "image": None}

    # Описание — средний размер текст без bold, не цена, не размерная подпись
    desc_spans = [s for s in spans
                  if not s["bold"] and 9 <= s["size"] <= 12
                  and not re.match(r'^[\d\s₸\u00a0]+$', s["text"])
                  and s["text"] not in ("NEW", "₸", "%")
                  and not any(w in s["text"].lower() for w in
                              ["мини", "большой", "порция", "целый", "средний",
                               "диаметр", "высота", "длина", "вес", "чел", "шт"])
                  and s["size"] >= 9]
    desc_parts = sorted(desc_spans, key=lambda s: s["y"])
    description = " ".join(s["text"] for s in desc_parts).strip()
    # Убираем дубли (бывает одна строка появляется дважды из PDF)
    description = re.sub(r'(.{15,}?)\s+\1', r'\1', description).strip()
    description = re.sub(r'\s+', ' ', description)

    # Картинка: ищем изображения в зоне Y
    zone_y_min = CARD_ZONES_Y[zone_idx] - ZONE_RADIUS
    zone_y_max = CARD_ZONES_Y[zone_idx] + ZONE_RADIUS
    img_filename = _extract_zone_image(page, zone_y_min, zone_y_max,
                                        name, page_num, pdf_stem)

    # Проставляем картинку первому размеру
    if img_filename:
        for size_key in sizes:
            sizes[size_key]["image"] = img_filename
            break

    return {
        "canonical": name,
        "description": description,
        "sizes": sizes,
        "is_new_in_catalog": is_new_in_catalog,
    }


def _extract_zone_image(page, y_min: float, y_max: float,
                         name: str, page_num: int, pdf_stem: str) -> str | None:
    """Вытаскивает первую картинку из зоны Y страницы."""
    page_height = page.rect.height
    # Конвертируем из координат PDF (origin top) в обычные
    # В pymupdf y растёт вниз
    images = page.get_images(full=True)
    if not images:
        return None

    # Для каждой картинки берём bbox через get_image_rects
    candidates = []
    for img_info in images:
        xref = img_info[0]
        try:
            rects = page.get_image_rects(xref)
            if not rects:
                continue
            rect = rects[0]
            img_y = rect.y0
            # Проверяем попадание в зону
            if y_min - 20 <= img_y <= y_max + 20:
                candidates.append((img_y, xref, rect))
        except Exception:
            continue

    if not candidates:
        return None

    # Берём картинку ближайшую к центру зоны
    zone_center = (y_min + y_max) / 2
    best = min(candidates, key=lambda c: abs(c[0] - zone_center))
    xref = best[1]

    # Извлекаем и сохраняем
    fname = f"{translit(name)}.jpg"
    fpath = IMAGES_DIR / fname
    if not fpath.exists():
        try:
            img_data = page.parent.extract_image(xref)
            ext = img_data.get("ext", "jpg")
            fname = f"{translit(name)}.{ext}"
            fpath = IMAGES_DIR / fname
            with open(fpath, "wb") as f:
                f.write(img_data["image"])
        except Exception as e:
            return None

    return fname


# ─────────────────────────────────────────────────────────────────────────────
# Парсинг одного PDF
# ─────────────────────────────────────────────────────────────────────────────

def parse_pdf(pdf_path: str) -> list[dict]:
    """Возвращает список всех товаров из PDF."""
    doc = pymupdf.open(pdf_path)
    pdf_stem = Path(pdf_path).stem
    all_items = []
    seen_names = set()

    for page_num in range(doc.page_count):
        page = doc[page_num]
        category, items = extract_page_items(page, page_num, pdf_stem)

        for item in items:
            if not item.get("canonical") or not item.get("sizes"):
                continue
            norm = normalize_name(item["canonical"])
            if norm in seen_names:
                # Обновляем размеры если новые пришли
                existing = next((x for x in all_items
                                  if normalize_name(x["canonical"]) == norm), None)
                if existing and item["sizes"]:
                    for sz, data in item["sizes"].items():
                        if sz not in existing["sizes"]:
                            existing["sizes"][sz] = data
                continue
            seen_names.add(norm)
            all_items.append(item)

    doc.close()
    print(f"  {Path(pdf_path).name}: {len(all_items)} товаров", file=sys.stderr)
    return all_items


# ─────────────────────────────────────────────────────────────────────────────
# Merge
# ─────────────────────────────────────────────────────────────────────────────

def merge_catalogs(old_items: list[dict], new_items: list[dict]) -> list[dict]:
    """
    Мерджит два списка.
    Возвращает список с полем status:
      "new"       — только в новом
      "updated"   — в обоих, цены изменились
      "unchanged" — в обоих, без изменений
      "old_only"  — только в старом
    """
    old_by_name = {normalize_name(x["canonical"]): x for x in old_items}
    new_by_name = {normalize_name(x["canonical"]): x for x in new_items}

    result = []

    # Обрабатываем товары из нового каталога
    for norm, new_item in new_by_name.items():
        if norm in old_by_name:
            old_item = old_by_name[norm]
            # Сравниваем цены
            price_changed = False
            old_sizes = old_item.get("sizes", {})
            new_sizes = new_item.get("sizes", {})
            merged_sizes = {}

            # Берём все ключи размеров
            all_size_keys = set(old_sizes) | set(new_sizes)
            for sz in all_size_keys:
                old_price = old_sizes.get(sz, {}).get("price")
                new_price = new_sizes.get(sz, {}).get("price")
                old_img = old_sizes.get(sz, {}).get("image")
                new_img = new_sizes.get(sz, {}).get("image")
                img = new_img or old_img

                if old_price != new_price and new_price is not None:
                    price_changed = True

                merged_sizes[sz] = {
                    "price": new_price if new_price is not None else old_price,
                    "old_price": old_price if old_price != new_price else None,
                    "image": img,
                }

            result.append({
                "canonical": new_item["canonical"],
                "category": new_item.get("category") or old_item.get("category", ""),
                "description": new_item.get("description") or old_item.get("description", ""),
                "aliases": old_item.get("aliases", []),
                "sizes": merged_sizes,
                "is_new_in_catalog": new_item.get("is_new_in_catalog", False),
                "status": "updated" if price_changed else "unchanged",
            })
        else:
            # Только в новом
            result.append({
                **new_item,
                "aliases": [],
                "status": "new",
            })

    # Добавляем товары только из старого
    for norm, old_item in old_by_name.items():
        if norm not in new_by_name:
            result.append({
                **old_item,
                "aliases": old_item.get("aliases", []),
                "status": "old_only",
            })

    # Сортируем: новые → обновлённые → без изменений → только старые
    order = {"new": 0, "updated": 1, "unchanged": 2, "old_only": 3}
    result.sort(key=lambda x: (order.get(x["status"], 9), x.get("category", ""), x.get("canonical", "")))

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Парсим Старый каталог...", file=sys.stderr)
    old_items = parse_pdf(OLD_PDF)

    print("Парсим Новый каталог...", file=sys.stderr)
    new_items = parse_pdf(NEW_PDF)

    print("Мерджим...", file=sys.stderr)
    merged = merge_catalogs(old_items, new_items)

    # Статистика
    stats = {}
    for item in merged:
        s = item["status"]
        stats[s] = stats.get(s, 0) + 1

    print(f"\n=== ИТОГО: {len(merged)} товаров ===", file=sys.stderr)
    for status, count in sorted(stats.items()):
        label = {"new": "🆕 Новые", "updated": "🔄 Обновлённые",
                 "unchanged": "✅ Без изменений", "old_only": "📦 Только в старом"}
        print(f"  {label.get(status, status)}: {count}", file=sys.stderr)

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"\nСохранено: {OUT_JSON}", file=sys.stderr)
    print(f"Картинки: {IMAGES_DIR}/ ({len(list(IMAGES_DIR.iterdir()))} файлов)", file=sys.stderr)
