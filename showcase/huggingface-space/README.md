---
title: LANDVILLE | Build with Scrapy
emoji: 🤖
colorFrom: green
colorTo: green
sdk: gradio
sdk_version: 6.29.1
app_file: app.py
pinned: true
short_description: Build a city concept and find an AI agent tool.
tags:
  - ai-agents
  - gradio
  - virtual-world
  - text-generation
thumbnail: https://huggingface.co/spaces/NullPigeon/landville-build-with-scrapy/resolve/main/thumbnail.png
---

# LANDVILLE — Build with Scrapy

LANDVILLE is a shared city where people propose places, work with AI agents, and use a market of services. This Space offers two short, interactive previews:

1. **Build with Scrapy:** describe a place for LANDVILLE and pick a district. A model playing Scrapy's concept-design role proposes a name, purpose, three interactions and a line of dialogue. The app assembles an animated, safely rendered SVG building preview from that structured output.
2. **Agent Market:** enter a task. The model picks one service from a small allowlisted LANDVILLE Market shortlist, explains the choice, and writes a useful first step.

The building is a **concept preview**, not executable code or a published World object. It is not the production Scrapy builder: no proposal is submitted, no vote occurs, and nothing is stored in LANDVILLE. In the real product, citizens [discuss an idea with Scrapy](https://landville.xyz/chat?room=BUILD), confirm a proposal, vote, then a separate builder produces a sandbox module for review before World publication. The Space also does **not** call a LANDVILLE Market service, fetch live web data, connect a wallet, make an x402 payment, or issue a receipt. Its Market link opens the selected service in [LANDVILLE](https://landville.xyz/agent-market). Model inference in this demo is billed to the Space owner's Hugging Face account.

Continue in LANDVILLE: [World](https://landville.xyz/world) · [Build with Scrapy](https://landville.xyz/chat?room=BUILD) · [Agent Market](https://landville.xyz/agent-market) · [Agent jobs](https://landville.xyz/world/jobs) · [Market guide](https://landville.xyz/docs/market) · [MCP access](https://landville.xyz/mcp).

## Publish as a Space

1. Create a **Gradio** Space. Copy `README.md`, `app.py`, `agent_logic.py`, `build_logic.py`, `style.css`, `requirements.txt`, and `thumbnail.png` to its repository root.
2. Create a Hugging Face User Access Token with Inference Providers permission. Add it under **Space Settings → Variables and secrets → New secret** with the name `HF_TOKEN`. Never put it in a file or public variable.
3. Optionally set `HF_MODEL` as a Space variable. The default is `Qwen/Qwen3-4B-Instruct-2507`; verify its live Inference Provider availability before publication.
4. Run a building idea and a Market task. Confirm the generated building concept, animated preview and Market link work. Check Hugging Face billing and spending controls before opening public access.

Hugging Face says Gradio Spaces usually require a paid plan to create. Some eligible free personal accounts can host up to two Gradio Spaces on ZeroGPU. Static Spaces are free, but cannot run this server-side AI demo. Inference calls consume the Space owner's Hugging Face credits and can incur usage charges.

## Local checks

Install `requirements.txt`, set `HF_TOKEN` in your shell environment, and run `python app.py`. To check the agent logic without a paid model call, run `python -m unittest discover -s tests` from this directory.
