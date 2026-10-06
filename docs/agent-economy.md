# LANDVILLE agent economy

## Product thesis

World is a city where citizens and their robots can buy useful work from other robots. The market lists **capabilities** (research, data, writing, image work, city knowledge), with the provider model shown as a detail. A raw list of every provider model would quickly become stale and would make it hard to understand what an agent can actually do.

MeshGateway is an inspiration for discovery and HTTP 402 payment. LANDVILLE's advantage is that each seller is a visible resident with a yard, a history of delivered work, and a reputation. The market must never imply that a model is live until its provider integration, price and payment route are configured.

## Release order

1. **Equipment and discovery (this increment).** Citizens can equip up to three basic capabilities on their personal robot. A linked wallet with a freshly verified nonzero SCRAPY balance unlocks the full curated catalog. The public catalogue and the robot's equipped tools are separate from payment. No fake purchases, earnings, or rankings.
2. **First payable LANDVILLE service.** Expose one bounded, platform-operated text service as a public x402 v2 endpoint. Use USDG on Robinhood Chain 4663 and a compatible facilitator, with the merchant address set to the LANDVILLE treasury. The configured provider model, maximum input/output and exact USDG price must be public. Add a spending cap and idempotent receipts before allowing an autonomous buyer. Keep provider API keys server-side. Verify the facilitator against the official supported-network endpoint before enabling production.
3. **Seller stalls.** Owners publish a *reviewed capability* from their existing agent, not an arbitrary URL or code proxy. Require an owned agent, linked wallet, bounded JSON schema, fixed per-call price, a health check, and safe output. Seller chooses whether the service is listed. One owner can have multiple capabilities; nonholders can equip at most three basic buyer tools. Review ownership and abuse limits before opening public registration.
4. **On-chain fee split.** x402 exact pays a single `payTo` address. For third-party sales deploy and audit a per-seller or per-offer split vault as that recipient: 95% of a successful sale belongs to the seller and 5% to the treasury. Use pull withdrawals and immutable recipients; do not route gross seller revenue into the existing treasury EOA. Publish contract and settlement receipts. The rate is a proposal, not an active fee.
5. **Agent buyers and MCP.** Give each robot an explicit owner-set daily USDG budget, per-call maximum and allowlist. A bounded worker may discover and buy only services inside that policy. Never hand a model a private key or unrestricted wallet tool. Expose LANDVILLE listings as read-only discovery plus payment-protected HTTP tools; then add an MCP Streamable HTTP adapter for outside agents. The buyer must own the signing wallet and opt in.
6. **Reputation.** Rank by settled, unique paid orders, delivery success, latency and buyer ratings with spam resistance. Keep leaderboard points, token holdings and money as separate measures. Display the transaction and facilitator receipt for each settled order.

## Entitlements and offers

- A nonholder can equip up to **three basic** catalogue capabilities. Premium capabilities are locked in the agent's configuration.
- A SCRAPY holder with a linked wallet and a fresh on-chain balance check can equip **all currently integrated** capabilities. Holdings do not make upstream model inference free.
- Target perk for the paid release: **10 basic calls per UTC day**, funded by a capped LANDVILLE subsidy, then exact pay-per-use pricing. Do not activate it until atomic counters and a daily USDG subsidy budget exist. Premium calls always show the price before payment; holder discounts need a fixed signed quote per call.
- Sellers receive the listed net price after the proposed 5% city fee. Provider cost, network/facilitator fees and any subsidy must be accounted for before publishing a price. Prices are in USDG, never City Points. SCRAPY is an entitlement token, not a payment authorization.

## Payment contract

`GET /api/agent-market` is free discovery with private per-user loadout and holder status. A paid invocation will use `POST /api/agent-market/call/{offer}` with bounded JSON input. Without payment it returns x402 v2 `402 Payment Required` and an exact USDG requirement. The retry includes a signed payment payload. The server verifies and settles with the facilitator before invoking the provider, writes an idempotent order record keyed by payment transaction, and returns the result plus receipt. Payment confirmation is not a guarantee of provider success; failures need a defined retry/refund policy before launch. No request body, API key, or private chat transcript goes on-chain.

The published prices, networks and supported models must be derived from live configuration, not hard-coded promotional copy. The first test is on a compatible testnet, followed by a small real USDG purchase on Robinhood Chain.

## Inspiration

- MeshGateway: https://docs.meshgateway.co/
- Mesh facilitator and supported networks: https://docs.meshgateway.co/facilitator
- x402 Bazaar discovery: https://github.com/x402-foundation/x402/blob/main/docs/extensions/bazaar.mdx
- Coinbase Bazaar MCP: https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/bazaar-mcp-server

## X teaser

Something is waking up in LANDVILLE. 🤖

Your agent won't just live in the city. It'll put its skills to work, discover other agents, and pay for what it needs — one tiny onchain transaction at a time.

An agent economy is coming. Built by citizens. Powered by SCRAPY. ⚡
