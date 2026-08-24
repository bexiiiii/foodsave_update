# -*- coding: utf-8 -*-
"""
Парсер ежедневных WhatsApp-сообщений Pâté (акции дня по точкам)
-> сопоставление с мастер-каталогом (catalog.json)
-> готовые карточки для CRM (формат близкий к POST /api/products из box-endpoint.md)

ИСПОЛЬЗОВАНИЕ:
    python3 parse_daily.py raw_messages.txt catalog.json > result.json

raw_messages.txt — просто весь текст, который тебе пришёл в WhatsApp за день
(можно копипастить, как есть, со всеми точками подряд).

catalog.json — мастер-каталог (пример: catalog_paste.json), который мы один раз
строим из PDF/реального меню и потом только дополняем.
"""
import re
import json
import sys
import datetime
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

CATEGORY_NAME = "Кондитерские изделия"
DEFAULT_EXPIRY_DAYS = 1   # по умолчанию +1 день, можно передать др. число в build_card
STATUS = "AVAILABLE"
DEFAULT_DISCOUNT_PCT = 40  # стандартная скидка Pâté на акционные позиции

# точка -> storeId. Заполнить, когда узнаешь точные id (ты сказал, их 5).
STORE_IDS = {
    "туран": None,
    "пате туран": None,
    "толе би": None,
    "пате толе би": None,
    "достык": None,
    "достык пате": None,
    "ишим": None,
    "пате ишим": None,
    "калдаякова": None,
    "бухар жырау": None,
    "пате бухар жырау": None,
}

# нормализация размеров — баристы пишут по-разному
SIZE_SYNONYMS = {
    "мини": "мини", "мин": "мини",
    "макси": "большой", "макс": "большой",
    "большой": "большой", "большая": "большой",
    "средний": "средний", "средняя": "средний",
    "половина": "средний",
    "пол": "средний",
    "порция": "порция", "порции": "порция", "пор": "порция",
    "целый": "большой",
}

# слова, которые не должны мешать сопоставлению (порядок/наличие)
STOPWORDS = {"тарт", "пирог", "с"}

STORE_WORDS = {
    "пате", "туран", "толе", "би", "достык", "ишим", "калдаякова",
    "бухар", "жырау", "royalty", "coffee", "кофе", "оливка", "olivka",
    "республика", "жаннур", "сембинова", "аружан", "сыганак", "жиенкулова",
    "абая", "coffi", "бокейхана",
}

IMAGES_DIR = Path(__file__).resolve().parent / "images"
IGNORED_MESSAGE_LINES = {
    "добрый вечер", "доброе утро", "добрый день", "все газуем", "газуем",
}
PARTNER_CATEGORY = {"royalty": "Кофейня", "coffi": "Кофейня"}

QTY_RE = re.compile(r"\b(?P<qty>\d+)\s*(?P<unit>шт|ш|пор|уп)\b", re.IGNORECASE)
PRICE_UNIT_RE = re.compile(r"(?<=\d)\s*(?:тенге|тг|т|₸)\b", re.IGNORECASE)

NAME_REPLACEMENTS = [
    (r"\bфриске\b", "фрикасе"),
    (r"\bтво+рожн", "творожн"),
    (r"\bпирожок\s+картошка\b", "пирожок с картошкой"),
    (r"\bпирожок\s+капуста\b", "пирожок с капустой"),
    (r"\bсинабоны\b", "синнабон"),
    (r"\bсиннабоны\b", "синнабон"),
    (r"\bскандинаски\b", "скандинавский"),
    (r"\bскандинавски\b", "скандинавский"),
    (r"\bслойка\s+сосиск[аи]\b", "слойка с колбаской"),
    (r"\bсосиск[аи]\b", "колбаской"),
    (r"\bслойка\s+творог\b", "слойка творожная"),
    (r"\bшоко\b", "шоколад"),
]


def normalize(s: str) -> str:
    s = unicodedata.normalize("NFC", s).lower().strip()
    s = re.sub(r"ё", "е", s)
    s = re.sub(r"[^\w\s]", " ", s, flags=re.UNICODE)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def tokenset(s: str):
    return {t for t in normalize(s).split() if t not in STOPWORDS and t not in SIZE_SYNONYMS}


