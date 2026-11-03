import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from green_api import (  # noqa: E402
    build_publication_reply,
    deduplicate_cards,
    duplicate_card_indexes,
    extract_green_api_message,
    group_defaults_for_message,
    is_allowed_group_message,
    verify_webhook_token,
    WebhookStore,
)


class GreenApiWebhookTest(unittest.TestCase):
    def test_webhook_fails_closed_when_token_is_not_configured(self):
        self.assertFalse(verify_webhook_token({}, {}, {"green_api": {"webhook_token": ""}}))

    def test_webhook_accepts_only_matching_configured_token(self):
        config = {"green_api": {"webhook_token": "secret-token"}}
        self.assertTrue(verify_webhook_token({"Authorization": "Bearer secret-token"}, {}, config))
        self.assertFalse(verify_webhook_token({"Authorization": "Bearer wrong"}, {}, config))

    def test_webhook_rejects_known_example_secret(self):
        config = {"green_api": {"webhook_token": "SET_A_LONG_RANDOM_TOKEN"}}
        self.assertFalse(verify_webhook_token({"X-Green-Api-Token": "SET_A_LONG_RANDOM_TOKEN"}, {}, config))

    def test_deduplicates_identical_cards_without_merging_different_ones(self):
        first = {
            "storeName": "Royalty", "name": "Круассан", "price": 600,
            "originalPrice": 1000, "stockQuantity": 2, "expiryDate": "2026-09-24T21:00:00",
        }
        different = {**first, "name": "Тарт"}

        unique, duplicates = deduplicate_cards([first, dict(first), different])

        self.assertEqual(unique, [first, different])
        self.assertEqual(duplicates, [first])
        self.assertEqual(duplicate_card_indexes([first, dict(first), different]), {1})

    def test_claim_blocks_concurrent_or_completed_message(self):
        with tempfile.TemporaryDirectory() as directory:
            store = WebhookStore(Path(directory) / "events.jsonl")

            self.assertTrue(store.claim("message-1"))
            self.assertFalse(store.claim("message-1"))
            store.append({"message": {"idMessage": "message-1"}, "result": {"ok": True}})
            store.release("message-1")

            self.assertFalse(store.claim("message-1"))

    def test_webhook_log_strips_raw_lines_and_signed_media_urls(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "events.jsonl"
            store = WebhookStore(path)
            store.append({
                "message": {"idMessage": "message-2", "text": "private text", "media": {"downloadUrl": "https://private.test/signed?token=secret"}},
                "result": {"items": [{"name": "Пирог", "rawLine_name": "private raw", "images": ["https://private.test/signed?token=secret", "pate/item.png"]}]},
            })
            saved = path.read_text(encoding="utf-8")
            self.assertIn('"idMessage": "message-2"', saved)
            self.assertIn('"pate/item.png"', saved)
            self.assertNotIn("private text", saved)
            self.assertNotIn("private raw", saved)
            self.assertNotIn("signed?token=secret", saved)

    def test_webhook_log_expires_old_events_and_removes_personal_chat_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "events.jsonl"
            store = WebhookStore(path)
            path.write_text('{"receivedAt":1,"message":{"idMessage":"old"}}\n', encoding="utf-8")
            store.append({"message": {
                "idMessage": "message-3", "chatId": "private-chat-id",
                "chatName": "Foodsave Pate", "senderName": "Private Sender",
            }})
            saved = path.read_text(encoding="utf-8")
            self.assertNotIn('"old"', saved)
            self.assertNotIn("private-chat-id", saved)
            self.assertNotIn("Private Sender", saved)
            self.assertIn("Foodsave Pate", saved)

    def test_extracts_group_chat_name(self):
        message = extract_green_api_message(
            {
                "typeWebhook": "incomingMessageReceived",
                "idMessage": "abc",
                "senderData": {
                    "chatId": "123-456@g.us",
                    "chatName": "Foodsave Pate",
                    "senderName": "Manager",
                },
                "messageData": {
                    "typeMessage": "textMessage",
                    "textMessageData": {"textMessage": "Туран\nКруассаны 5 шт"},
                },
            }
        )

        self.assertEqual(message["chatId"], "123-456@g.us")
        self.assertEqual(message["chatName"], "Foodsave Pate")
        self.assertEqual(message["text"], "Туран\nКруассаны 5 шт")

    def test_extracts_green_api_file_message_caption(self):
        message = extract_green_api_message(
            {
                "typeWebhook": "incomingMessageReceived",
                "idMessage": "img",
                "senderData": {
                    "chatId": "123-456@g.us",
                    "chatName": "Foodsave Pate",
                },
                "messageData": {
                    "typeMessage": "imageMessage",
                    "fileMessageData": {
                        "downloadUrl": "https://example.com/image.jpg",
                        "caption": "Туран\nКруассаны 660тг вместо 1100тг 5 шт",
                        "fileName": "image.jpg",
                        "mimeType": "image/jpeg",
                    },
                },
            }
        )

        self.assertEqual(message["text"], "Туран\nКруассаны 660тг вместо 1100тг 5 шт")
        self.assertEqual(message["media"]["downloadUrl"], "https://example.com/image.jpg")

    def test_allows_only_exact_configured_group_id(self):
        allowed, reason = is_allowed_group_message(
            {
                "typeWebhook": "incomingMessageReceived",
                "chatId": "123-456@g.us",
                "chatName": "royalty foodsave",
            },
            {"green_api": {"allowed_group_chat_ids": ["123-456@g.us"]}},
        )

        self.assertTrue(allowed)
        self.assertEqual(reason, "chatId allowed")

    def test_group_name_cannot_authorize_an_unknown_group(self):
        allowed, reason = is_allowed_group_message(
            {
                "typeWebhook": "incomingMessageReceived",
                "chatId": "123-456@g.us",
                "chatName": "Foodsave Pâté",
            },
            {"green_api": {"allowed_group_names": ["Foodsave Pate"]}},
        )

        self.assertFalse(allowed)
        self.assertIn("IDs are not configured", reason)

    def test_configured_id_mismatch_cannot_fall_back_to_an_allowed_name(self):
        allowed, _ = is_allowed_group_message(
            {"typeWebhook": "incomingMessageReceived", "chatId": "attacker@g.us", "chatName": "Foodsave Pate"},
            {"green_api": {"allowed_group_names": ["Foodsave Pate"], "allowed_group_chat_ids": ["trusted@g.us"]}},
        )
        self.assertFalse(allowed)

    def test_resolves_group_defaults_by_exact_id(self):
        defaults = group_defaults_for_message(
            {
                "green_api": {
                    "group_defaults_by_chat_id": {
                        "123-456@g.us": {"store": "coffi", "category": "Кофейня"}
                    }
                }
            },
            "123-456@g.us",
        )

        self.assertEqual(defaults, {"store": "coffi", "category": "Кофейня"})

    def test_group_defaults_do_not_use_display_name_as_identity(self):
        defaults = group_defaults_for_message(
            {"green_api": {"group_defaults": {"Coffi Foodsave": {"catalog_scope": "coffi"}}}},
            "Coffi Foodsave",
        )
        self.assertEqual(defaults, {})

    def test_rejects_private_or_unknown_group(self):
        private_allowed, _ = is_allowed_group_message(
            {
                "typeWebhook": "incomingMessageReceived",
                "chatId": "777@c.us",
                "chatName": "Foodsave Pate",
            },
            {"green_api": {"allowed_group_names": ["Foodsave Pate"]}},
        )
        unknown_allowed, reason = is_allowed_group_message(
            {
                "typeWebhook": "incomingMessageReceived",
                "chatId": "123-456@g.us",
                "chatName": "Other Group",
            },
            {"green_api": {"allowed_group_names": ["Foodsave Pate"]}},
        )

        self.assertFalse(private_allowed)
        self.assertFalse(unknown_allowed)
        self.assertIn("IDs are not configured", reason)

    def test_rejects_outgoing_webhooks(self):
        allowed, reason = is_allowed_group_message(
            {
                "typeWebhook": "outgoingMessageReceived",
                "chatId": "123-456@g.us",
                "chatName": "Foodsave Pate",
            },
            {"green_api": {"allowed_group_names": ["Foodsave Pate"]}},
        )

        self.assertFalse(allowed)
        self.assertIn("ignored webhook type", reason)

    def test_publication_reply_mentions_all_published(self):
        reply = build_publication_reply(
            {"total": 2, "ok": 2, "review": 0},
            {"summary": {"total": 2, "ok": 2, "skipped": 0, "failed": 0}},
            auto_upload=True,
        )

        self.assertIn("Опубликовано: 2 из 2", reply)
        self.assertIn("Все боксы опубликованы", reply)

    def test_publication_reply_counts_manual_review_items_in_the_total(self):
        reply = build_publication_reply(
            {"total": 10, "ok": 9, "review": 1},
            {"summary": {"total": 9, "ok": 9, "skipped": 0, "failed": 0}},
            auto_upload=True,
        )
        self.assertIn("Опубликовано: 9 из 10", reply)
        self.assertIn("На ручной проверке: 1", reply)
        self.assertNotIn("Все боксы опубликованы", reply)


if __name__ == "__main__":
    unittest.main()
