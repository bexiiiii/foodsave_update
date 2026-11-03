import io
import unittest
import json
import math
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlparse

from review_store import ReviewStore
from parse_daily import process
from server import CATALOG, Handler, MAX_REQUEST_BYTES, apply_scope_default_image, catalog_for_scope, filter_confident_items, is_review_item_publishable, load_webhook_events, message_log_record, prepare_review_item, upload_one_card


class ParserRequestValidationTest(unittest.TestCase):
    def test_rejects_oversized_json_body_before_read(self):
        handler = Handler.__new__(Handler)
        handler.headers = {"Content-Length": str(MAX_REQUEST_BYTES + 1)}
        handler.rfile = io.BytesIO(b"unused")
        with self.assertRaisesRegex(ValueError, "too large"):
            handler.read_json()

    def test_rejects_invalid_content_length(self):
        handler = Handler.__new__(Handler)
        handler.headers = {"Content-Length": "many"}
        handler.rfile = io.BytesIO(b"unused")
        with self.assertRaisesRegex(ValueError, "invalid content length"):
            handler.read_json()

    def test_rejects_non_object_json_body(self):
        handler = Handler.__new__(Handler)
        handler.headers = {"Content-Length": "2"}
        handler.rfile = io.BytesIO(b"[]")
        with self.assertRaisesRegex(ValueError, "must be an object"):
            handler.read_json()

    def test_admin_access_fails_closed_without_token(self):
        handler = Handler.__new__(Handler)
        handler.headers = {"X-Parser-Admin-Token": "guess"}
        with patch("server.load_config", return_value={"green_api": {"admin_api_token": ""}}):
            self.assertFalse(handler.verify_admin_access())

    def test_admin_access_requires_distinct_configured_token(self):
        handler = Handler.__new__(Handler)
        handler.headers = {"X-Parser-Admin-Token": "admin-secret"}
        with patch("server.load_config", return_value={"green_api": {
            "admin_api_token": "admin-secret", "webhook_token": "webhook-secret",
        }}):
            self.assertTrue(handler.verify_admin_access())
        with patch("server.load_config", return_value={"green_api": {
            "admin_api_token": "SET_A_LONG_RANDOM_TOKEN", "webhook_token": "webhook-secret",
        }}):
            self.assertFalse(handler.verify_admin_access())

    def test_request_log_never_persists_webhook_query_token(self):
        handler = Handler.__new__(Handler)
        handler.path = "/api/green-api/webhook?token=secret-value"
        handler.address_string = lambda: "127.0.0.1"
        output = io.StringIO()
        with redirect_stdout(output):
            handler.log_message('"%s"', f"POST {handler.path} HTTP/1.1")
        self.assertNotIn("secret-value", output.getvalue())
        self.assertIn("/api/green-api/webhook", output.getvalue())
        with patch("server.load_config", return_value={"green_api": {
            "admin_api_token": "same-secret", "webhook_token": "same-secret",
        }}):
            self.assertFalse(handler.verify_admin_access())

    def test_webhook_log_view_returns_newest_entries_first(self):
        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "events.jsonl"
            path.write_text('{"n":1}\n{"n":2}\n{"n":3}\n', encoding="utf-8")
            with patch("server.WEBHOOK_LOG_PATH", path):
                self.assertEqual(load_webhook_events(2), [{"n": 3}, {"n": 2}])

    def test_greeting_webhook_creates_no_product_and_sends_no_reply(self):
        import tempfile

        config = {"green_api": {
            "webhook_token": "webhook-secret", "auto_upload": True,
            "allowed_group_chat_ids": ["123-456@g.us"],
            "group_defaults_by_chat_id": {"123-456@g.us": {"catalog_scope": "pate"}},
        }}
        handler = Handler.__new__(Handler)
        handler.headers = {"Authorization": "Bearer webhook-secret"}
        handler.read_json = lambda: {
            "typeWebhook": "incomingMessageReceived", "idMessage": "hello-only",
            "senderData": {"chatId": "123-456@g.us", "chatName": "Foodsave Pate", "senderName": "Manager"},
            "messageData": {"typeMessage": "textMessage", "textMessageData": {"textMessage": "Добрый вечер @Foodsave"}},
        }
        responses = []
        handler.send_json = lambda body, status=200: responses.append((body, status))
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            with patch("server.load_config", return_value=config), \
                    patch("server.REVIEW_DB_PATH", base / "review.sqlite3"), \
                    patch("server.WEBHOOK_LOG_PATH", base / "events.jsonl"), \
                    patch("server.upload_cards") as upload, \
                    patch("server.send_green_api_message") as reply:
                handler.handle_green_api_webhook(urlparse("/api/green-api/webhook"))
        self.assertEqual(responses[0][0]["parse"]["total"], 0)
        self.assertNotIn("upload", responses[0][0])
        upload.assert_not_called()
        reply.assert_not_called()

    def test_webhook_saves_confident_and_uncertain_boxes_for_moderation(self):
        import tempfile

        chat_id = "123-456@g.us"
        config = {"green_api": {
            "webhook_token": "webhook-secret", "auto_upload": False,
            "allowed_group_chat_ids": [chat_id],
            "group_defaults_by_chat_id": {chat_id: {"catalog_scope": "pate"}},
        }}
        handler = Handler.__new__(Handler)
        handler.headers = {"Authorization": "Bearer webhook-secret"}
        handler.read_json = lambda: {
            "typeWebhook": "incomingMessageReceived", "idMessage": "mixed-offers",
            "senderData": {"chatId": chat_id, "chatName": "Foodsave Pate"},
            "messageData": {"typeMessage": "textMessage", "textMessageData": {
                "textMessage": "\n".join([
                    "Пате Бухар Жырау",
                    "Пирог вишня большой 5220 вместо 8700 1 шт",
                    "Пирог 5220 вместо 8700 1 шт",
                ])
            }},
        }
        responses = []
        handler.send_json = lambda body, status=200: responses.append((body, status))
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            report = {"summary": {"total": 1, "ok": 1, "skipped": 0, "failed": 0, "dryRun": True}, "report": []}
            with patch("server.load_config", return_value=config), \
                    patch("server.REVIEW_DB_PATH", base / "review.sqlite3"), \
                    patch("server.WEBHOOK_LOG_PATH", base / "events.jsonl"), \
                    patch("server.upload_cards", return_value=report) as upload, \
                    patch("server.send_green_api_message", return_value={"sent": True}):
                handler.handle_green_api_webhook(urlparse("/api/green-api/webhook"))
            queue = ReviewStore(base / "review.sqlite3")
            rows = queue.list_pending()
        self.assertEqual(responses[0][0]["parse"]["total"], 2)
        self.assertEqual(responses[0][0]["parse"]["review"], 1)
        self.assertEqual(len(rows), 2)
        self.assertEqual(sum(row["item"]["reviewApproved"] for row in rows), 1)
        self.assertEqual(sum(not row["item"]["reviewApproved"] for row in rows), 1)
        upload.assert_called_once()

    def test_duplicate_box_is_saved_and_counted_instead_of_dropped(self):
        import tempfile

        chat_id = "123-456@g.us"
        config = {"green_api": {
            "webhook_token": "webhook-secret", "auto_upload": False,
            "allowed_group_chat_ids": [chat_id],
            "group_defaults_by_chat_id": {chat_id: {"catalog_scope": "pate"}},
        }}
        handler = Handler.__new__(Handler)
        handler.headers = {"Authorization": "Bearer webhook-secret"}
        offer = "Пирог вишня большой 5220 вместо 8700 1 шт"
        handler.read_json = lambda: {
            "typeWebhook": "incomingMessageReceived", "idMessage": "duplicate-offers",
            "senderData": {"chatId": chat_id, "chatName": "Foodsave Pate"},
            "messageData": {"typeMessage": "textMessage", "textMessageData": {
                "textMessage": "\n".join(["Пате Бухар Жырау", offer, offer])
            }},
        }
        responses = []
        handler.send_json = lambda body, status=200: responses.append((body, status))
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            report = {"summary": {"total": 1, "ok": 1, "skipped": 0, "failed": 0, "dryRun": True}, "report": []}
            with patch("server.load_config", return_value=config), \
                    patch("server.REVIEW_DB_PATH", base / "review.sqlite3"), \
                    patch("server.WEBHOOK_LOG_PATH", base / "events.jsonl"), \
                    patch("server.upload_cards", return_value=report) as upload, \
                    patch("server.send_green_api_message", return_value={"sent": True}):
                handler.handle_green_api_webhook(urlparse("/api/green-api/webhook"))
            rows = ReviewStore(base / "review.sqlite3").list_pending()
        self.assertEqual(responses[0][0]["parse"]["total"], 2)
        self.assertEqual(responses[0][0]["parse"]["review"], 1)
        self.assertEqual(responses[0][0]["duplicateItems"], 1)
        self.assertEqual(len(rows), 2)
        self.assertTrue(any(
            any("такая же позиция" in reason for reason in row["item"]["reviewReasons"])
            for row in rows
        ))
        upload.assert_called_once()
        self.assertEqual(len(upload.call_args.args[0]), 1)

    def test_webhook_audit_metadata_omits_message_and_media_contents(self):
        row = message_log_record({
            "idMessage": "id", "chatId": "chat", "text": "private text",
            "raw": {"secret": "private"}, "media": {"downloadUrl": "https://private"},
        })
        self.assertEqual(row, {"idMessage": "id"})

    def test_upload_routes_require_admin_authentication(self):
        for path in ("/api/upload", "/api/boxes"):
            handler = Handler.__new__(Handler)
            handler.path = path
            handler.headers = {}
            responses = []
            handler.verify_admin_access = lambda: False
            handler.send_json = lambda body, status=200: responses.append((body, status))
            handler.do_POST()
            self.assertEqual(responses, [({"error": "unauthorized"}, 401)])

    def test_manual_publish_rejects_client_supplied_product_cards(self):
        handler = Handler.__new__(Handler)
        handler.read_json = lambda: {"confirm": True, "items": [{"name": "forged", "needsReview": False}]}
        responses = []
        handler.send_json = lambda body, status=200: responses.append((body, status))
        with patch("server.upload_cards") as upload:
            handler.handle_admin_publish()
        self.assertEqual(responses[0][1], 400)
        upload.assert_not_called()


