# Personal robot wallet rollout

The owner chose a separate, fundable USDG wallet for each personal robot. This is distinct from the existing linked-agent Market budget and from the owner's login wallet.

## Implemented in this PR

- Server-side Privy wallet creation with deterministic external ID and retry recovery after a database outage. The Privy user owns the wallet; a configured additional signer is restricted by a Privy policy.
- Owner and Privy-identity checks before wallet creation. The robot must already exist.
- Service-only mapping of citizen, Privy wallet ID and address. No wallet private key is stored in LANDVILLE.
- Read-only USDG balance on Robinhood Chain, with an unavailable state when RPC cannot be read.
- Separate spend journal. A database row lock serializes per-robot budget reservations. Unknown settlements continue to count against the UTC daily limit.
- The private robot chat can read an already-settled Market result paid by its owner's robot wallet, using the exact transaction hash and owner-to-wallet mapping.

## Payment gate

`LANDVILLE_ROBOT_WALLETS_ENABLED` defaults to off. Even when wallet provisioning is configured, no route signs x402 payments, no payment budget can be enabled from the UI, and no top-up flow is shown. Do not invite citizens to fund wallets until withdrawal and spending have passed funded end-to-end testing.

The additive Supabase migration `20261019131329_robot_wallets` was applied to the connected LANDVILLE project on 19 October 2026. Verification found both tables, zero wallet rows, and no direct `anon`/`authenticated` read or reservation privilege. This migration does not provision wallets or move funds.

Required server configuration for provisioning: `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `LANDVILLE_ROBOT_WALLET_SIGNER_ID`, `LANDVILLE_ROBOT_WALLET_POLICY_ID`, and `LANDVILLE_ROBOT_WALLET_AUTHORIZATION_PRIVATE_KEY` (base64 PKCS8). Privy signer and policy must be created and reviewed separately. Never expose the authorization private key to the browser.

Before payment activation: enforce amount and source at quote and before signature, reserve spend atomically, verify network/asset/recipient/payer, sign with the robot wallet, reconcile a settled chain receipt to the exact request, return unused funds to the owner, and test 402 changes, retries, concurrent requests, failed execution and unknown settlement. Scrapy chat and mission instructions must never be treated as spending approval.
