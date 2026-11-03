import sqlite3
import tempfile
import unittest
from pathlib import Path

from review_store import ReviewStore


class ReviewStoreTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = ReviewStore(Path(self.tmp.name) / "queue.sqlite3")
        self.item = {
            "name": "Товар", "needsReview": True, "reviewReasons": ["слабый матч"],
            "price": 100, "originalPrice": 100, "stockQuantity": 1,
            "images": ["pate/test.jpg"], "photoNeedsReview": False, "photoIsFallback": False,
        }

    def tearDown(self):
        self.tmp.cleanup()

    def test_review_persists_and_duplicate_message_is_idempotent(self):
        first = self.store.add("message-1", 0, "Foodsave Pate", "исходный текст", self.item)
        second = self.store.add("message-1", 0, "Foodsave Pate", "исходный текст", self.item)
        self.assertEqual(first, second)
        reopened = ReviewStore(self.store.path)
        self.assertEqual(len(reopened.list_pending()), 1)

    def test_edit_and_decision_are_audited(self):
        review_id = self.store.add("message-2", 0, "Foodsave Pate", "текст", self.item)
        changed = {**self.item, "name": "Исправленный товар", "needsReview": False, "reviewReasons": [], "reviewApproved": True}
        self.assertTrue(self.store.update(review_id, changed, actor="42"))
        self.assertEqual(self.store.get(review_id)["item"]["name"], "Исправленный товар")
        self.assertIsNotNone(self.store.claim_publish(review_id))
        self.assertTrue(self.store.resolve(review_id, "PUBLISHED", actor="42"))
        self.assertEqual(self.store.list_pending(), [])

    def test_publish_claim_prevents_duplicate_submission(self):
        review_id = self.store.add("message-3", 0, "Foodsave Pate", "текст", self.item)
        approved = {**self.item, "needsReview": False, "reviewReasons": [], "reviewApproved": True}
        self.assertTrue(self.store.update(review_id, approved))
        self.assertTrue(self.store.claim_publish(review_id))
        self.assertFalse(self.store.claim_publish(review_id))
        self.assertEqual(self.store.get(review_id)["status"], "PUBLISHING")
        self.assertFalse(self.store.update(review_id, {**self.item, "name": "race"}))

    def test_local_validation_can_release_claim_without_external_retry(self):
        review_id = self.store.add("message-7", 0, "Foodsave Pate", "текст", self.item)
        self.assertTrue(self.store.update(review_id, {**self.item, "needsReview": False, "reviewReasons": [], "reviewApproved": True}))
        self.assertTrue(self.store.claim_publish(review_id))
        self.assertTrue(self.store.release_publish_claim(review_id, reason="invalid catalog size"))
        self.assertEqual(self.store.get(review_id)["status"], "PENDING")

    def test_unreviewed_item_cannot_be_claimed_for_publication(self):
        review_id = self.store.add("message-4", 0, "Foodsave Pate", "текст", self.item)
        self.assertIsNone(self.store.claim_publish(review_id))
        self.assertEqual(self.store.get(review_id)["status"], "PENDING")

    def test_unknown_publication_cannot_be_snoozed_or_retried(self):
        review_id = self.store.add("message-5", 0, "Foodsave Pate", "текст", self.item)
        approved = {**self.item, "needsReview": False, "reviewReasons": [], "reviewApproved": True}
        self.assertTrue(self.store.update(review_id, approved))
        self.assertIsNotNone(self.store.claim_publish(review_id))
        self.assertTrue(self.store.resolve(review_id, "PUBLISH_UNKNOWN"))
        self.assertFalse(self.store.resolve(review_id, "SNOOZED"))
        self.assertIsNone(self.store.claim_publish(review_id))
        self.assertTrue(self.store.reconcile(review_id, "PENDING", actor="42"))
        self.assertIsNotNone(self.store.claim_publish(review_id))

    def test_publishing_cannot_be_reconciled_before_crm_call_finishes(self):
        review_id = self.store.add("message-active", 0, "Foodsave Pate", "text", self.item)
        approved = {**self.item, "needsReview": False, "reviewReasons": [], "reviewApproved": True}
        self.assertTrue(self.store.update(review_id, approved))
        self.assertIsNotNone(self.store.claim_publish(review_id))
        self.assertFalse(self.store.reconcile(review_id, "PENDING", actor="42"))
        self.assertEqual(self.store.get(review_id)["status"], "PUBLISHING")

    def test_distinct_review_ids_cannot_publish_the_same_offer_twice(self):
        approved = {**self.item, "needsReview": False, "reviewReasons": [], "reviewApproved": True,
                    "storeName": "Пате Туран", "matchedCanonical": "Бордо", "sizeDetected": "мини"}
        first = self.store.add("message-first", 0, "Пате Туран", "строка", approved)
        second = self.store.add("message-second", 0, "Пате Туран", "строка", approved)
        self.assertTrue(self.store.update(first, approved))
        self.assertTrue(self.store.update(second, approved))
        self.assertIsNotNone(self.store.claim_publish(first))
        self.assertTrue(self.store.resolve(first, "PUBLISHED"))
        self.assertEqual(self.store.find_duplicate_publication(approved), first)
        self.assertIsNone(self.store.claim_publish(second))

    def test_moderator_can_explicitly_override_duplicate_block_and_it_is_audited(self):
        approved = {**self.item, "needsReview": False, "reviewReasons": [], "reviewApproved": True,
                    "storeName": "Пате Туран", "matchedCanonical": "Бордо", "sizeDetected": "мини"}
        first = self.store.add("message-first", 0, "Пате Туран", "строка", approved)
        second = self.store.add("message-second", 0, "Пате Туран", "строка", approved)
        self.store.update(first, approved)
        self.store.update(second, approved)
        self.store.claim_publish(first)
        self.store.resolve(first, "PUBLISHED")
        self.assertIsNone(self.store.claim_publish(second))
        self.assertIsNotNone(self.store.claim_publish(second, allow_duplicate=True))
        with self.store._connect() as db:
            actions = [row[0] for row in db.execute("SELECT action FROM review_actions WHERE review_id=?", (second,))]
        self.assertIn("publish_duplicate_override", actions)

    def test_reconcile_not_published_releases_cross_message_duplicate_guard(self):
        approved = {**self.item, "needsReview": False, "reviewReasons": [], "reviewApproved": True}
        first = self.store.add("message-first", 0, "Пате Туран", "строка", approved)
        second = self.store.add("message-second", 0, "Пате Туран", "строка", approved)
        self.store.update(first, approved)
        self.store.update(second, approved)
        self.store.claim_publish(first)
        self.store.resolve(first, "PUBLISH_UNKNOWN")
        self.assertTrue(self.store.reconcile(first, "PENDING"))
        self.assertNotEqual(self.store.find_duplicate_publication(approved), first)
        self.assertIsNotNone(self.store.claim_publish(first))

    def test_orphaned_publish_claim_recovers_only_to_unknown(self):
        review_id = self.store.add("message-orphan", 0, "Пате Туран", "строка", self.item)
        approved = {**self.item, "needsReview": False, "reviewReasons": [], "reviewApproved": True}
        self.store.update(review_id, approved)
        self.store.claim_publish(review_id)
        with self.store._connect() as db:
            db.execute("UPDATE review_items SET updated_at='2000-01-01 00:00:00' WHERE review_id=?", (review_id,))
        self.assertEqual(self.store.recover_orphaned_publishes(), 1)
        self.assertEqual(self.store.get(review_id)["status"], "PUBLISH_UNKNOWN")
        self.assertIsNone(self.store.claim_publish(review_id))

    def test_recent_publish_claim_is_not_recovered_while_request_may_be_active(self):
        review_id = self.store.add("message-live", 0, "Пате Туран", "строка", self.item)
        approved = {**self.item, "needsReview": False, "reviewReasons": [], "reviewApproved": True}
        self.store.update(review_id, approved)
        self.store.claim_publish(review_id)
        self.assertEqual(self.store.recover_orphaned_publishes(min_age_seconds=600), 0)
        self.assertEqual(self.store.get(review_id)["status"], "PUBLISHING")

    def test_old_message_text_is_redacted_without_dropping_pending_item(self):
        review_id = self.store.add("message-6", 0, "Foodsave Pate", "private source text", self.item)
        with self.store._connect() as db:
            db.execute("UPDATE review_items SET created_at='2000-01-01 00:00:00' WHERE review_id=?", (review_id,))
        self.assertEqual(self.store.redact_old_messages(days=90), 1)
        saved = self.store.get(review_id)
        self.assertIsNone(saved["messageText"])
        self.assertIsNone(saved["chatName"])
        self.assertNotIn("message-6", saved["sourceMessageId"])
        self.assertTrue(saved["sourceMessageId"].startswith("retained:"))
        self.assertEqual(saved["status"], "PENDING")

    def test_old_raw_lines_are_redacted_from_item_and_action_snapshots(self):
        item = {
            **self.item, "rawLine": "private raw line", "rawLine_name": "private product text",
            "images": ["https://private.test/signed?token=secret"],
        }
        review_id = self.store.add("message-raw", 0, "Foodsave Pate", "private source text", item)
        approved = {**item, "needsReview": False, "reviewReasons": [], "reviewApproved": True}
        self.assertTrue(self.store.update(review_id, approved))
        with self.store._connect() as db:
            db.execute("UPDATE review_items SET created_at='2000-01-01 00:00:00' WHERE review_id=?", (review_id,))
        self.assertEqual(self.store.redact_old_messages(days=90), 1)
        with self.store._connect() as db:
            saved_item = db.execute("SELECT item_json FROM review_items WHERE review_id=?", (review_id,)).fetchone()[0]
            action = db.execute("SELECT actor,action,before_json,after_json FROM review_actions WHERE review_id=?", (review_id,)).fetchone()
        self.assertNotIn("private raw line", saved_item)
        self.assertNotIn("private product text", saved_item)
        self.assertNotIn("signed?token=secret", saved_item)
        self.assertEqual(action["actor"], "retained")
        self.assertEqual(action["action"], "edit")
        self.assertIsNone(action["before_json"])
        self.assertIsNone(action["after_json"])

    def test_old_published_cards_are_scrubbed_but_hash_guard_survives(self):
        approved = {
            **self.item, "name": "Бордо (мини)", "storeName": "Пате Туран",
            "needsReview": False, "reviewReasons": [], "reviewApproved": True,
        }
        review_id = self.store.add("message-private-id", 0, "Foodsave Pate", "source text", approved)
        self.store.update(review_id, approved)
        self.store.claim_publish(review_id)
        self.store.resolve(review_id, "PUBLISHED")
        with self.store._connect() as db:
            db.execute("UPDATE review_items SET created_at='2000-01-01 00:00:00' WHERE review_id=?", (review_id,))
        self.store.redact_old_messages(days=90)
        saved = self.store.get(review_id)
        self.assertEqual(saved["item"], {})
        self.assertEqual(saved["status"], "PUBLISHED")
        self.assertIsNone(saved["chatName"])
        self.assertIsNone(saved["messageText"])
        self.assertNotIn("message-private-id", saved["sourceMessageId"])
        self.assertEqual(self.store.find_duplicate_publication(approved), review_id)

    def test_database_connections_close_after_context_exit(self):
        with self.store._connect() as connection:
            pass
        with self.assertRaises(sqlite3.ProgrammingError):
            connection.execute("SELECT 1")


if __name__ == "__main__":
    unittest.main()
