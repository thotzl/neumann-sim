import unittest
import os
import sys

# Erlaube Import der neuen SDK
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk

class TestBobSDK(unittest.TestCase):
    def setUp(self):
        # Wir simulieren den Runner-Inject
        os.environ['BOB_ID'] = 'Test-Bob-1'

    def tearDown(self):
        if 'BOB_ID' in os.environ:
            del os.environ['BOB_ID']

    def test_agent_identity_injection(self):
        """Prüft, ob der Agent seine ID korrekt aus der Umgebung liest."""
        agent = bob_sdk.Agent()
        self.assertEqual(agent.id, 'Test-Bob-1')

    def test_agent_missing_identity(self):
        """Prüft, ob die SDK crasht (Sicherheit), wenn keine ID vorliegt."""
        del os.environ['BOB_ID']
        with self.assertRaises(bob_sdk.BobSDKError):
            agent = bob_sdk.Agent()

    def test_autoscript_wrapper(self):
        """Prüft die Funktionalität des AutoScript Wrappers."""
        class MyTestMiner(bob_sdk.AutoScript):
            def __init__(self):
                super().__init__()
                self.execution_count = 0
            
            def on_tick(self):
                # Wir greifen auf die geerbte 'self.me' Instanz zu
                self.execution_count += 1
                self.me.hardware.mine()

        script = MyTestMiner()
        self.assertEqual(script.me.id, 'Test-Bob-1')
        
        # Simuliere einen System-Run
        script.run()
        self.assertEqual(script.execution_count, 1)

if __name__ == '__main__':
    unittest.main()
