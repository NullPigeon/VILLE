import json
import unittest

from build_logic import DISTRICTS, parse_build, render_building, run_builder


class BuildLogicTests(unittest.TestCase):
    def test_idea_becomes_a_preview_in_selected_district(self):
        calls = []

        def complete(system, request):
            calls.append((system, request))
            return json.dumps({
                "title": "Scrap Arcade",
                "kind": "arcade",
                "purpose": "Citizens play short robot games together.",
                "features": ["Three tiny games", "A score board", "A robot host"],
                "scrapy_line": "Even the broken joysticks deserve a second life.",
            })

        spec = run_builder("A funny arcade for short robot games.", "Meme Pit", complete)
        preview = render_building(spec, "Meme Pit")
        self.assertIn("District: Meme Pit", calls[0][1])
        self.assertIn("SCRAP ARCADE", preview)
        self.assertIn("MEME PIT / NOT PUBLISHED", preview)

    def test_unsafe_model_text_is_escaped_in_svg(self):
        spec = {"title": "<script>alert(1)</script>", "kind": "gallery"}
        preview = render_building(spec, "Market")
        self.assertNotIn("<script>", preview)
        self.assertIn("&lt;script&gt;", preview)

    def test_invalid_kind_and_feature_list_are_rejected(self):
        base = {"title": "Scrap Arcade", "kind": "arcade", "purpose": "Citizens play games.", "features": ["A", "B", "C"], "scrapy_line": "Build it."}
        for replacement in ({"kind": "casino"}, {"features": ["Only one"]}):
            with self.assertRaises(ValueError):
                parse_build(json.dumps({**base, **replacement}))

    def test_invalid_input_never_calls_model(self):
        def fail(*_):
            raise AssertionError("Model must not be called")

        for idea, district in (("too short", "The Dump"), ("A real idea for a place", "Fake District"), ("x" * 451, "Market")):
            with self.assertRaises(ValueError):
                run_builder(idea, district, fail)
        self.assertEqual(len(DISTRICTS), 5)


if __name__ == "__main__":
    unittest.main()
