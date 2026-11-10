import unittest
from unittest.mock import Mock
from price_safety import guard_cards, price_error
from parse_daily import parse_item_line, process
from server import upload_one_card

class PriceSafetyTest(unittest.TestCase):
    def test_mentions_and_contacts_are_not_products(self):
        for line in ['@77074403678 не забудьте про нас', 'Опубликуете @77074403678', 'Приняли? +7 (707) 440-36-78', 'Доброе утро 8 707 440 36 78', '10.11.2026', 'Забрать в 18:30']:
            with self.subTest(line=line): self.assertEqual([], parse_item_line(line))

    def test_real_price_survives_contact_removal(self):
        cards = parse_item_line('Круассан 900 вместо 1800 @77074403678')
        self.assertEqual(900, cards[0]['price'])
        self.assertEqual(1800, cards[0]['originalPrice'])

    def test_all_price_formats_are_guarded(self):
        for line in ['Круассан 2000000 вместо 3000000', 'Круассан 1/2000000', 'Круассан 2000000']:
            with self.subTest(line=line):
                cards = parse_item_line(line)
                self.assertTrue(cards[0]['error'])
                self.assertTrue(cards[0]['needsReview'])

    def test_final_guard_covers_bundles_and_catalogue_prices(self):
        cards = guard_cards([{'price': 20, 'originalPrice': 2000000}, {'price': 900, 'originalPrice': 1800}])
        self.assertTrue(cards[0]['needsReview']); self.assertNotIn('error', cards[1])

    def test_bad_numeric_values_and_boundary(self):
        for value in ['NaN', 'Infinity', -1, 0, True, 'oops', 1000001]:
            self.assertIsNotNone(price_error({'price': value}))
        self.assertIsNone(price_error({'price': 1000000, 'originalPrice': 1000000}))

    def test_force_cannot_bypass_price_guard(self):
        client=Mock()
        result=upload_one_card({'name':'test','price':77074403678,'originalPrice':96343004598},client,{},[],[],{},'.',force=True)
        self.assertEqual('skipped',result['result']); self.assertEqual([],client.mock_calls)
