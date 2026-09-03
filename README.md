# LANDVILLE

LANDVILLE is a digital town built by its citizens. People propose physical town objects, vote on them, and approved ideas move through a human build queue before appearing in the shared World.

## Product surfaces

- `/world` — empty shared canvas; permanent built objects appear here.
- `/proposals` — wallet-gated proposals and token-weighted voting snapshots.
- `/chat` — general Town Chat where Mayor Scrapy lives with the citizens.
- `/mayor` — private, persistent Scrapy Workshop; refine an idea and explicitly submit a draft. It is separate from public Town Chat.
- `/treasury` — read-only treasury view and Robinhood Chain network adapter.
- `/citizens` — citizen onboarding and wallet sign-in; then the signed wallet's shared activity. No sample identity or invented reputation.
- `/citizens/[wallet-address]` — public profile from shared records; legacy username links redirect to `/citizens`.
- `/admin` — server-authorized `LIVE → PASSED → BUILDING → BUILT` queue.

The product uses signed wallet sessions and independently reads the official `$SCRAPY` contract (`0xf7CdBd39720Ea583ec56e3a9ff57E805e93e7BBe`) from Robinhood Chain at action time. Each signed wallet has one base vote, even with zero tokens. Every complete 250,000 SCRAPY adds one vote: 0 gives one, 250,000 gives two, 500,000 gives three, and 1,000,000 gives five. Build requests currently require at least 250,000 SCRAPY. Vote receipts preserve wallet, balance, block number and calculated weight.

Product routes start with empty state and do not seed fake proposals, citizens, treasury balances, world objects or chat messages. Supabase is the only source of truth for citizens, both chat histories, proposals, votes, the build queue and World objects; when it is not configured, writes fail instead of falling back to browser storage.

## Mainnet and identity

The product targets **Robinhood mainnet (chain 4663)** for wallet switching, sign-in challenges, balance snapshots and treasury explorer links. Testnet is only an explicitly selected development adapter; product actions never fall back to it. The snapshot endpoint rejects an RPC serving the wrong chain. Wallet sign-in proves ownership without a transaction and does not require SCRAPY or a successful balance read.

## From an idea to an object

Workflow:

1. A citizen suggests an object in public Town Chat. Scrapy asks what it does, where it belongs and why it should exist.
2. The idea becomes a reviewed draft in the one-to-one workshop. The citizen explicitly confirms submission; a chat reply is not authorization to publish or deploy.
3. The server checks the signed identity and current mainnet SCRAPY holdings, then opens an independent 12-hour vote. Each account can have only one `LIVE`, `PASSED` or `BUILDING` proposal; `BUILT` or `REJECTED` unlocks the next submission.
4. Any number of proposals from different citizens can be voted on simultaneously. The balance is read at voting time; weight is `1 + floor(SCRAPY / 250000)`. The database deduplicates one receipt per wallet and proposal.
5. When the window ends, strict `YES > NO` passes. Ties and no-vote results are rejected. There is no separate quorum or percentage threshold.
6. Approved proposals enter a deterministic queue ordered by voting deadline. The server permits only one `BUILDING` proposal at a time and prevents a later winner from skipping an earlier winner.
7. A builder implements the actual functional module, tests it and submits it for review. After deployment, its release path and reference are registered on the World canvas and linked to its creator.
8. Scrapy reports each confirmed lifecycle change to Town Chat and the citizen's record.

**Current boundaries:** public chat replies do not automatically create drafts or proposals. Workshop drafts are text-derived previews, not complete engineering specs. The build queue registers an already implemented and deployed module; it does not generate or deploy code automatically. Build-complexity tiers still need product rules. Per-wallet voting also needs an explicit anti-Sybil policy for multiple wallets and token movement between votes before a public governance launch.

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
7. In the Supabase SQL Editor, run `001_landville_chat.sql`, `002_landville_server.sql`, then `003_proposal_lifecycle.sql` in that order. Add `SUPABASE_URL` and a server-only `SUPABASE_SECRET_KEY` in Vercel.
8. Add the operator wallet(s) to `LANDVILLE_ADMIN_WALLETS`. Never expose Supabase, wallet-session or OpenAI secrets with a `NEXT_PUBLIC_` prefix.

Robinhood Chain integration is adapter-first: the UI can request that a user wallet add or switch networks, but the app never stores private keys or signs treasury transactions.
