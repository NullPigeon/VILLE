"""AI concept brief and safe, local building preview for the Space."""

import json
import re
from html import escape


DISTRICTS = {
    "The Dump": ("#d6935d", "#ad7548", "#d9f76a"),
    "Token Alley": ("#7bc5b7", "#6d8c78", "#d9f76a"),
    "Market": ("#c5d76b", "#9d8650", "#e5ba6d"),
    "Meme Pit": ("#bf82c6", "#855e8f", "#d9f76a"),
    "Townwide": ("#c9b780", "#9c865e", "#d9f76a"),
}
KINDS = {"arcade", "workshop", "gallery", "garden", "tower"}

BUILDER_PROMPT = """You are Mayor Scrapy, LANDVILLE's practical, funny junkyard robot.
Shape one visitor idea into a visual building concept for a DEMO. This is a concept sketch only.
The real LANDVILLE process is: citizen discusses an idea, citizen confirms a proposal, the community votes, then a separate builder makes a sandbox module that is reviewed before World publication.
Never claim this demo submitted a proposal, held a vote, built executable code, changed World, or published a building.
Return one JSON object only with these fields:
- title: short building name, 4-38 characters
- kind: exactly one of arcade, workshop, gallery, garden, tower; choose the closest visual form
- purpose: one concrete sentence explaining what citizens do there
- features: exactly three short, specific interactive features, each under 65 characters
- scrapy_line: one funny but helpful sentence spoken by Scrapy
Use the visitor's language for all prose. No markdown fence. If important details are missing, make reasonable DEMO choices, and keep them editable in the real LANDVILLE build room."""


def _required_text(value, limit: int) -> str:
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > limit:
        raise ValueError("Scrapy returned an incomplete concept. Please retry.")
    return value.strip()


def parse_build(raw: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.I)
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError("Scrapy did not return a usable concept. Please retry.") from exc
    if not isinstance(value, dict) or value.get("kind") not in KINDS:
        raise ValueError("Scrapy returned an unknown building form. Please retry.")
    features = value.get("features")
    if not isinstance(features, list) or len(features) != 3:
        raise ValueError("Scrapy returned an incomplete feature list. Please retry.")
    return {
        "title": _required_text(value.get("title"), 38),
        "kind": value["kind"],
        "purpose": _required_text(value.get("purpose"), 180),
        "features": [_required_text(item, 65) for item in features],
        "scrapy_line": _required_text(value.get("scrapy_line"), 180),
    }


def run_builder(idea: str, district: str, complete) -> dict:
    idea = idea.strip()
    if district not in DISTRICTS:
        raise ValueError("Choose a LANDVILLE district.")
    if len(idea) < 12:
        raise ValueError("Describe your place in at least 12 characters.")
    if len(idea) > 450:
        raise ValueError("Keep the idea under 450 characters.")
    raw = complete(BUILDER_PROMPT, f"District: {district}\nCitizen idea: {idea}")
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("Scrapy returned an empty concept. Please retry.")
    return parse_build(raw)