class ModerationValidationTest(unittest.TestCase):
    def setUp(self):
        self.original = {
            "storeName": "Пате Бухар жырау", "storeId": None,
            "catalogScope": "pate",
            "categoryName": "Кондитерские изделия", "status": "AVAILABLE",
            "needsReview": True, "reviewReasons": ["слабый матч"],
            "matchedCanonical": None, "sizeDetected": None, "name": "Киш семгой",
            "description": "", "price": 1740, "originalPrice": 2900,
            "stockQuantity": 2, "images": [],
        }

    def test_pate_selection_derives_catalog_fields_and_preserves_venue(self):
        submitted = {
            **self.original,
            "storeName": "Подменённая точка", "categoryName": "Подменённая категория",
            "matchedCanonical": "Киш с семгой", "sizeDetected": "порция",
            "name": "Подменённое имя", "description": "Подменённое описание",
            "price": 1740, "originalPrice": 1, "stockQuantity": 2,
            "images": ["../../evil.jpg"], "reviewApproved": True,
        }
        item = prepare_review_item(self.original, submitted, CATALOG)
        self.assertEqual(item["storeName"], "Пате Бухар жырау")
        self.assertEqual(item["categoryName"], "Кондитерские изделия")
        self.assertEqual(item["matchedCanonical"], "Киш с семгой")
        self.assertEqual(item["originalPrice"], 2900)
        self.assertEqual(item["name"], "Киш с семгой (порция)")
        self.assertEqual(item["images"], ["pate/salmon-quiche.png"])
        self.assertTrue(item["reviewApproved"])
        self.assertTrue(is_review_item_publishable(item, CATALOG))

    def test_pate_branch_is_validated_using_trusted_chat_scope(self):
        branch = {**self.original, "storeName": "Бухар Жырау", "catalogScope": "pate"}
        item = prepare_review_item(branch, {
            **branch, "matchedCanonical": "Киш с семгой", "sizeDetected": "порция",
            "price": 1740,
        }, CATALOG)
        self.assertEqual(item["storeName"], "Бухар Жырау")
        self.assertTrue(is_review_item_publishable(item, CATALOG))

    def test_catalog_is_filtered_to_trusted_venue_scope(self):
        pate = catalog_for_scope(CATALOG, "pate")
        coffi = catalog_for_scope(CATALOG, "coffi")
        self.assertTrue(pate)
        self.assertTrue(coffi)
        self.assertFalse(any(
            str(size.get("image", "")).startswith("coffi/")
            for item in pate for size in item.get("sizes", {}).values()
        ))
        self.assertTrue(all(
            any(str(size.get("image", "")).startswith("coffi/") for size in item.get("sizes", {}).values())
            for item in coffi
        ))
        parsed = process(
            "Бухар Жырау\nКлаб сэндвич с курицей 2700 вместо 4500 1 шт",
            pate,
        )
        self.assertTrue(parsed)
        self.assertIsNone(parsed[0].get("matchedCanonical"))
        self.assertTrue(parsed[0]["needsReview"])

    def test_missing_pate_product_photo_gets_default_but_requires_moderation(self):
        items = [{"images": [], "photoNeedsReview": True, "needsReview": False, "reviewReasons": []}]
        apply_scope_default_image(items, "pate")
        self.assertEqual(items[0]["images"], ["pate/default.jpg"])
        self.assertTrue(items[0]["photoNeedsReview"])
        self.assertTrue(items[0]["photoIsFallback"])
        self.assertTrue(items[0]["needsReview"])
        self.assertIn("фото", " ".join(items[0]["reviewReasons"]).lower())

    def test_catalog_variant_without_exact_photo_uses_default_but_not_auto_publishable(self):
        catalog = [{"canonical": "Позиция без фото", "sizes": {"1шт": {"price": 100, "image": "missing.png"}}}]
        original = {**self.original, "storeName": "Бухар Жырау", "catalogScope": "pate"}
        item = prepare_review_item(original, {
            **original, "name": "Позиция без фото", "matchedCanonical": "Позиция без фото",
            "sizeDetected": "1шт", "price": 70,
        }, catalog)
        self.assertEqual(item["images"], ["pate/default.jpg"])
        self.assertTrue(item["photoIsFallback"])
        self.assertTrue(item["photoNeedsReview"])
        self.assertEqual(filter_confident_items([item]), [])
        self.assertFalse(is_review_item_publishable(item, catalog))

    def test_moderator_must_explicitly_confirm_a_default_photo_before_publish(self):
        catalog = [{"canonical": "Позиция без фото", "sizes": {"1шт": {"price": 100, "image": "missing.png"}}}]
        original = {**self.original, "storeName": "Бухар Жырау", "catalogScope": "pate"}
        item = prepare_review_item(original, {
            **original, "name": "Позиция без фото", "matchedCanonical": "Позиция без фото",
            "sizeDetected": "1шт", "price": 70, "confirmFallbackPhoto": True,
        }, catalog)
        self.assertTrue(item["photoFallbackConfirmed"])
        self.assertFalse(item["needsReview"])
        self.assertTrue(is_review_item_publishable(item, catalog))

    def test_automatic_filter_excludes_default_photo_fallbacks(self):
        exact = {"name": "exact", "needsReview": False, "images": ["pate/exact.jpg"]}
        fallback = {"name": "fallback", "needsReview": False, "photoIsFallback": True}
        self.assertEqual(filter_confident_items([exact, fallback]), [exact])

    def test_manual_parse_persists_confident_item_and_returns_queue_id(self):
        import tempfile

        handler = Handler.__new__(Handler)
        handler.read_json = lambda: {
            "message": "Пате Бухар жырау\nПирог вишня большой 5220 вместо 8700 1 шт",
            "source": "Pate",
        }
        responses = []
        handler.send_json = lambda body, status=200: responses.append((body, status))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "queue.sqlite3"
            with patch("server.REVIEW_DB_PATH", path), patch("server.load_config", return_value={}):
                handler.handle_parse()
                card = responses[0][0]["items"][0]
                self.assertTrue(card["reviewId"])
                self.assertEqual(card["catalogScope"], "pate")
                saved = ReviewStore(path).get(card["reviewId"])
                self.assertEqual(saved["item"]["matchedCanonical"], "Вишневый пирог")
                self.assertTrue(saved["item"]["reviewApproved"])

    def test_pate_requires_valid_catalog_variant(self):
        with self.assertRaisesRegex(ValueError, "variant"):
            prepare_review_item(self.original, {**self.original, "matchedCanonical": "Киш с семгой"}, CATALOG)

    def test_pate_cannot_select_a_partner_scoped_catalog_item(self):
        partner_item = next(
            entry for entry in CATALOG
            if any(str(size.get("image", "")).startswith(("coffi/", "royalty/")) for size in entry.get("sizes", {}).values())
        )
        variant = next(iter(partner_item["sizes"]))
        with self.assertRaisesRegex(ValueError, "not available for Pate"):
            prepare_review_item(self.original, {
                **self.original, "matchedCanonical": partner_item["canonical"],
                "sizeDetected": variant,
            }, CATALOG)

    def test_non_pate_review_cannot_reuse_a_pate_catalog_match(self):
        original = {
            **self.original, "storeName": "Coffi Бокейхана 10",
            "catalogScope": "coffi", "name": "Тефтели", "matchedCanonical": "Аргентина с говядиной",
        }
        item = prepare_review_item(original, {
            **original, "matchedCanonical": "Аргентина с говядиной",
            "price": 1900, "originalPrice": 2500,
        }, CATALOG)
        self.assertIsNone(item["matchedCanonical"])

    def test_untrusted_branch_name_does_not_create_catalog_scope(self):
        original = {**self.original, "catalogScope": None, "storeName": "Пате Бухар жырау"}
        item = prepare_review_item(original, {
            **original, "name": "Вишневый пирог", "price": 100,
            "originalPrice": 200, "matchedCanonical": "Вишневый пирог",
            "sizeDetected": "большой",
        }, CATALOG)
        self.assertIsNone(item.get("catalogScope"))
        self.assertIsNone(item.get("matchedCanonical"))

    def test_pate_sale_price_cannot_exceed_catalog_price(self):
        with self.assertRaisesRegex(ValueError, "sale price"):
            prepare_review_item(self.original, {
                **self.original, "matchedCanonical": "Киш с семгой",
                "sizeDetected": "порция", "price": 3000,
            }, CATALOG)

    def test_nan_price_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "price"):
            prepare_review_item(self.original, {
                **self.original, "matchedCanonical": "Киш с семгой",
                "sizeDetected": "порция", "price": math.nan,
            }, CATALOG)

    def test_force_flag_cannot_bypass_needs_review(self):
        class NoCallClient:
            def __getattr__(self, name):
                raise AssertionError(f"CRM must not be called: {name}")

        result = upload_one_card(
            {**self.original, "price": 1740, "originalPrice": 2900},
            NoCallClient(), {}, [], [], {}, Path("/tmp"), dry_run=False, force=True,
        )
        self.assertEqual(result["result"], "skipped")
        self.assertEqual(result["reason"], "needsReview=true")

    def test_automatic_publish_filter_excludes_uncertain_items(self):
        confident = {"name": "known", "needsReview": False}
        uncertain = {"name": "uncertain", "needsReview": True}
        self.assertEqual(filter_confident_items([confident, uncertain, {"error": "bad"}]), [confident])

    def test_publish_api_rejects_unedited_queue_item(self):
        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            queue_path = Path(directory) / "queue.sqlite3"
            queue = ReviewStore(queue_path)
            review_id = queue.add("message-8", 0, "Пате Бухар жырау", "строка", self.original)
            handler = Handler.__new__(Handler)
            handler.headers = {"X-Parser-Actor": "admin"}
            handler.read_json = lambda: {"reviewId": review_id}
            handler.send_json = lambda payload, status=200: {"payload": payload, "status": status}
            with patch("server.REVIEW_DB_PATH", queue_path):
                response = handler.handle_review_action("publish")
            self.assertEqual(response["status"], 409)
            self.assertEqual(queue.get(review_id)["status"], "PENDING")


if __name__ == "__main__":
    unittest.main()
