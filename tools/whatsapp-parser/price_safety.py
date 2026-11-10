"""Keep contact numbers and implausible amounts out of published prices."""
from decimal import Decimal, InvalidOperation
from functools import wraps
import re

MAX_PRICE = Decimal('1000000')
PRICE_ERROR = 'Цена должна быть больше 0 и не выше 1 000 000 ₸; проверьте исходное сообщение'
# Strip before preprocessing removes phone punctuation and joins numeric fragments.
CONTACT = re.compile(r'@\d{7,}|(?<!\d)(?:\+?[78][\s()-]*\d{3}[\s()-]*\d{3}[\s()-]*\d{2}[\s()-]*\d{2})(?!\d)')
DATE = re.compile(r'(?<!\d)\d{1,2}[./]\d{1,2}[./]\d{4}(?!\d)')
TIME = re.compile(r'(?<!\d)\d{1,2}:\d{2}(?!\d)')


def price_error(card):
    for key in ('price', 'originalPrice'):
        value = card.get(key)
        if value is None:
            continue  # Existing missing-price validation supplies its own message.
        try:
            amount = Decimal(str(value))
            if isinstance(value, bool) or not amount.is_finite() or not 0 < amount <= MAX_PRICE:
                return PRICE_ERROR
        except (InvalidOperation, ValueError, TypeError):
            return PRICE_ERROR
    return None


def guard_cards(cards):
    for card in cards:
        error = price_error(card)
        if error:
            card['error'] = error
            card['needsReview'] = True
            card['reviewReasons'] = list(dict.fromkeys(card.get('reviewReasons', []) + [error]))
    return cards


def safe_item_parser(parse):
    @wraps(parse)
    def guarded(line, *args, **kwargs):
        cleaned = TIME.sub(' ', DATE.sub(' ', CONTACT.sub(' ', line)))
        if cleaned != line and not re.search(r'\d', cleaned):
            return []
        return guard_cards(parse(cleaned, *args, **kwargs))
    return guarded


def safe_card_parser(parse):
    @wraps(parse)
    def guarded(*args, **kwargs):
        return guard_cards(parse(*args, **kwargs))
    return guarded
