import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from green_api import (  # noqa: E402
    build_publication_reply,
    extract_green_api_message,
    group_defaults_for_message,
    is_allowed_group_message,
)


class GreenApiWebhookTest(unittest.TestCase):
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

    def test_allows_configured_group_name(self):
        allowed, reason = is_allowed_group_message(
            {
                "typeWebhook": "incomingMessageReceived",
                "chatId": "123-456@g.us",
                "chatName": "royalty foodsave",
            },
            {"green_api": {"allowed_group_names": ["Royalty FoodSave"]}},
        )

        self.assertTrue(allowed)
        self.assertEqual(reason, "chatName allowed")

    def test_allows_group_name_with_diacritics(self):
        allowed, reason = is_allowed_group_message(
            {
                "typeWebhook": "incomingMessageReceived",
                "chatId": "123-456@g.us",
                "chatName": "Foodsave Pâté",
            },
            {"green_api": {"allowed_group_names": ["Foodsave Pate"]}},
        )

        self.assertTrue(allowed)
        self.assertEqual(reason, "chatName allowed")

    def test_resolves_group_defaults_with_normalized_name(self):
        defaults = group_defaults_for_message(
            {
                "green_api": {
                    "group_defaults": {
                        "Coffi Foodsave": {"store": "coffi", "category": "Кофейня"}
                    }
                }
            },
            "Coffi FoodSave",
        )

        self.assertEqual(defaults, {"store": "coffi", "category": "Кофейня"})

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
        self.assertIn("group not allowed", reason)

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


if __name__ == "__main__":
    unittest.main()
