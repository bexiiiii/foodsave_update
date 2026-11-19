import unittest
from unittest.mock import Mock
import telegram_ingress_poll as receiver

ENV = {"TELEGRAM_BOT_TOKEN": "test-only", "TELEGRAM_WEBHOOK_SECRET": "test-only"}

class PollTest(unittest.TestCase):
    def test_forwards_raw_events_and_uses_database_cursor(self):
        transport = Mock(side_effect=[{"ok":True,"result":[{"update_id":51,"unknown":"kept"}]}, None])
        offset = Mock(return_value=50)
        writer=Mock()
        self.assertEqual(1, receiver.poll_once(ENV, offset, transport, writer))
        writer.assert_called_once_with(52)
        self.assertEqual(50, transport.call_args_list[0].args[1]["offset"])
        self.assertEqual({"update_id":51,"unknown":"kept"},transport.call_args_list[1].args[1])
        offset.assert_called_once()

    def test_failed_api_does_not_advance_to_last_fetched_event(self):
        transport = Mock(side_effect=[{"ok":True,"result":[{"update_id":51},{"update_id":52}]}, OSError("API unavailable")])
        offset = Mock(return_value=50)
        writer=Mock()
        with self.assertRaises(OSError):
            receiver.poll_once(ENV, offset, transport, writer)
        writer.assert_not_called()
        self.assertEqual(2, transport.call_count)
        # A new poll still uses only the persisted cursor, never an unacknowledged id.
        transport = Mock(return_value={"ok":True,"result":[]})
        receiver.poll_once(ENV, offset, transport, Mock())
        self.assertEqual(50,transport.call_args.args[1]["offset"])

    def test_database_failure_prevents_polling_and_acknowledgment(self):
        transport = Mock()
        with self.assertRaises(RuntimeError):
            receiver.poll_once(ENV,Mock(side_effect=RuntimeError("cursor unavailable")),transport,Mock())
        transport.assert_not_called()

    def test_telegram_error_never_calls_order_endpoint(self):
        transport=Mock(return_value={"ok":False,"result":[]})
        with self.assertRaises(RuntimeError):
            receiver.poll_once(ENV,Mock(return_value=50),transport,Mock())
        self.assertEqual(1,transport.call_count)

if __name__=="__main__":
    unittest.main()
