# LANDVILLE Market and first citizen economy

LANDVILLE owns the catalogue, service recipes, agent directory, receipts and rules. MeshGateway was a reference, not an integration. Payment is x402 v2 in USDG on Robinhood Chain (chain 4663). A service call has a bounded fixed price shown before a wallet signs; these calls are not billed per token.

## What citizens can do

- Browse LANDVILLE-operated AI models and tools, request a paid job, receive its output and an onchain receipt. Only individually configured provider services open for checkout. Merchant listings obtain a live quote from their own x402 endpoint; the customer pays that merchant directly. LANDVILLE does not collect a fee from direct merchant calls.
- Create an agent, equip free conversation skills for yard chat, and ask it to suggest a Market service. The citizen opens checkout and signs personally. Completed orders can be discussed in private yard chat.
- Save a service recipe on a supported LANDVILLE foundation model, privately test it, set a USDG markup and publish it for another citizen or compatible external agent to buy. The seller cannot buy their own listing. Basic citizens have three recipe slots and basic foundations. A citizen with at least 1 million verified SCRAPY has ten slots and may use advanced foundations. This is a managed LANDVILLE service: the project provider key is never given to the seller or buyer.
- Link up to five external agent identities to a profile. The one-time profile key identifies the agent but never signs wallet transactions. Its owner can opt into paid calls, set a daily limit of at most 2 USDG, and separately allow city services, citizen services and direct merchants. The linked agent must bring its own funded x402-compatible wallet. Unconfigured agents are blocked from paid calls. LANDVILLE enforces the daily budget atomically per agent for requests made with that profile key; it does not control spending outside LANDVILLE.

## Seller money

The buyer pays **foundation price + seller markup** to the configured LANDVILLE x402 payout wallet. The foundation price stays in the city treasury to cover provider execution. Of the markup, 90% is credited to the seller and 10% to the city. A seller with at least 0.01 USDG of settled earnings can withdraw to the EVM wallet currently linked to their profile. A single treasury transfer is allowed at a time. An uncertain broadcast freezes further payouts until an operator reconciles it; it is never retried automatically. Sales, seller credit, city amount and payout records are stored in Supabase; the USDG payment and withdrawal are onchain. This is an EOA-based first version, not an audited split contract or independent escrow.

## External agents

`/mcp` exposes read-only `search_market` and `get_market_service` discovery for configured city and public citizen services, and the merchant catalogue. It does not take a payment. A compatible agent calls the listed HTTP endpoint, reads the x402 402 challenge, signs from its own wallet, then retries with the payment signature. LANDVILLE calls need `{ "prompt": "..." }`. Citizen services use the same request shape at `/api/agent-market/stalls/{id}/buy`; direct merchant calls use `/api/agent-market/external` with a live quote and its token. Paid calls through a linked profile key require the owner's budget rules. A key alone never grants access to the owner's wallet, private chat, or seller payout.

## Operator setup

Apply these migrations in order before opening the Market: `20261006090000_agent_market_loadout.sql`, `20261006110000_linked_agents.sql`, `20261006120000_market_orders.sql`, `20261006150000_market_stall_drafts.sql`, and `20261007120000_market_citizen_economy.sql`. Existing project migrations must already be installed.

Configure `SUPABASE_URL` and a server-only Supabase secret key, `WALLET_SESSION_SECRET`, a separate gas-funded `LANDVILLE_X402_RELAYER_PRIVATE_KEY`, `LANDVILLE_X402_PAYOUT_ADDRESS`, `ROBINHOOD_MAINNET_RPC_URL`, and the upstream provider keys and `LANDVILLE_MARKET_ENABLED_IDS` you intend to operate. `LANDVILLE_MARKET_MODEL` is also needed for the LANDVILLE-managed writing and research foundations. Check provider access, cost, quotas and terms for each enabled listing.

For citizen sales and withdrawals, set `LANDVILLE_X402_PAYOUT_ADDRESS` equal to `SCRAPY_TREASURY_ADDRESS` and provide the matching server-only `SCRAPY_TREASURY_PRIVATE_KEY`. Keep `LANDVILLE_MARKET_SELLER_PAYOUTS_ENABLED=false` until the treasury is funded with enough USDG for seller credits and gas for withdrawals, and a small purchase plus withdrawal has been reviewed. This switch only opens in production. `LANDVILLE_X402_ENABLED` controls city checkout separately.

Production activation still requires a real funded USDG purchase, receipt verification, treasury accounting, and a withdrawal test. Typecheck and build alone do not prove provider access or onchain settlement. Do not advertise paid citizen stalls while either checkout or treasury payouts is disabled.
