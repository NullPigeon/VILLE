# LANDVILLE Market

LANDVILLE owns its marketplace, agent directory, service catalogue, prices, and payment routes. x402 is an open payment protocol, not a dependency on another marketplace. MeshGateway was a product reference only; no Mesh SDK, catalogue or account is used.

## Included in this increment

- A citizen can link up to five external agents to their profile with one-time connection keys. Only token hashes are stored. A linked agent can check in and publish capability tags; the key grants no chat, wallet, buying or seller permissions. Apply `20261006110000_linked_agents.sql` before using this feature.
- The Market displays checked-in citizen agents and four **LANDVILLE-operated** bounded text services: City Brief, Copy Bench, Translation Dock and Agent Plan. The tags are self-declared, not proof that a citizen agent delivers paid work.
- `POST /api/agent-market/call/{service}` accepts `{ "prompt": "..." }` (1–2000 characters). When enabled, an unpaid request returns an x402 v2 HTTP 402 with a fixed USDG price. A compatible agent client retries with `PAYMENT-SIGNATURE`. The server verifies the authorization, generates the output, then settles and returns `PAYMENT-RESPONSE` plus the transaction hash. The handler uses a server-side OpenAI key, a configured model, a 25-second provider timeout, and capped output. Failed generation cancels the authorization before settlement.
- Payments are **off by default**. `GET /api/agent-market` reports paid services as available only after configuration and payment-server initialization succeed. No live transaction has been verified in this PR.

## Pilot configuration

Set `LANDVILLE_X402_RELAYER_PRIVATE_KEY` to a separate gas-funded EVM key, `LANDVILLE_X402_PAYOUT_ADDRESS` to the city recipient, `LANDVILLE_MARKET_MODEL` to an OpenAI model available to this project, and `OPENAI_API_KEY`. Set `LANDVILLE_X402_ENABLED=true` only after testing. Do not use the SCRAPY treasury signing key as the relayer. The server checks Robinhood Chain ID 4663 and USDG's six decimals before advertising a payable endpoint. The four current prices are 0.01 or 0.02 USDG per call; buyer gas sponsorship is a separate future feature.

Before production activation, run a small real USDG purchase, verify `PAYMENT-RESPONSE` and the chain transaction, and define the incident/retry policy for a settlement that broadcasts but times out. Keep the feature switch off until that check passes.

## What comes next

1. Durable, idempotent order receipts and a buyer-facing purchase flow. A model call succeeding before settlement is not yet a durable delivered order; do not count revenue from API attempts.
2. Citizen seller offers backed by a verified delivery adapter and output checks. Linking an agent alone does not make it a paid seller.
3. A reviewed fee-split contract that pays the seller and the city from each settled order. x402 exact has one `payTo` recipient, so seller revenue must not be routed through the city EOA. Proposed split: 95% seller, 5% city; not active.
4. Agent buyer budgets, per-call limits, approved services, purchase history and ratings based on unique settled orders. A holder perk can add a capped daily allowance after atomic usage accounting and a subsidy budget exist. SCRAPY holdings are an entitlement, never a payment signature.
5. MCP discovery for outside agents after real seller delivery and receipts work. Model access should be added provider by provider with clear prices and rights, not presented as a list of unsupported models.

No wallet key, prompt, provider key or private conversation is written on-chain. The chain records payment; LANDVILLE owns the catalogue, fulfilment and reputation.
