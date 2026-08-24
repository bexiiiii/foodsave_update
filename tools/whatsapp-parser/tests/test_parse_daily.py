import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from parse_daily import process  # noqa: E402


class ParseDailyHeavyInputTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(ROOT / "catalog_paste.json", encoding="utf-8") as f:
            cls.catalog = json.load(f)

    def parse_one(self, body):
        out = process(body, self.catalog)
        self.assertEqual(len(out), 1)
        return out[0]

    def test_quantity_before_price(self):
        card = self.parse_one("Пате Ишим\nкольцо творожное 1 шт 1020 тг вместо 1700")
        self.assertEqual(card["matchedCanonical"], "Кольца творожные")
        self.assertEqual(card["price"], 1020)
        self.assertEqual(card["originalPrice"], 1700)
        self.assertEqual(card["stockQuantity"], 1)
        self.assertFalse(card["needsReview"])

    def test_catalog_price_from_discount_header(self):
        card = self.parse_one("Пате Ишим: 40%\nулитка 2 шт")
        self.assertEqual(card["matchedCanonical"], "Улитка с шоколадом")
        self.assertEqual(card["price"], 870)
        self.assertEqual(card["originalPrice"], 1450)
        self.assertEqual(card["stockQuantity"], 2)
        self.assertTrue(card["assumedFromCatalog"])
        self.assertFalse(card["needsReview"])

    def test_portion_unit_guides_catalog_match(self):
        card = self.parse_one("Пате Ишим: 40%\nфисташка малина 1 пор")
        self.assertEqual(card["matchedCanonical"], "Фисташковый пирог с малиной")
        self.assertEqual(card["sizeDetected"], "порция")
        self.assertEqual(card["price"], 1380)
        self.assertFalse(card["needsReview"])

    def test_slash_variant_splits_into_two_cards(self):
        out = process(
            "Пате Толе би\n"
            "Безглютеновая галета с нектарином макси/мини 3480/1590 вместо 5800/2650",
            self.catalog,
        )
        self.assertEqual(len(out), 2)
        self.assertEqual([x["price"] for x in out], [3480, 1590])
        self.assertEqual([x["originalPrice"] for x in out], [5800, 2650])
        self.assertTrue(all(not x["needsReview"] for x in out))

    def test_catalog_confirmed_lines_without_vse_pass(self):
        out = process(
            "Ишим\n"
            "Тарт фисташка малина макси 1 шт 7200\n"
            "Фисташка малина 7 шт 1380\n"
            "Меренговый рулет 2 шт 1740\n"
            "Тарт лимон мини 1 шт 960 тг\n"
            "Тарт шоколадный мини 2 шт 960 тг",
            self.catalog,
        )
        self.assertEqual(len(out), 5)
        self.assertEqual([x["matchedCanonical"] for x in out], [
            "Фисташка-малина тарт",
            "Фисташка-малина тарт",
            "Меренговый рулет",
            "Лимонный тарт",
            "Шоколадный тарт",
        ])
        self.assertTrue(all(not x["needsReview"] for x in out))

    def test_trailing_notes_after_dash_are_ignored(self):
        card = self.parse_one("Ишим\nМеренговый рулет 2 шт 1740 - нет 'вместо', скидка посчитана по умолчанию")
        self.assertEqual(card["matchedCanonical"], "Меренговый рулет")
        self.assertEqual(card["price"], 1740)
        self.assertEqual(card["originalPrice"], 2900)
        self.assertFalse(card["needsReview"])

    def test_explicit_price_without_catalog_can_publish_as_generic_card(self):
        card = self.parse_one("Туран\nНовый тестовый бокс 1110тг вместо 1850тг 9уп")
        self.assertEqual(card["name"], "новый тестовый бокс")
        self.assertEqual(card["price"], 1110)
        self.assertEqual(card["originalPrice"], 1850)
        self.assertEqual(card["stockQuantity"], 9)
        self.assertEqual(card["discountPercentage"], 40)
        self.assertFalse(card["needsReview"])

    def test_royalty_bundle_message_creates_four_boxes(self):
        out = process(
            "добрый вечер, республика\n\n"
            "🧡 Бокс №1 — Сытный 🥯🌭🍪\n"
            "🥯 Бейгл с курицей — 750 ₸\n"
            "🌭 Френч-дог сырный — 700 ₸\n"
            "🍪 Муравейник ×2 — 250 ₸\n"
            "💰 Итого: 1700 ₸\n\n"
            "💚 Бокс №2 — Классический 🌭🍪\n"
            "🌭 Френч-дог классический — 700 ₸\n"
            "🍪 Муравейник ×4 — 500 ₸\n"
            "💰 Итого: 1200 ₸\n\n"
            "💛 Бокс №3 — Бейгл & Профитроли 🥯🍰🍪\n"
            "🥯 Бейгл с курицей — 750 ₸\n"
            "🍰 Профитроли — 710 ₸\n"
            "🍪 Муравейник ×2 — 250 ₸\n"
            "💰 Итого: 1710 ₸\n\n"
            "🩷 Бокс №4 — Сырный 🌭🍪\n"
            "🌭 Френч-дог сырный — 700 ₸\n"
            "🍪 Муравейник ×5 — 625 ₸\n"
            "💰 Итого: 1325 ₸",
            self.catalog,
            default_store="royalty",
            default_category="Кофейня",
        )
        self.assertEqual(len(out), 4)
        self.assertEqual([item["price"] for item in out], [1700, 1200, 1710, 1325])
        self.assertTrue(all(item["storeName"] == "республика" for item in out))
        self.assertTrue(all(item["categoryName"] == "Кофейня" for item in out))
        self.assertTrue(all(not item["needsReview"] for item in out))

    def test_coffi_quantity_price_format_uses_group_store(self):
        out = process(
            "Добрый вечер\n"
            "Панини с курицей -1/1890тг\n"
            "Ролл цезарь -1/1800\n"
            "Добрый вечер\n"
            "тефтели в сливочно-грибном соусе с макаронами – 1/1990\n"
            "все газуем",
            self.catalog,
            default_store="coffi",
            default_category="Кофейня",
        )
        self.assertEqual(len(out), 3)
        self.assertEqual([item["price"] for item in out], [1890, 1800, 1990])
        self.assertEqual([item["stockQuantity"] for item in out], [1, 1, 1])
        self.assertTrue(all(item["storeName"] == "coffi" for item in out))
        self.assertTrue(all(not item["needsReview"] for item in out))

    def test_royalty_multiple_branches_with_inline_box_prices(self):
        out = process(
            "Абая 48\n\n"
            "Бокс 1 — 1 150 ₸\n\n"
            "Миндальный круассан — 1 шт.\n"
            "Круассан с соусом карри — 1 шт.\n\n"
            "Бокс 2 — 1 150 ₸\n\n"
            "Миндальный круассан — 1 шт.\n"
            "Круассан с соусом карри — 1 шт.\n\n"
            "Сыганак 3\n\n"
            "Бокс 1 - 1460 тг\n\n"
            "Панини слойка с курицей - 1\n"
            "Профитроли сливочные - 1\n\n"
            "Бокс 2 - 1460 тг\n\n"
            "Бейгл с курицей и песто - 1\n"
            "Профитроли сливочные - 1\n\n"
            "Бокс 3 - 1450 тг\n\n"
            "Панини слойка с курицей - 1\n"
            "Чизкейк - 1",
            self.catalog,
            default_store="royalty",
            default_category="Кофейня",
        )
        self.assertEqual(len(out), 5)
        self.assertEqual([item["price"] for item in out], [1150, 1150, 1460, 1460, 1450])
        self.assertEqual([item["storeName"] for item in out], [
            "абая 48", "абая 48", "сыганак 3", "сыганак 3", "сыганак 3",
        ])
        self.assertTrue(all(item["name"].startswith("Бокс №") for item in out))
        self.assertEqual(out[0]["images"], ["royalty/жаннур.jpg"])
        self.assertTrue(all(not item["needsReview"] for item in out))


if __name__ == "__main__":
    unittest.main()
