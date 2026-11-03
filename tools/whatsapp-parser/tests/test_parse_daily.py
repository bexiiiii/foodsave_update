import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from parse_daily import find_partner_image, process  # noqa: E402


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

    def test_discount_header_mismatch_requires_review(self):
        card = self.parse_one("Пате Бухар жырау: 30%\nАргентина большой 7800 вместо 13000 1 шт")
        self.assertEqual(card["discountPercentage"], 40)
        self.assertIn("процент скидки не совпадает с ценами", card["reviewReasons"])
        self.assertTrue(card["needsReview"])

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
        self.assertTrue(all(x["needsReview"] for x in out))

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

    def test_explicit_price_without_catalog_at_pate_requires_review(self):
        card = self.parse_one("Туран\nНовый тестовый бокс 1110тг вместо 1850тг 9уп")
        self.assertEqual(card["price"], 1110)
        self.assertEqual(card["originalPrice"], 1850)
        self.assertEqual(card["stockQuantity"], 9)
        self.assertEqual(card["discountPercentage"], 40)
        self.assertTrue(card["needsReview"])

    def test_unknown_catalog_item_requires_review_even_with_explicit_prices(self):
        card = self.parse_one("Пате Бухар жырау\nДесерт снежная вишня с фисташкой 5220 вместо 8700 1 шт")
        self.assertTrue(card["needsReview"])

    def test_cherry_pie_does_not_match_cherry_tart(self):
        card = self.parse_one("Пате Бухар жырау\nПирог вишня большой 5220 вместо 8700 1 шт")
        self.assertEqual(card.get("matchedCanonical"), "Вишневый пирог")
        self.assertNotEqual(card.get("matchedCanonical"), "Вишневый тарт")
        self.assertFalse(card["needsReview"])
        self.assertNotIn("argentina_s_govyadinoi.jpg", card["images"])

    def test_generic_single_word_pie_is_not_confirmed_by_price(self):
        card = self.parse_one("Пате Бухар жырау\nПирог 5220 вместо 8700 1 шт")
        self.assertTrue(card["needsReview"])
        self.assertIsNone(card.get("matchedCanonical"))

    def test_billion_price_is_reviewed_not_published(self):
        card = self.parse_one("Пате Бухар жырау\nДобрый вечер @Foodsave 77000000000 вместо 96343004598")
        self.assertTrue(card["needsReview"])

    def test_extreme_catalog_price_is_reviewed(self):
        card = self.parse_one("Пате Туран\nУлитка с шоколадом 1000000000 вместо 1000000000 1 шт")
        self.assertTrue(card["needsReview"])
        self.assertIn("цена вне допустимого диапазона", card["reviewReasons"])

    def test_greeting_without_offer_produces_no_cards(self):
        self.assertEqual(process("Добрый вечер @Foodsave", self.catalog), [])

    def test_catalog_three_cherry_pie_is_distinct_from_cherry_tart_with_exact_photo(self):
        card = self.parse_one("Пате Бухар жырау\nПирог вишня большой 5220 вместо 8700 1 шт")
        self.assertEqual(card["matchedCanonical"], "Вишневый пирог")
        self.assertEqual(card["originalPrice"], 8700)
        self.assertEqual(card["images"], ["pate/cherry-pie-large.jpg"])
        self.assertTrue((ROOT / "images" / card["images"][0]).is_file())

    def test_catalog_three_spanish_cheesecake_has_mini_and_large_prices(self):
        mini = self.parse_one("Пате Бухар жырау\nИспанский чизкейк мини 2040 вместо 3400 1 шт")
        large = self.parse_one("Пате Бухар жырау\nИспанский чизкейк макси 6660 вместо 11100 1 шт")
        self.assertEqual(mini["originalPrice"], 3400)
        self.assertEqual(large["originalPrice"], 11100)
        self.assertEqual(mini["matchedCanonical"], "Испанский чизкейк")
        self.assertEqual(large["matchedCanonical"], "Испанский чизкейк")

    def test_scandinavian_large_alias_matches_exact_catalog_photo(self):
        card = self.parse_one("Пате Бухар жырау\nСкандинавский большой 7800 вместо 13000 2 шт")
        self.assertEqual(card["matchedCanonical"], "Скандинавский с лососем")
        self.assertEqual(card["originalPrice"], 13000)
        self.assertEqual(card["stockQuantity"], 2)
        self.assertEqual(card["images"], ["pate/scandinavian.png"])
        self.assertFalse(card["needsReview"])

    def test_catalog_three_updates_berry_cheesecake_portion_price(self):
        card = self.parse_one("Пате Бухар жырау\nЧизкейк ягодный порция 1680 вместо 2800 1 шт")
        self.assertEqual(card["matchedCanonical"], "Чизкейк с ягодами")
        self.assertEqual(card["originalPrice"], 2800)

    def test_catalog_three_adds_bordeaux_marseille_and_flavored_cinnabon(self):
        bordeaux = self.parse_one("Пате Туран\nБордо мини 1800 вместо 3000 1 шт")
        marseille = self.parse_one("Пате Туран\nМарсель макси 5280 вместо 8800 1 шт")
        cinnamon = self.parse_one("Пате Туран\nСиннабон с черникой 1140 вместо 1900 1 шт")
        self.assertEqual(bordeaux["matchedCanonical"], "Бордо")
        self.assertEqual(marseille["matchedCanonical"], "Марсель")
        self.assertEqual(cinnamon["matchedCanonical"], "Синнабон с черникой")
        self.assertEqual(cinnamon["images"], ["pate/cinnamon-roll-blueberry.jpg"])

    def test_missing_local_product_photo_is_marked_for_review(self):
        card = self.parse_one("Пате Бухар жырау\nЧизкейк печенье 480 вместо 800 1 шт")
        self.assertEqual(card["images"], [])
        self.assertTrue(card["photoNeedsReview"])

    def test_partner_photo_fallback_uses_exact_product_or_matching_venue(self):
        self.assertEqual(find_partner_image("десерт неизвестный", "Жаннур"), "royalty/жаннур.jpg")
        self.assertIsNone(find_partner_image("десерт неизвестный", "Royalty"))
        self.assertEqual(find_partner_image("десерт неизвестный", "Coffi"), "coffi/Витрина кофи.jpg")
        self.assertTrue(find_partner_image("десерт неизвестный", "Coffi", return_meta=True)["isFallback"])

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
        self.assertTrue(all(item["needsReview"] for item in out))
        self.assertTrue(all(item["photoIsFallback"] for item in out))

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
        self.assertTrue(all(item["needsReview"] for item in out))
        self.assertTrue(all(item["photoIsFallback"] for item in out))

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
        self.assertTrue(all(item["needsReview"] for item in out))


if __name__ == "__main__":
    unittest.main()
