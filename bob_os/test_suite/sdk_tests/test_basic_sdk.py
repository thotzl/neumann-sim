import unittest
import os
import sys

# Allow import of the new SDK
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk

class TestBobSDK(unittest.TestCase):
    def setUp(self):
        # We simulate the runner inject
        os.environ['BOB_ID'] = 'Test-Instance-1'

    def tearDown(self):
        if 'BOB_ID' in os.environ:
            del os.environ['BOB_ID']

    def test_agent_identity_injection(self):
        """Checks if the agent correctly reads its ID from the environment."""
        agent = bob_sdk.Agent()
        self.assertEqual(agent.id, 'Test-Instance-1')

    def test_agent_missing_identity(self):
        """Checks if the SDK crashes (security) when no ID is present."""
        del os.environ['BOB_ID']
        with self.assertRaises(bob_sdk.BobSDKError):
            agent = bob_sdk.Agent()

    def test_autoscript_wrapper(self):
        """Checks the functionality of the AutoScript Wrapper."""
        class MyTestMiner(bob_sdk.AutoScript):
            def __init__(self):
                super().__init__()
                self.execution_count = 0
            
            def on_tick(self):
                # We access the inherited 'self.me' instance
                self.execution_count += 1
                self.me.hardware.mine()

        script = MyTestMiner()
        self.assertEqual(script.me.id, 'Test-Instance-1')
        
        # Simulate a system run
        script.run()
        self.assertEqual(script.execution_count, 1)

if __name__ == '__main__':
    unittest.main()