def render_building(spec: dict, district: str) -> str:
    """Render allowlisted SVG geometry. Model text is escaped and never executed."""
    if district not in DISTRICTS or spec.get("kind") not in KINDS:
        raise ValueError("Unknown building or district")
    sky, wall, accent = DISTRICTS[district]
    kind = spec["kind"]
    title = escape(spec["title"][:22].upper())
    detail = {
        "arcade": '<rect x="292" y="102" width="176" height="53" fill="#26341e" stroke="#151a13" stroke-width="7"/><text x="380" y="137" text-anchor="middle" font-size="23" font-weight="900" fill="#d9f76a">PLAY!</text>',
        "workshop": '<path d="M477 144V88h38v56" fill="#806f51" stroke="#151a13" stroke-width="7"/><path d="M498 82q-15-16 6-29" fill="none" stroke="#e1cd9d" stroke-width="8"/>',
        "gallery": '<polygon points="310,102 380,52 450,102" fill="#e8bd71" stroke="#151a13" stroke-width="7"/><circle cx="380" cy="90" r="18" fill="#d9f76a" stroke="#151a13" stroke-width="6"/>',
        "garden": '<path d="M293 148Q380 49 467 148" fill="#6d9d70" stroke="#151a13" stroke-width="8"/><path d="M380 72v76M330 105l28 43M430 105l-28 43" stroke="#d9f76a" stroke-width="5"/>',
        "tower": '<rect x="324" y="48" width="112" height="100" fill="#876f51" stroke="#151a13" stroke-width="8"/><rect x="355" y="72" width="50" height="50" fill="#d9f76a" stroke="#151a13" stroke-width="7"/>',
    }[kind]
    return f'''<div class="lv-build-preview" aria-label="Animated concept preview for {escape(spec['title'])}">
    <div class="lv-build-meta"><span>SCRAPY'S CONCEPT PREVIEW</span><span>{escape(district.upper())} / NOT PUBLISHED</span></div>
    <svg viewBox="0 0 760 440" role="img" aria-label="Illustrated {escape(kind)} building named {escape(spec['title'])}" xmlns="http://www.w3.org/2000/svg">
      <rect width="760" height="440" fill="#263721"/><path d="M0 0h760v440H0z" fill="{sky}" opacity=".28"/>
      <circle cx="630" cy="89" r="75" fill="{accent}" opacity=".75"/>
      <path d="M0 357h760v83H0z" fill="#765d3f"/><path d="M0 366h760M0 402h760" stroke="#d4c98b" stroke-width="4" stroke-dasharray="18 15" opacity=".48"/>
      <path d="M90 340l280-42 280 42" stroke="#d4c98b" stroke-width="8" fill="none" opacity=".45"/>
      <g class="lv-build-rise">
        <polygon points="248,152 295,132 295,341 248,320" fill="#594933" stroke="#151a13" stroke-width="9"/>
        <rect x="294" y="143" width="173" height="198" fill="{wall}" stroke="#151a13" stroke-width="9"/>
        <polygon points="244,151 310,103 450,103 481,151" fill="{accent}" stroke="#151a13" stroke-width="9"/>
        {detail}
        <rect x="315" y="193" width="45" height="58" fill="#d9f76a" stroke="#151a13" stroke-width="8"/>
        <rect x="401" y="193" width="45" height="58" fill="#d9f76a" stroke="#151a13" stroke-width="8"/>
        <rect x="356" y="274" width="53" height="67" fill="#26341e" stroke="#151a13" stroke-width="8"/>
        <circle cx="397" cy="313" r="4" fill="#d9f76a"/>
        <rect x="278" y="154" width="204" height="34" fill="#233019" stroke="#151a13" stroke-width="6"/>
        <text x="380" y="179" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="900" fill="#f5e8c1">{title}</text>
      </g>
      <g class="lv-scrapy-arrive"><path d="M538 298h73v61h-73z" fill="#7d8651" stroke="#151a13" stroke-width="7"/><rect x="526" y="270" width="98" height="62" rx="14" fill="#2e3d24" stroke="#151a13" stroke-width="8"/><ellipse cx="552" cy="298" rx="10" ry="17" fill="#d9ff26"/><ellipse cx="596" cy="298" rx="10" ry="17" fill="#d9ff26"/><path d="M567 315l15 5" stroke="#d9ff26" stroke-width="4"/><path d="M526 271l22-24h56l20 24" fill="#7b6c49" stroke="#151a13" stroke-width="7"/><text x="575" y="267" text-anchor="middle" font-size="14" font-weight="900" fill="#d9f76a">LV</text></g>
      <g class="lv-spark"><path d="M214 142l12-25 12 25 25 12-25 12-12 25-12-25-25-12z" fill="{accent}"/><path d="M513 110l7-14 7 14 14 7-14 7-7 14-7-14-14-7z" fill="#fff2a8"/></g>
      <text x="22" y="414" font-family="monospace" font-size="14" font-weight="bold" fill="#fff0bf">LANDVILLE / BUILD WITH SCRAPY / DEMO</text>
    </svg></div>'''
