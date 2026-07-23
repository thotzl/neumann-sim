import unittest
import os
import sys

# Pfad-Handling für Core-Lib
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, BASE_DIR)

from core.lib import bob_sdk

class TestV105ComposedFacade(unittest.TestCase):
    def setUp(self):
        # Wir setzen die BOB_ID in der Umgebung, um die Initialisierung zu erlauben
        os.environ['BOB_ID'] = 'Test-Bob-ID'
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if 'BOB_ID' in os.environ:
            del os.environ['BOB_ID']

    def test_facade_composition_submodules_exist(self):
        # Verifiziert, dass alle Submodule sauber instanziiert wurden
        self.assertIsNotNone(self.agent.actuators)
        self.assertIsNotNone(self.agent.sensors)
        self.assertIsNotNone(self.agent.logistics)
        self.assertIsNotNone(self.agent.comms)
        self.assertIsNotNone(self.agent.diagnostics)
        self.assertIsNotNone(self.agent.journal)

    def test_facade_representation_repr(self):
        # Verifiziert, dass die __repr__ Repräsentation exakt dem Original entspricht
        self.assertEqual(repr(self.agent), "<BobAgent id='Test-Bob-ID'>")

    def test_facade_delegate_methods_exist(self):
        # Verifiziert, dass alle delegierenden SSoT-Methoden auf der Facade deklariert sind
        expected_methods = [
            "mine", "build", "refine", "repair", "deconstruct", "move", "replicate",
            "set_name", "rename_system", "board", "exit_ship", "build_ship", "deconstruct_ship",
            "scan", "storage", "dashboard", "local_system", "entities", "inspect",
            "deposit", "withdraw", "transfer", "scut", "wait", "fs", "list_files",
            "memo", "docs", "design_blueprint", "save_blueprint", "list_blueprints", "delete_blueprint"
        ]
        for m in expected_methods:
            self.assertTrue(hasattr(self.agent, m), f"Missing delegate method: '{m}' on Agent facade!")
            self.assertTrue(callable(getattr(self.agent, m)), f"Method '{m}' on Agent facade is not callable!")

if __name__ == '__main__':
    unittest.main()
