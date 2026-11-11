import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from parse_daily import process
from upload_to_crm import resolve_store_id


class PateBranchPhotoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads((ROOT / "catalog_paste.json").read_text())

    def test_two_branches_in_one_message_override_chat_default(self):
        rows = process(
            "Төле-би:\nКиш с семгой 1740 вместо 2900 1шт\n"
            "Тұран:\nСлойка творожная 720 вместо 1200 3шт",
            self.catalog, default_store="Пате Туран",
        )
        self.assertEqual([(r["storeName"], r["images"]) for r in rows], [
            ("толе би", ["kish_s_semgoi.jpg"]), ("туран", ["sloika_tvorozhnaya.jpg"])])

    def test_product_with_brand_does_not_switch_branch_or_disappear(self):
        rows = process("Пате Туран\nЧизкейк Пате 1шт 1620 тг\n"
                       "Киш с семгой 1740 вместо 2900 1шт", self.catalog)
        self.assertEqual([r["storeName"] for r in rows], ["пате туран", "пате туран"])
        self.assertEqual(rows[0]["rawLine_name"], "чизкейк пате")
        self.assertEqual(rows[0]["images"], [])
        self.assertTrue(rows[0]["needsReview"])
        self.assertEqual(rows[1]["images"], ["kish_s_semgoi.jpg"])

    def test_no_unrelated_photo_for_unknown_flavour(self):
        for branch in ["Толе би", "Туран"]:
            row, = process(f"{branch}\nСлойка манго 720 вместо 1200 3шт", self.catalog)
            self.assertEqual(row["images"], [])
            self.assertEqual(row["name"], "слойка манго")
            self.assertTrue(row["needsReview"])

    def test_repeated_address_before_first_product(self):
        row, = process("Толе Би:\nТоле би\nяблочно-фисташковый тарт мини 1080 вместо 1800", self.catalog)
        self.assertEqual(row["images"], ["yabloko-fistashka_tart.jpg"])
        self.assertFalse(row["needsReview"], row["reviewReasons"])

    def test_branch_marked_and_shared_images(self):
        for path, allowed in [("pate/tole_bi/galeta.jpg", False),
                              ("pate/turan/galeta.jpg", True), ("pate/galeta.jpg", True)]:
            catalog = [{"canonical": "Галета", "sizes": {"мини": {"price": 1000, "image": path}}}]
            row, = process("Туран\nГалета мини 600 вместо 1000 1шт", catalog)
            self.assertEqual(row["images"], [path] if allowed else [])

    def test_crm_store_selection_does_not_guess_another_branch(self):
        stores = [{"id": 1, "name": "Pâté | Толе би"}, {"id": 2, "name": "Pate | Тұран"}]
        self.assertEqual(resolve_store_id("Пате Туран", stores, {})[0], 2)
        self.assertEqual(resolve_store_id("Төле Би", stores, {})[0], 1)
        self.assertIsNone(resolve_store_id("Туран", stores[:1], {})[0])
