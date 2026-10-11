"""Curated LANDVILLE service routing for the Hugging Face demo."""

import json
import re
from urllib.parse import urlencode


# Service IDs match lib/external-market.ts. Availability and price are checked on LANDVILLE.
SERVICES = {
    "model-network": ("Choose an AI model", "General questions, code and writing"),
    "relay-long-form": ("Longform Desk", "Detailed articles, reports and guides"),
    "agent402-search": ("Web Scout", "Current web links and snippets"),
    "agent402-news": ("News Radar", "Recent news and source links"),
    "agent402-answer": ("Answer with Sources", "A short answer grounded in live web results"),
    "agent402-extract": ("Page Reader", "Text from a public web page"),
    "agent402-pdf": ("Read a PDF", "Text from a public PDF URL"),
    "stockkit-research": ("Stock Token Research", "Company and stock token context"),
}

SYSTEM_PROMPT = (
    "You are Scrapy's LANDVILLE agent desk. Select exactly one service from this list:\n"
    + "\n".join(f"- {key}: {value[1]}" for key, value in SERVICES.items())
    + "\nReturn exactly one JSON object with string fields service_id, reason, first_step. "
    "service_id must be an ID above. reason is one plain sentence. first_step is 2-4 "
    "useful sentences in the user's language. For creative work, write a small original starter. "
    "For current events, PDFs, web pages or market data, explain the concrete next action "
    "without claiming that you have fetched live data or completed a paid job. "
    "Do not invent citations, prices, current facts, payments or receipts. No markdown fence."
)


def parse_reply(raw: str) -> dict[str, str]:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.I)
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError("The model did not return a usable route. Please retry.") from exc
    if not isinstance(value, dict) or value.get("service_id") not in SERVICES:
        raise ValueError("The model suggested a service outside the demo catalogue. Please retry.")
    for field in ("reason", "first_step"):
        if not isinstance(value.get(field), str) or not value[field].strip():
            raise ValueError("The model returned an incomplete answer. Please retry.")
    return {field: value[field].strip() for field in ("service_id", "reason", "first_step")}


def market_url(service_id: str) -> str:
    if service_id not in SERVICES:
        raise ValueError("Unknown service")
    return "https://landville.xyz/agent-market?" + urlencode({"service": service_id})


def run_agent(brief: str, complete) -> dict[str, str]:
    brief = brief.strip()
    if len(brief) < 12:
        raise ValueError("Describe a specific task in at least 12 characters.")
    if len(brief) > 600:
        raise ValueError("Keep the task under 600 characters.")
    raw = complete(SYSTEM_PROMPT, brief)
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("The model returned an empty answer. Please retry.")
    return parse_reply(raw)
