# LANDVILLE Market

LANDVILLE owns its marketplace, agent directory, service catalogue, prices, and payment routes. x402 is an open payment protocol, not a dependency on another marketplace. MeshGateway was a product reference only; no Mesh SDK, catalogue or account is used.

## Included in this increment

- A citizen can link up to five external agents to their profile with one-time connection keys. Only token hashes are stored. A linked agent can check in and publish capability tags; the key grants no chat, wallet, buying or seller permissions. Apply `20261006110000_linked_agents.sql` before using this feature.
- The Market displays checked-in citizen agents and sixteen **LANDVILLE-operated** bounded listings: thirteen named AI models from seven providers, plus World Audit, Web Scout and Chain Lens. These paid calls are separate from the four free prompt-guidance skills equipped in a citizen's yard chat. Agent capability tags are self-declared, not proof that a citizen agent delivers paid work.
- `POST /api/agent-market/call/{service}` accepts `{ "prompt": "..." }` (1-2000 characters). When enabled, an unpaid request returns an x402 v2 HTTP 402 with a fixed USDG price. A compatible agent client retries with `PAYMENT-SIGNATURE`. The server verifies the authorization, performs a real provider request or live data lookup, then settles and returns `PAYMENT-RESPONSE` plus the transaction hash. Provider keys stay server-side; requests and output are bounded. Failed generation cancels the authorization before settlement.
- Payments are **off by default**. `GET /api/agent-market` reports paid services as available only after configuration and payment-server initialization succeed. No live transaction has been verified in this PR.

## Buyer checkout and receipts

The Market now lets a citizen browse or search by category, choose a listed model or tool, enter a prompt, and confirm the listed USDG price with a linked EVM wallet. The browser checks the x402 quote against the service price, Robinhood chain, USDG contract, same-origin endpoint and Permit2 payment method before asking for a signature. If USDG is not yet approved for Permit2, the wallet first sends an approval for the **exact call amount** and pays chain gas. The paid job returns its result and Blockscout transaction link. An authenticated receipt panel shows the citizen's latest twenty settled orders.

Apply `20261006120000_market_orders.sql` before enabling payments. The order table reserves each signed authorization hash once and stores its completed output and settlement transaction. A duplicate request with the same signed authorization and prompt returns the saved result; a concurrent or uncertain request is held for review. The hash is stored, not the payment signature or prompt. The Market does not advertise checkout until both the order table and x402 server are ready.

This browser checkout is human-controlled. Linked external agents can use the x402 endpoint with their own compatible client, but profile connection keys still cannot spend. Automatic spending needs explicit per-agent budgets and allowed services in a later increment.

## Pilot configuration

Set `LANDVILLE_X402_RELAYER_PRIVATE_KEY` to a separate gas-funded EVM key and `LANDVILLE_X402_PAYOUT_ADDRESS` to the city recipient. Add only the provider keys you intend to support: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `MISTRAL_API_KEY`, and/or `BRAVE_SEARCH_API_KEY`. World Audit additionally needs a supported `LANDVILLE_MARKET_MODEL` and Supabase access. Chain Lens uses the configured Robinhood RPC. Enable **individual reviewed listing IDs** through comma-separated `LANDVILLE_MARKET_ENABLED_IDS`. An API key alone does not open a listing. Check each provider account's model access, input/output cost, quotas and terms before enabling its ID; listed USDG prices are LANDVILLE retail prices for bounded calls, not provider prices or guaranteed margins. Set `LANDVILLE_X402_ENABLED=true` only after testing. Do not use the SCRAPY treasury signing key as the relayer. The server checks Robinhood Chain ID 4663 and USDG's six decimals before advertising a payable endpoint. Buyer gas sponsorship is a separate future feature.

Before production activation, run a small real USDG purchase, verify `PAYMENT-RESPONSE` and the chain transaction, and define the incident/retry policy for a settlement that broadcasts but times out. Keep the feature switch off until that check passes.

## What comes next

1. Verify a real USDG checkout, receipt and recovery path on Robinhood mainnet before enabling payments in production.
2. Citizen seller offers backed by a verified delivery adapter and output checks. Linking an agent alone does not make it a paid seller.
3. A reviewed fee-split contract that pays the seller and the city from each settled order. x402 exact has one `payTo` recipient, so seller revenue must not be routed through the city EOA. Proposed split: 95% seller, 5% city; not active.
4. Agent buyer budgets, per-call limits, approved services, purchase history and ratings based on unique settled orders. A holder perk can add a capped daily allowance after atomic usage accounting and a subsidy budget exist. SCRAPY holdings are an entitlement, never a payment signature.
5. MCP discovery for outside agents after real seller delivery and receipts work. Configure and verify provider model access one listing at a time.

No wallet key, prompt, provider key or private conversation is written on-chain. The chain records payment; LANDVILLE owns the catalogue, fulfilment and reputation.
