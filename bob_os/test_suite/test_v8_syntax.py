import unittest
import sys
import os

# Importiere den Parser (TDD: Wird ggf. noch modifiziert, um Tests zu bestehen)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from core.lib.functional_parser import parse_functional_string

class TestV8FunctionalParser(unittest.TestCase):
    """
    Testet die Robustheit des Functional Parsers für LLM-Inputs.
    """

    # --- HAPPY PATHS ---

    def test_basic_no_args(self):
        res = parse_functional_string("mine()")
        self.assertEqual(res['method'], 'mine')
        self.assertEqual(res['params'], {})

    def test_basic_no_parens(self):
        res = parse_functional_string("mine")
        self.assertEqual(res['method'], 'mine')
        self.assertEqual(res['params'], {})

    def test_scan_no_args(self):
        res = parse_functional_string("scan()")
        self.assertEqual(res['method'], 'scan')
        self.assertEqual(res['params'], {})

    def test_keyword_args_simple(self):
        res = parse_functional_string("build(building_type=matter_silo, matter_to_invest=100)")
        self.assertEqual(res['method'], 'build')
        self.assertEqual(res['params']['building_type'], 'matter_silo')
        self.assertEqual(res['params']['matter_to_invest'], '100')

    # --- ROBUSTNESS (LLM QUIRKS) ---

    def test_quote_tolerance(self):
        res = parse_functional_string("scut(receiver_id=\"Instance-2\", message='Hallo Welt')")
        self.assertEqual(res['params']['receiver_id'], 'Instance-2')
        self.assertEqual(res['params']['message'], 'Hallo Welt')

    def test_spacing_tolerance(self):
        res = parse_functional_string("  withdraw ( resource_type = energy , quantity = 50 ) ")
        self.assertEqual(res['method'], 'withdraw')
        self.assertEqual(res['params']['resource_type'], 'energy')
        self.assertEqual(res['params']['quantity'], '50')

    # --- GREEDY & COMMA HANDLING ---

    def test_greedy_last_argument_with_commas(self):
        res = parse_functional_string("scut(receiver_id=Instance-2, message=Hallo, wie geht es dir? Alles klar, Bruder.)")
        self.assertEqual(res['params']['receiver_id'], 'Instance-2')
        self.assertEqual(res['params']['message'], "Hallo, wie geht es dir? Alles klar, Bruder.")

    def test_order_independence(self):
        res = parse_functional_string("build(matter_to_invest=200, building_type=solar_collector)")
        self.assertEqual(res['params']['building_type'], 'solar_collector')
        self.assertEqual(res['params']['matter_to_invest'], '200')

    def test_greedy_out_of_order(self):
        # Falls msg zuerst kommt, muss der Parser klug genug sein,
        # 'receiver_id=' als Stopp-Signal für msg zu erkennen, oder er erzwingt, dass Greedy immer am Ende steht.
        # Erwartung: msg endet VOR ", receiver_id="
        res = parse_functional_string("scut(message=Hallo Bruder, receiver_id=Instance-2)")
        self.assertEqual(res['params']['receiver_id'], 'Instance-2')
        self.assertEqual(res['params']['message'], 'Hallo Bruder')

    # --- FALLBACKS (LLM vergisst Keys) ---

    def test_positional_fallback(self):
        # Wenn das LLM die Keyword-Syntax vergisst und wie in Python positional schreibt
        res = parse_functional_string("build(matter_silo, 100)")
        self.assertEqual(res['params']['building_type'], 'matter_silo')
        self.assertEqual(res['params']['matter_to_invest'], '100')

    def test_mixed_positional_and_kwargs_fails_gracefully(self):
        # Wenn das LLM mischt (sehr unsauber). 
        # Erwartung: Im besten Fall füllt es Parameter, im schlimmsten Fall gibt es keinen Crash.
        res = parse_functional_string("build(matter_silo, matter_to_invest=100)")
        self.assertIsNotNone(res)

    # --- ERROR CASES (Syntax Bruch) ---

    def test_missing_closing_paren(self):
        # Syntaktisch invalide, sollte None zurückgeben
        res = parse_functional_string("scut(receiver_id=Instance-2, message=Hallo")
        self.assertIsNone(res)

    def test_missing_opening_paren(self):
        # Kein Funktionsaufruf erkannt
        res = parse_functional_string("scut receiver_id=Instance-2 message=Hallo")
        self.assertIsNone(res)

    def test_unknown_method(self):
        # Unbekannte Methode. Parser sollte Methode erkennen, aber Params nicht sauber mappen (oder leer)
        res = parse_functional_string("halluziniere(foo=bar)")
        self.assertIsNotNone(res)
        self.assertEqual(res['method'], 'halluziniere')

if __name__ == '__main__':
    unittest.main()
