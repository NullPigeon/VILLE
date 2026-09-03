# LANDVILLE

LANDVILLE is a digital town built by its citizens. People propose physical town objects, vote on them, and approved ideas move through a human build queue before appearing in the shared World.

## Product surfaces

- `/world` — interactive town map and permanent object inspector.
- `/proposals` — wallet-gated proposals and token-weighted voting snapshots.
- `/chat` — general Town Chat where Mayor Scrapy lives with the citizens.
- `/mayor` — one-to-one Scrapy Workshop; refine an idea and explicitly submit a draft. Not posted to Town Chat, not persisted across page visits.
- `/treasury` — read-only treasury view and Robinhood Chain network adapter.
- `/citizens` — citizen onboarding and wallet sign-in; then the signed wallet's actual local activity. No sample identity or invented reputation.
- `/citizens/[wallet-address]` — address view with available local records; legacy username links redirect to `/citizens`.
- `/admin` — human-controlled `LIVE → PASSED → BUILDING → BUILT` queue.

The current MVP uses signed wallet sessions and independently reads the SCRAPY balance from Robinhood Chain at action time. Each signed wallet has one base vote, even with zero tokens. Every complete 250,000 SCRAPY adds one vote: 0 gives one, 250,000 gives two, 500,000 gives three, and 1,000,000 gives five. Only new votes use the new formula; existing receipts remain unchanged. Build requests still require at least 250,000 SCRAPY. Vote receipts preserve wallet, balance, block number and calculated weight.

Product routes start with empty state and do not seed fake proposals, citizens, treasury balances, world objects or chat messages. Locally created proposal/world state currently persists in the browser. Town Chat switches to shared Supabase persistence when the server variables are configured; otherwise it identifies itself as a local relay. Production proposal and vote records still need the same server-backed persistence before launch.

## Mainnet and identity

The product targets **Robinhood mainnet (chain 4663)** for wallet switching, sign-in challenges, balance snapshots and treasury explorer links. Testnet is only an explicitly selected development adapter; product actions never fall back to it. The snapshot endpoint rejects an RPC serving the wrong chain. Wallet sign-in proves ownership without a transaction and does not require SCRAPY or a successful balance read.

## From an idea to an object

Target workflow:

1. A citizen suggests an object in public Town Chat. Scrapy asks what it does, where it belongs and why it should exist.
2. The idea becomes a reviewed draft in the one-to-one workshop. The citizen explicitly confirms submission; a chat reply is not authorization to publish or deploy.
3. The server checks the signed identity and current mainnet SCRAPY holdings against the build tier, then opens a proposal.
4. Citizens vote. The balance is read at voting time; weight is `1 + floor(SCRAPY / 250000)`. Votes must be persisted and deduplicated on the server.
5. After the voting window, quorum and approval rules are evaluated. Passing creates a build task, not an instant production release.
6. A builder implements the actual functional module, tests it and submits it for review. After approval and deployment, its object is registered on the World canvas and linked to its creator.
7. Scrapy reports the confirmed result to Town Chat and the citizen's record.

**Current boundaries:** public chat replies do not automatically create drafts or proposals. Workshop drafts are simple text-derived previews, not structured engineering specs. Proposal, vote and World records remain in browser localStorage. Admin status changes currently add a map record, not a working deployed module. Shared storage and server authorization, duplicate-vote protection, quorum/deadlines, build tiers, build execution/review and event-driven Scrapy updates are still required before a public governance launch. Per-wallet base votes and action-time balances also need an explicit anti-abuse policy for multiple wallets and moving tokens between wallets during a vote.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` when configuring integrations. Keep `OPENAI_API_KEY` server-only; never rename it with a `NEXT_PUBLIC_` prefix.

Validation:

```bash
npm run lint
npm test
npm run build
```

## Deploy to Vercel

1. In Vercel, choose **Add New → Project** and import `NullPigeon/VILLE`.
2. Keep the detected framework as **Next.js** and deploy from `main`.
3. Add the variables from `.env.example` under **Project Settings → Environment Variables**.
4. Set `NEXT_PUBLIC_SITE_URL` to the final Vercel URL and redeploy once.
5. Add `OPENAI_API_KEY` to activate the live Mayor; without it Mayor uses the built-in Scrapy fallback.
6. Set the **mainnet** `SCRAPY_TOKEN_ADDRESS`, `NEXT_PUBLIC_TREASURY_ADDRESS`, a dedicated server-only `ROBINHOOD_MAINNET_RPC_URL` and a long `WALLET_SESSION_SECRET`. The treasury still needs an indexer; adding an address does not load assets by itself. Never copy a testnet contract address into production without verifying the mainnet deployment.
7. Run `supabase/migrations/001_landville_chat.sql`, then add the Supabase variables to make Town Chat global across users.

Robinhood Chain integration is adapter-first: the UI can request that a user wallet add or switch networks, but the app never stores private keys or signs treasury transactions.