def apply_name_replacements(name: str) -> str:
    for pattern, repl in NAME_REPLACEMENTS:
        name = re.sub(pattern, repl, name, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", name).strip()


def size_price_match(item, original_price=None):
    if original_price is None:
        return False
    return any(s.get("price") == original_price for s in item.get("sizes", {}).values())


def item_has_size(item, desired_size=None):
    if not desired_size:
        return False
    labels = set(item.get("sizes", {}).keys())
    candidates = {desired_size}
    if desired_size == "большой":
        candidates.update({"большая", "макси"})
    if desired_size == "средний":
        candidates.add("половина")
    return bool(labels & candidates)


def best_match(name_raw, catalog, threshold=0.62, original_price=None, desired_size=None):
    """catalog: список словарей {canonical, aliases:[...], sizes:{...}}"""
    prepared_name = apply_name_replacements(name_raw)
    raw_tokens = tokenset(prepared_name)
    best, best_score = None, 0.0
    ranked = []
    for item in catalog:
        item_best_score = 0.0
        candidates = [item["canonical"]] + item.get("aliases", [])
        for c in candidates:
            c_tokens = tokenset(c)
            if not c_tokens or not raw_tokens:
                continue
            inter = len(raw_tokens & c_tokens)
            union = len(raw_tokens | c_tokens)
            jacc = inter / union if union else 0
            ratio = SequenceMatcher(
                None, " ".join(sorted(raw_tokens)), " ".join(sorted(c_tokens))
            ).ratio()
            score = max(jacc, ratio)
            if raw_tokens and raw_tokens <= c_tokens:
                score = max(score, 0.82)
            if size_price_match(item, original_price):
                score = min(1.0, score + 0.18)
            if desired_size:
                score = min(1.0, score + 0.12) if item_has_size(item, desired_size) else max(0.0, score - 0.25)
            if score > item_best_score:
                item_best_score = score
            if score > best_score:
                best_score, best = score, item
        if item_best_score:
            ranked.append((item_best_score, item))
    ranked = sorted(ranked, key=lambda x: x[0], reverse=True)
    if best_score >= threshold:
        return best, best_score, ranked[:5]
    return None, best_score, ranked[:5]


def preprocess_line(line: str) -> str:
    """Нормализация строки перед парсингом:
    - убираем разделитель тысяч: 11.000 -> 11000, 12.000 -> 12000
    - убираем поясняющие скобки: (одна порция) -> ""
    - убираем "тыс" после числа
    - снимаем нумерацию: '1. Название' -> 'Название', '14. ⁠...' -> '...'
    - заменяем тире-разделитель: 'Название-1500' -> 'Название 1500'
    - убираем минус перед ценой: '-1380' -> '1380'
    """
    line = line.replace("\u2060", " ").replace("\ufeff", " ")
    line = re.sub(r"[\U00010000-\U0010ffff]", " ", line)
    line = line.lower().replace("ё", "е")
    line = strip_annotation_tail(line)
    # тысячный разделитель через точку: цифра.три_цифры -> слитно
    line = re.sub(r"(\d)\.(\d{3})\b", r"\1\2", line)
    # убираем скобки с пояснениями: (одна порция), (порция), etc.
    line = re.sub(r"\([^)]*\)", "", line)
    # убираем "тыс" после числа (напр. "11.000 тыс")
    line = re.sub(r"\bтыс\b", "", line, flags=re.IGNORECASE)
    line = re.sub(r"\bвместе\b", "вместо", line, flags=re.IGNORECASE)
    line = re.sub(r"(?<=\d)\s*(?:тенге|тг|т|₸)(?=вместо)", " ", line, flags=re.IGNORECASE)
    line = PRICE_UNIT_RE.sub(" ", line)
    line = re.sub(r"вместо(?=\d)", "вместо ", line, flags=re.IGNORECASE)
    line = re.sub(r"(?<=\d)(?=вместо)", " ", line, flags=re.IGNORECASE)
    line = re.sub(r"\bпорци[ияй]\b|\bпорций\b", "пор", line, flags=re.IGNORECASE)
    line = re.sub(r"\bш\b", "шт", line, flags=re.IGNORECASE)
    line = re.sub(r"\bуп(?:ак(?:овк[аи])?)?\b", "уп", line, flags=re.IGNORECASE)
    line = re.sub(r"\s*/\s*", "/", line)
    # тире-разделитель в WhatsApp часто играет роль пробела.
    line = re.sub(r"[-–—]+", " ", line)
    # минус перед ценой в начале раздела цен: " -1380" -> " 1380"
    line = re.sub(r"(?<=\s)-(?=\d)", "", line)
    # убираем нумерацию в начале строки (1., 14., etc.) + возможный невидимый символ ⁠ (U+2060)
    line = re.sub(r"^\d+\.\s*", "", line.strip())
    line = apply_name_replacements(line)
    line = re.sub(r"\s+", " ", line).strip()
    return line


def strip_annotation_tail(line: str) -> str:
    """Убирает пользовательские пояснения в конце строки вида:
    '... - нет "вместо", скидка посчитана по умолчанию'.

    Не трогаем реальные названия товаров с дефисом внутри, потому что там
    дефис обычно не окружён пробелами.
    """
    marker = re.search(r"\s-\s", line)
    if not marker:
        return line

    tail = line[marker.end():].strip()
    if not tail:
        return line[:marker.start()].strip()

    if not re.search(r"\b\d+\b", tail) and (
        "вместо" in tail or "скидк" in tail or "неоднознач" in tail or "провер" in tail or "нет" in tail
    ):
        return line[:marker.start()].strip()
    return line


def parse_store_header(line: str):
    raw = line.strip()
    if not raw:
        return None
    greeting_branch = re.match(
        r"^(?:добрый вечер|доброе утро|добрый день)\s*[,!:\-]\s*(.+)$",
        raw,
        flags=re.IGNORECASE,
    )
    if greeting_branch:
        raw = greeting_branch.group(1).strip()
    elif normalize(raw) in IGNORED_MESSAGE_LINES:
        return None
    if re.search(r"\bвмест[ое]\b", raw, flags=re.IGNORECASE):
        return None
    discount_match = re.search(r"(\d{1,2})\s*%", raw)
    discount = int(discount_match.group(1)) if discount_match else None
    without_discount = re.sub(r"\d{1,2}\s*%", "", raw)
    without_discount = re.sub(r"[:()]", " ", without_discount)
    normalized = normalize(without_discount)
    tokens = set(normalized.split())
    if tokens & STORE_WORDS:
        return normalized, discount
    if discount is not None and normalized and not re.search(r"\d", normalized):
        return normalized, discount
    return None


def parse_lines(raw_text: str, default_store=None):
    """Делит текст на блоки по точкам.
    Заголовок точки = строка с названием точки, опционально с процентом скидки."""
    blocks = []
    current_store, current_discount, current_lines, current_reasons = default_store, None, [], []
    seen_store_headers = {}

    def flush():
        if current_store is not None and current_lines:
            blocks.append(
                {
                    "store": current_store,
                    "discount_pct": current_discount,
                    "lines": current_lines[:],
                    "reviewReasons": current_reasons[:],
                }
            )

    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue
        if normalize(line) in IGNORED_MESSAGE_LINES:
            continue
        # пропускаем сепараторные строки (----, ====, etc.)
        if re.match(r'^[-=_*]{3,}\s*$', line):
            continue

        header = parse_store_header(line)
        if header:
            flush()
            current_store, current_discount = header
            current_lines = []
            current_reasons = []
            if current_store in seen_store_headers:
                current_reasons.append("повторный заголовок точки")
                if (
                    seen_store_headers[current_store] is not None
                    and current_discount is not None
                    and seen_store_headers[current_store] != current_discount
                ):
                    current_reasons.append("конфликт процента")
            seen_store_headers[current_store] = current_discount
            continue

        if current_store is not None:
            current_lines.append(line)
    flush()
    return blocks


def normalize_size_token(value: str):
    if not value:
        return None
    return SIZE_SYNONYMS.get(normalize(value), normalize(value))


def extract_quantity(text: str):
    qty = None
    unit = None

    def repl(match):
        nonlocal qty, unit
        qty = int(match.group("qty"))
        unit = "пор" if match.group("unit").startswith("пор") else match.group("unit")
        return " "

    cleaned = QTY_RE.sub(repl, text)
    return re.sub(r"\s+", " ", cleaned).strip(), qty, unit


def trailing_small_quantity(text: str):
    m = re.search(r"\b(\d{1,2})\s*$", text)
    if not m:
        return text, None
    qty = int(m.group(1))
    cleaned = text[:m.start()].strip()
    return cleaned, qty


def parse_slash_variants(raw: str):
    size_words = r"(?:мини|мин|макси|макс|большой|большая)"
    pattern = re.compile(
        rf"^(?P<name>.+?)\s+(?P<sizes>{size_words}(?:/{size_words})+)\s+"
        r"(?P<prices>\d+(?:/\d+)+)\s+вместо\s+(?P<origs>\d+(?:/\d+)+)(?P<tail>.*)$",
        re.IGNORECASE,
    )
    m = pattern.match(raw)
    if not m:
        return None
    sizes = [normalize_size_token(x) for x in m.group("sizes").split("/")]
    prices = [int(x) for x in m.group("prices").split("/")]
    origs = [int(x) for x in m.group("origs").split("/")]
    if not (len(sizes) == len(prices) == len(origs)):
        return None
    _, qty, qty_unit = extract_quantity(m.group("tail"))
    qty = qty or 1
    return [
        {
            "name": f"{m.group('name').strip()} {size}",
            "price": price,
            "originalPrice": orig,
            "qty": qty,
            "qtyUnit": qty_unit,
            "size": size,
            "assumedDiscount": False,
            "assumedFromCatalog": False,
            "reviewReasons": ["разделено на несколько карточек"],
        }
        for size, price, orig in zip(sizes, prices, origs)
    ]


def parse_item_line(line: str, header_discount=None):
    raw = preprocess_line(line).rstrip(".")
    if not raw or "%" in raw:
        return []

    quantity_price = re.match(r"^(?P<name>.+?)\s+(?P<qty>\d{1,2})/(?P<price>\d{2,})$", raw)
    if quantity_price:
        price = int(quantity_price.group("price"))
        return [{
            "name": quantity_price.group("name").strip(),
            "price": price,
            "originalPrice": round(price / (1 - DEFAULT_DISCOUNT_PCT / 100)),
            "qty": int(quantity_price.group("qty")),
            "qtyUnit": "шт",
            "size": None,
            "assumedDiscount": True,
            "assumedFromCatalog": False,
            "trustedQuantityPriceFormat": True,
            "reviewReasons": [],
        }]

    slash_variants = parse_slash_variants(raw)
    if slash_variants:
        return slash_variants

    review_reasons = []
    if re.search(r"\bвместо\b\s*\d", raw):
        before, after = raw.split("вместо", 1)
        after = after.strip()
        orig_match = re.search(r"\b\d+\b", after)
        if not orig_match:
            return [{"rawLine": line, "error": "не нашли originalPrice после 'вместо'", "reviewReasons": ["не распознан формат строки"]}]
        orig = int(orig_match.group(0))
        after_tail = after[orig_match.end():]

        before, qty_before, unit_before = extract_quantity(before)
        after_tail, qty_after, unit_after = extract_quantity(after_tail)
        qty = qty_after or qty_before or 1
        qty_unit = unit_after or unit_before

        numbers = list(re.finditer(r"\b\d+\b", before))
        if not numbers:
            return [{"rawLine": line, "error": "не нашли price перед 'вместо'", "reviewReasons": ["не распознан формат строки"]}]
        price_match = numbers[-1]
        price = int(price_match.group(0))
        name = (before[:price_match.start()] + " " + before[price_match.end():]).strip()
        if not name:
            return [{"rawLine": line, "error": "не нашли название товара", "reviewReasons": ["не распознан формат строки"]}]
        return [{
            "name": name,
            "price": price,
            "originalPrice": orig,
            "qty": qty,
            "qtyUnit": qty_unit,
            "size": extract_size(name),
            "assumedDiscount": False,
            "assumedFromCatalog": False,
            "reviewReasons": review_reasons,
        }]

    text, qty, qty_unit = extract_quantity(raw)
    numbers = list(re.finditer(r"\b\d+\b", text))
    if numbers:
        last = numbers[-1]
        value = int(last.group(0))
        name_without_number = (text[:last.start()] + " " + text[last.end():]).strip()
        if value <= 50 and header_discount is not None:
            qty = qty or value
            return [{
                "name": name_without_number,
                "price": None,
                "originalPrice": None,
                "qty": qty or 1,
                "qtyUnit": qty_unit,
                "size": extract_size(name_without_number),
                "assumedDiscount": False,
                "assumedFromCatalog": True,
                "reviewReasons": [],
            }]
        price = value
        orig = round(price / (1 - DEFAULT_DISCOUNT_PCT / 100))
        return [{
            "name": name_without_number,
            "price": price,
            "originalPrice": orig,
            "qty": qty or 1,
            "qtyUnit": qty_unit,
            "size": extract_size(name_without_number),
            "assumedDiscount": True,
            "assumedFromCatalog": False,
            "reviewReasons": ["нет 'вместо', скидка посчитана по умолчанию"],
        }]

    if header_discount is None:
        return [{"rawLine": line, "error": "нет цены и процента в заголовке", "reviewReasons": ["нет цены"]}]

    return [{
        "name": text,
        "price": None,
        "originalPrice": None,
        "qty": qty or 1,
        "qtyUnit": qty_unit,
        "size": extract_size(text),
        "assumedDiscount": False,
        "assumedFromCatalog": True,
        "reviewReasons": [],
    }]


def extract_size(name_raw: str):
    tokens = normalize(name_raw).split()
    for t in tokens:
        if t in SIZE_SYNONYMS:
            return SIZE_SYNONYMS[t]
    return None


def find_size_data(match, size=None, original_price=None, qty_unit=None):
    if not match:
        return None, None
    sizes = match.get("sizes", {})
    if not sizes:
        return None, None

    aliases = []
    if size:
        aliases.append(size)
        if size == "большой":
            aliases.extend(["большая", "макси"])
        if size == "средний":
            aliases.append("половина")
    if qty_unit == "пор":
        aliases.append("порция")

    for candidate in aliases:
        if candidate in sizes:
            return candidate, sizes[candidate]

    if original_price is not None:
        for label, data in sizes.items():
            if data.get("price") == original_price:
                return label, data

    if len(sizes) == 1:
        label, data = next(iter(sizes.items()))
        return label, data

    return None, None


def partner_key(store):
    value = normalize(store or "")
    if "coffi" in value or "бокейхан" in value:
        return "coffi"
    if "royalty" in value or any(
        token in value for token in (
            "республика", "жаннур", "абая", "сембинов", "аружан", "сыганак", "жиенкулов"
        )
    ):
        return "royalty"
    return None


def find_partner_image(name, store, prefer_store=False):
    partner = partner_key(store)
    image_dir = IMAGES_DIR / partner if partner else None
    if not image_dir or not image_dir.exists():
        return None

    files = [path for path in image_dir.rglob("*") if path.is_file()]
    if not files:
        return None

    target = store if prefer_store else name
    if prefer_store and "абая" in normalize(store or ""):
        target = "жаннур"
    target_tokens = tokenset(target or "")
    best_path, best_score = None, 0.0
    for path in files:
        stem = normalize(path.stem)
        stem_tokens = tokenset(stem)
        if not stem_tokens:
            continue
        overlap = len(target_tokens & stem_tokens) / len(target_tokens | stem_tokens) if target_tokens else 0
        ratio = SequenceMatcher(None, normalize(target or ""), stem).ratio()
        score = max(overlap, ratio)
        if score > best_score:
            best_path, best_score = path, score

    if best_path and best_score >= 0.52:
        return str(best_path.relative_to(IMAGES_DIR))

    fallback_words = ("витрина", "республика") if partner == "royalty" else ("витрина", "кофи")
    fallback = next(
        (path for path in files if any(word in normalize(path.stem) for word in fallback_words)),
        None,
    )
    return str(fallback.relative_to(IMAGES_DIR)) if fallback else None


def build_bundle_card(store, number, title, components, total, category_name=None, expiry_days=DEFAULT_EXPIRY_DAYS):
    original_price = round(total / (1 - DEFAULT_DISCOUNT_PCT / 100))
    expiry = (datetime.date.today() + datetime.timedelta(days=expiry_days)).isoformat() + "T21:00:00"
    image = find_partner_image(title, store, prefer_store=True)
    clean_title = re.sub(r"[^\w\s&-]", "", title or "", flags=re.UNICODE).strip()
    clean_components = [re.sub(r"^[^\w]+", "", item).strip() for item in components]
    box_name = f"Бокс №{number}" + (f" — {clean_title}" if clean_title else "")
    return {
        "storeName": store,
        "storeId": STORE_IDS.get(normalize(store)),
        "rawLine_name": box_name,
        "matchedCanonical": None,
        "matchScore": 1.0,
        "sizeDetected": None,
        "name": box_name,
        "description": "Состав: " + "; ".join(clean_components),
        "price": total,
        "originalPrice": original_price,
        "discountPercentage": DEFAULT_DISCOUNT_PCT,
        "assumedDiscount": True,
        "assumedFromCatalog": False,
        "stockQuantity": 1,
        "categoryName": category_name or PARTNER_CATEGORY.get(partner_key(store), CATEGORY_NAME),
        "images": [image] if image else [],
        "expiryDate": expiry,
        "status": STATUS,
        "reviewReasons": [],
        "needsReview": False,
    }


def parse_bundle_lines(store, lines, category_name=None, expiry_days=DEFAULT_EXPIRY_DAYS):
    cards = []
    consumed = set()
    inline_price_re = re.compile(
        r"бокс\s*№?\s*(\d+)\s*[—–-]\s*(\d[\d\s]*)\s*(?:₸|тг|т)?\s*$",
        re.IGNORECASE,
    )
    header_re = re.compile(r"бокс\s*№?\s*(\d+)\s*[—–-]\s*(.+)$", re.IGNORECASE)
    total_re = re.compile(r"итого\s*:\s*(\d+)", re.IGNORECASE)
    index = 0
    while index < len(lines):
        inline_header = inline_price_re.search(lines[index])
        header = header_re.search(lines[index])
        if not header:
            index += 1
            continue
        start = index
        number = header.group(1)
        title = "" if inline_header else header.group(2)
        total = int(re.sub(r"\s+", "", inline_header.group(2))) if inline_header else None
        components = []
        index += 1
        while index < len(lines):
            total_match = total_re.search(lines[index])
            if total_match:
                total = int(total_match.group(1))
                index += 1
                break
            if inline_price_re.search(lines[index]) or header_re.search(lines[index]):
                break
            components.append(lines[index])
            index += 1
        if total is not None:
            consumed.update(range(start, index))
            cards.append(build_bundle_card(
                store, number, title, components, total, category_name, expiry_days
            ))
    return cards, consumed


def build_card(store, parsed, catalog, header_discount=None, block_reasons=None, expiry_days=DEFAULT_EXPIRY_DAYS, category_name=None):
    block_reasons = block_reasons or []
    name_raw = parsed["name"]
    qty = parsed.get("qty", 1)
    orig = parsed.get("originalPrice")
    price = parsed.get("price")
    size = parsed.get("size") or extract_size(name_raw)
    desired_size = size or ("порция" if parsed.get("qtyUnit") == "пор" else None)
    match, score, ranked = best_match(name_raw, catalog, original_price=orig, desired_size=desired_size)
    size_label, size_data = find_size_data(match, size, orig, parsed.get("qtyUnit"))
    catalog_confirmed = bool(match and size_data and orig is not None and size_data.get("price") == orig)

    review_reasons = list(dict.fromkeys(block_reasons + parsed.get("reviewReasons", [])))
    if parsed.get("assumedFromCatalog"):
        if match and size_data and header_discount is not None:
            orig = size_data["price"]
            price = round(orig * (1 - header_discount / 100))
            review_reasons.append("цена взята из каталога")
        else:
            review_reasons.append("не удалось взять цену из каталога")

    discount = round((1 - price / orig) * 100) if price is not None and orig else 0
    expiry = (
        datetime.date.today() + datetime.timedelta(days=expiry_days)
    ).isoformat() + "T21:00:00"

    image = None
    description = ""
    if match:
        image = size_data.get("image") if size_data else match.get("image")
        description = match.get("description", "")
        detail = size_data.get("detail") if size_data else None
        if detail:
            description = (description + " " + detail).strip()

    explicit_price_without_catalog = (
        match is None
        and price is not None
        and orig is not None
        and (not parsed.get("assumedDiscount") or parsed.get("trustedQuantityPriceFormat"))
    )
    if match is None and not explicit_price_without_catalog:
        review_reasons.append("нет товара в каталоге")
    elif match and score < 0.75 and not catalog_confirmed:
        review_reasons.append("слабый матч")
    if match and match.get("sizes") and size_data is None and not catalog_confirmed:
        review_reasons.append("не выбран размер")
    if (
        ranked
        and len(ranked) > 1
        and ranked[0][0] - ranked[1][0] < 0.04
        and not catalog_confirmed
        and not parsed.get("trustedQuantityPriceFormat")
    ):
        review_reasons.append("неоднозначный матч")
    if price is None or orig is None:
        review_reasons.append("нет цены")
    elif parsed.get("assumedDiscount") and not catalog_confirmed and not parsed.get("trustedQuantityPriceFormat"):
        review_reasons.append("нет 'вместо', скидка посчитана по умолчанию")
    elif parsed.get("assumedDiscount") and catalog_confirmed:
        review_reasons = [reason for reason in review_reasons if reason != "нет 'вместо', скидка посчитана по умолчанию"]

    review_reasons = list(dict.fromkeys(review_reasons))

    resolved_image = image or find_partner_image(name_raw, store)
    return {
        "storeName": store,
        "storeId": STORE_IDS.get(normalize(store)),
        "rawLine_name": name_raw,
        "matchedCanonical": match["canonical"] if match else None,
        "matchScore": round(score, 2),
        "sizeDetected": size_label or size,
        "name": (match["canonical"] if match else name_raw)
        + (f" ({size_label or size})" if (size_label or size) and match else ""),
        "description": description,
        "price": price,
        "originalPrice": orig,
        "discountPercentage": discount,
        "assumedDiscount": parsed.get("assumedDiscount", False),
        "assumedFromCatalog": parsed.get("assumedFromCatalog", False),
        "stockQuantity": qty,
        "categoryName": category_name or PARTNER_CATEGORY.get(partner_key(store), CATEGORY_NAME),
        "images": [resolved_image] if resolved_image else [],
        "expiryDate": expiry,
        "status": STATUS,
        "reviewReasons": review_reasons,
        "needsReview": bool(
            [r for r in review_reasons if r not in {"цена взята из каталога", "разделено на несколько карточек"}]
        ),
    }


def process(raw_text: str, catalog: list, expiry_days=DEFAULT_EXPIRY_DAYS, default_store=None, default_category=None):
    results = []
    for block in parse_lines(raw_text, default_store=default_store):
        store = block["store"]
        header_discount = block.get("discount_pct")
        block_reasons = block.get("reviewReasons", [])
        bundle_cards, consumed = parse_bundle_lines(
            store, block["lines"], category_name=default_category, expiry_days=expiry_days
        )
        results.extend(bundle_cards)
        for line_index, line in enumerate(block["lines"]):
            if line_index in consumed:
                continue
            parsed_items = parse_item_line(line, header_discount)
            if not parsed_items:
                continue
            for parsed in parsed_items:
                if parsed.get("error"):
                    results.append(
                        {
                            "storeName": store,
                            "rawLine": line,
                            "needsReview": True,
                            "reviewReasons": list(dict.fromkeys(block_reasons + parsed.get("reviewReasons", []))),
                            "error": parsed["error"],
                        }
                    )
                    continue
                results.append(
                    build_card(
                        store,
                        parsed,
                        catalog,
                        header_discount,
                        block_reasons,
                        expiry_days,
                        category_name=default_category,
                    )
                )
    return results


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Использование: python3 parse_daily.py raw_messages.txt catalog.json", file=sys.stderr)
        sys.exit(1)

    raw_path, catalog_path = sys.argv[1], sys.argv[2]
    with open(raw_path, encoding="utf-8") as f:
        raw_text = f.read()
    with open(catalog_path, encoding="utf-8") as f:
        catalog = json.load(f)

    out = process(raw_text, catalog)
    review = [r for r in out if r.get("needsReview")]

    print(json.dumps(out, ensure_ascii=False, indent=2))
    print(f"\n--- ИТОГО: {len(out)} позиций, требуют проверки: {len(review)} ---", file=sys.stderr)
    for r in review:
        label = r.get("rawLine") or r.get("rawLine_name")
        print(f"  [{r.get('storeName')}] {label}  (score={r.get('matchScore')})", file=sys.stderr)
