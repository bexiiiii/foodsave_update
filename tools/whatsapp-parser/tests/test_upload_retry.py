import unittest
from unittest.mock import patch

import requests

from upload_to_crm import CrmClient


def response(status, body='{"ok":true}'):
    result = requests.Response()
    result.status_code = status
    result._content = body.encode()
    return result


class CrmRetryTest(unittest.TestCase):
    def test_retries_transient_http_errors(self):
        client = CrmClient("https://example.test/api", "user", "password")
        client.access_token = "access"
        with patch("upload_to_crm.requests.request", side_effect=[response(503, "busy"), response(201)]), \
             patch("upload_to_crm.time.sleep") as sleep:
            result = client._request_with_retry("POST", "/products", json={"name": "Box"})

        self.assertEqual(result.status_code, 201)
        self.assertEqual(sleep.call_count, 1)


if __name__ == "__main__":
    unittest.main()
