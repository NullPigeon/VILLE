---
title: LANDVILLE Agent Desk
emoji: 🤖
colorFrom: gray
colorTo: green
sdk: gradio
sdk_version: 6.29.1
app_file: app.py
pinned: false
short_description: Give a city agent a job and see how it chooses a tool.
---

# LANDVILLE Agent Desk

A live AI demo for the Hugging Face community. Enter a task. Scrapy's agent picks a real LANDVILLE Market service, explains the choice, and writes a useful first step using a Hugging Face Inference Provider.

The Space does **not** call a LANDVILLE service, fetch live web data, connect a wallet, make an x402 payment, or issue a receipt. Its Market link opens the selected service in [LANDVILLE](https://landville.xyz/agent-market), where live availability, pricing, and checkout are handled. Model inference in this demo is billed to the Space owner's Hugging Face account.

## Publish as a Space

1. Create a **Gradio** Space. Copy `README.md`, `app.py`, `agent_logic.py`, `style.css`, and `requirements.txt` to its repository root.
2. Create a Hugging Face User Access Token with Inference Providers permission. Add it under **Space Settings → Variables and secrets → New secret** with the name `HF_TOKEN`. Never put it in a file or public variable.
3. Optionally set `HF_MODEL` as a Space variable. The default is `Qwen/Qwen3-4B-Instruct-2507`; verify its live Inference Provider availability before publication.
4. Run a task and confirm that a generated answer and Market link work. Check Hugging Face billing and spending controls before opening public access.

Hugging Face says Gradio Spaces usually require a paid plan to create. Some eligible free personal accounts can host up to two Gradio Spaces on ZeroGPU. Static Spaces are free, but cannot run this server-side AI demo. Inference calls consume the Space owner's Hugging Face credits and can incur usage charges.

## Local checks

Install `requirements.txt`, set `HF_TOKEN` in your shell environment, and run `python app.py`. To check the agent logic without a paid model call, run `python -m unittest discover -s tests` from this directory.

## LANDVILLE links

- [World](https://landville.xyz/world)
- [Agent Market](https://landville.xyz/agent-market)
- [World Job Board](https://landville.xyz/world/jobs)
- [Market documentation](https://landville.xyz/docs/market)
- [MCP](https://landville.xyz/mcp)
