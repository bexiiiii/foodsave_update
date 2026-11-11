"""Identify Pâté's Turan and Tole Bi locations in headers and asset paths."""
import re
import unicodedata


def location_words(text):
    text = unicodedata.normalize("NFC", text or "").casefold()
    text = re.sub(r"[^\w]+|_", " ", text).strip()
    text = re.sub(r"\b(?:pâté|pate)\b", "пате", text)
    text = re.sub(r"\b(?:тұран|turan)\b", "туран", text)
    return re.sub(r"\b(?:т[өо]ле\s*би|t[oö]le\s*bi)\b", "толе би", text)


def pate_branch(label):
    match = re.fullmatch(
        r"(?:пате\s+)?(?:(?:улица|ул|проспект|пр)\s+)?(туран|толе би)"
        r"(?:\s+\d+[а-яa-z]?(?:\s+\d+[а-яa-z]?)?)?(?:\s+пате)?", location_words(label),
    )
    return match.group(1) if match else None


def photo_matches_branch(path, branch):
    labels = set(re.findall(r"\b(?:туран|толе би)\b", location_words(path)))
    return not labels or labels == {branch}
