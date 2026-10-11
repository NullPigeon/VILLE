import json
import unittest

from agent_logic import SERVICES, market_url, parse_reply, run_agent


class AgentLogicTests(unittest.TestCase):
    def test_model_result_is_used_for_known_service(self):
        calls = []

        def complete(system, brief):
            calls.append((system, brief))
            return json.dumps({"service_id": "relay-long-form", "reason": "A report needs a long writing run.", "first_step": "Start with a clear outline."})

        result = run_agent("  Write a detailed report about agent payments.  ", complete)
        self.assertEqual(result["service_id"], "relay-long-form")
        self.assertEqual(calls[0][1], "Write a detailed report about agent payments.")
        self.assertIn("service=relay-long-form", market_url(result["service_id"]))

    def test_invented_service_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "outside the demo catalogue"):
            parse_reply('{"service_id":"invented","reason":"x","first_step":"x"}')

    def test_invalid_input_never_calls_model(self):
        def fail(*_):
            raise AssertionError("The model should not run")

        for brief in ("too short", "x" * 601):
            with self.assertRaises(ValueError):
                run_agent(brief, fail)

    def test_links_are_allowlisted(self):
        self.assertEqual(len(SERVICES), 8)
        with self.assertRaises(ValueError):
            market_url("unknown")


if __name__ == "__main__":
    unittest.main()
