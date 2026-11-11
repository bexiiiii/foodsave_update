import json
import os
import sys
import subprocess
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Event
from unittest.mock import Mock, patch
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import publication
import server
import upload_to_crm
from green_api import card_fingerprint


class PublicationTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.journal = self.root / "published_cards.jsonl"
        self.enterContext(patch.object(publication, "PUBLICATIONS", self.journal))
        self.card = {"name": "Тестовый бокс", "description": "A\nB", "storeId": 1, "categoryId": 1,
                     "price": 500, "originalPrice": 1000, "expiryDate": "2026-11-11T21:00:00"}
        self.crm = Mock()
        self.crm.create_product.return_value.status_code = 201
        self.crm.create_product.return_value.json.return_value = {"id": 42}

    def publish(self, **changes):
        card = {**self.card, **changes}
        return publication.publish_product(self.crm, card, card, "/products")["result"]

    def test_reads_glued_legacy_records_and_following_lines(self):
        def row(name):
            return json.dumps({"fingerprint": card_fingerprint({**self.card, "name": name})})
        self.journal.write_text(row("Первый") + r"\n" + row("Второй") + "\n" + row("Третий"))
        for name in ["Первый", "Второй", "Третий"]:
            self.assertEqual(self.publish(name=name), "skipped")
        self.assertEqual(self.publish(), "ok")
        self.assertEqual(self.publish(), "skipped")
        self.assertEqual(self.publish(storeId=2), "ok")
        self.assertEqual(self.publish(expiryDate="2026-11-12T21:00:00"), "ok")
        self.assertEqual(self.crm.create_product.call_count, 3)

    def test_an_interrupted_send_survives_a_process_restart(self):
        # Simulate the uploader exiting after CRM received the POST but before its response.
        child = """
import json, os, sys
from pathlib import Path
import publication
class Client:
    def create_product(self, payload, endpoint):
        os._exit(17)
publication.PUBLICATIONS = Path(sys.argv[1])
card = json.loads(sys.argv[2])
publication.publish_product(Client(), card, card, '/products')
"""
        run = subprocess.run([sys.executable, "-c", child, str(self.journal), json.dumps(self.card)],
                             cwd=Path(publication.__file__).parent, timeout=5, check=False)
        self.assertEqual(run.returncode, 17)
        self.assertEqual(self.publish(), "skipped")
        self.crm.create_product.assert_not_called()

    def test_unreadable_line_stops_create_and_recovery_allows_retry(self):
        self.journal.write_text('{"fingerprint":')
        with self.assertRaises(ValueError):
            self.publish()
        self.crm.create_product.assert_not_called()
        self.journal.write_text("")
        self.assertEqual(self.publish(), "ok")

    def test_simultaneous_publications_post_only_once(self):
        entered, finish = Event(), Event()
        def post(*args):
            entered.set()
            if not finish.wait(5):
                raise TimeoutError()
            return Mock(status_code=201, json=lambda: {"id": 1})
        self.crm.create_product.side_effect = post
        with ThreadPoolExecutor(2) as pool:
            first = pool.submit(self.publish)
            try:
                self.assertTrue(entered.wait(3))
                self.assertEqual(self.publish(), "skipped")
            finally:
                finish.set()
            self.assertEqual(first.result(), "ok")
        self.crm.create_product.assert_called_once()

    def test_unknown_result_is_not_retried_but_a_rejected_card_can_be(self):
        self.crm.create_product.side_effect = TimeoutError()
        with self.assertRaises(TimeoutError):
            self.publish()
        self.crm.create_product.side_effect = None
        self.assertEqual(self.publish(), "skipped")
        self.crm.create_product.return_value.status_code = 422
        self.assertEqual(self.publish(name="Другой"), "failed")
        self.crm.create_product.return_value.status_code = 201
        self.assertEqual(self.publish(name="Другой"), "ok")

    def test_real_branch_messages_through_webhook(self):
        cfg = {"base_url": "https://example.invalid", "email": "", "password": "",
               "green_api": {"auto_upload": True}, "category_id": 1, "images_dir": str(self.root)}
        self.crm.get_stores.return_value = [{"id": 4, "name": "Pâté | Туран"},
                                            {"id": 5, "name": "Pâté | Толе би"}]
        self.crm.get_categories.return_value = []
        self.enterContext(patch.object(server, "CrmClient", return_value=self.crm))
        self.enterContext(patch.object(server, "load_config", return_value=cfg))
        self.enterContext(patch.object(server, "WEBHOOK_LOG_PATH", self.root / "events.jsonl"))
        self.enterContext(patch.object(server, "send_green_api_message", return_value={"sent": True}))
        receiver = Mock(headers={})
        receiver.send_json.side_effect = lambda data, **kwargs: data
        def receive(mid, media_type, mime, caption):
            receiver.read_json.return_value = {
                "idMessage": mid, "typeWebhook": "incomingMessageReceived",
                "senderData": {"chatId": "test@g.us", "chatName": "Foodsave Pâté"},
                "messageData": {"typeMessage": media_type, "fileMessageData": {
                    "downloadUrl": "https://example.invalid/attachment", "mimeType": mime, "caption": caption}}}
            return server.Handler.handle_green_api_webhook(receiver, urlparse("/"))
        text = "Төле би\nКиш с семгой 1740 вместо 2900 1шт\nТұран\nСлойка творожная 720 вместо 1200 3шт"
        for image in ["kish_s_semgoi.jpg", "sloika_tvorozhnaya.jpg"]:
            (self.root / image).touch()
        self.crm.upload_image.side_effect = lambda path: "https://example.invalid/" + Path(path).name
        result = receive("two", "imageMessage", "image/jpeg", text)
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["upload"]["summary"]["ok"], 2)
        self.assertEqual([(c.args[0]["storeId"], c.args[0]["images"]) for c in self.crm.create_product.call_args_list],
                         [(5, ["https://example.invalid/kish_s_semgoi.jpg"]),
                          (4, ["https://example.invalid/sloika_tvorozhnaya.jpg"])])
        self.assertTrue(receive("two", "imageMessage", "image/jpeg", text)["duplicate"])
        single = "Туран\nКиш с семгой 1740 вместо 2900 1шт"
        self.assertEqual(receive("pdf", "documentMessage", "application/pdf", single)["upload"]["summary"]["ok"], 1)
        self.assertEqual(self.crm.create_product.call_args.args[0]["images"], ["https://example.invalid/kish_s_semgoi.jpg"])
        single = "Толе би\nСлойка творожная 720 вместо 1200 3шт"
        self.assertEqual(receive("photo", "imageMessage", "image/jpeg", single)["upload"]["summary"]["ok"], 1)
        self.assertEqual(self.crm.create_product.call_args.args[0]["images"], ["https://example.invalid/attachment"])
        self.crm.get_stores.return_value = []
        self.assertEqual(receive("empty", "imageMessage", "image/jpeg", single)["upload"]["summary"]["failed"], 1)
        self.assertEqual(self.crm.create_product.call_count, 4)

    def test_cli_then_delayed_webhook_operator_and_fresh_message(self):
        cfg = {"base_url": "https://example.invalid", "email": "", "password": "",
               "green_api": {"auto_upload": True}}
        self.crm.get_stores.return_value = []
        self.crm.get_categories.return_value = []
        self.enterContext(patch.object(server, "CrmClient", return_value=self.crm))
        self.enterContext(patch.object(upload_to_crm, "CrmClient", return_value=self.crm))
        self.enterContext(patch.object(server, "load_config", return_value=cfg))
        self.enterContext(patch.object(server, "WEBHOOK_LOG_PATH", self.root / "events.jsonl"))
        self.enterContext(patch.object(server, "send_green_api_message", return_value={}))
        self.enterContext(patch.object(server, "process", side_effect=lambda text, *a, **kw: [{**self.card, "name": text}]))
        (self.root / "config.json").write_text(json.dumps(cfg))
        (self.root / "cards.json").write_text(json.dumps([self.card]))
        self.enterContext(patch.object(sys, "argv", ["upload_to_crm", "cards.json", "--config", "config.json"]))
        previous = os.getcwd()
        try:
            os.chdir(self.root)
            with patch("upload_to_crm.time.sleep"):
                upload_to_crm.main()
        finally:
            os.chdir(previous)
        receiver = Mock(headers={})
        receiver.send_json.side_effect = lambda data, **kwargs: data
        def webhook(mid, text, timestamp):
            receiver.read_json.return_value = {
                "idMessage": mid, "typeWebhook": "incomingMessageReceived", "timestamp": timestamp,
                "senderData": {"chatId": "test@g.us", "chatName": "Coffi FoodSave"},
                "messageData": {"typeMessage": "textMessage", "textMessageData": {"textMessage": text}}}
            return server.Handler.handle_green_api_webhook(receiver, urlparse("/"))
        with patch("server.time.time", return_value=20_000):
            self.assertEqual(webhook("old", self.card["name"], 16_000)["upload"]["summary"]["skipped"], 1)
            self.assertTrue(webhook("old", self.card["name"], 16_000)["duplicate"])
            self.assertEqual(webhook("new", "Свежий", 19_999)["upload"]["summary"]["ok"], 1)
        self.assertEqual(server.upload_cards([self.card])["summary"]["skipped"], 1)
        new_card = {**self.card, "name": "Предпросмотр"}
        self.assertEqual(server.upload_cards([new_card], dry_run=True)["report"][0]["result"], "dry-run")
        self.assertEqual(server.upload_cards([new_card])["summary"]["ok"], 1)
        self.assertEqual(self.crm.create_product.call_count, 3)
        first = json.loads((self.root / "events.jsonl").read_text().splitlines()[0])
        self.assertEqual(first["handlerStartedAt"] - first["message"]["timestamp"], 4000)
