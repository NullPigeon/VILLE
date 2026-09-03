# LANDVILLE

LANDVILLE is a digital town built by its citizens. People propose physical town objects, vote on them, and approved ideas move through a human build queue before appearing in the shared World.

## Product surfaces

- `/world` — interactive town map and permanent object inspector.
- `/proposals` — wallet-gated proposals and token-weighted voting snapshots.
- `/chat` — general Town Chat where Mayor Scrapy lives with the citizens.
- `/mayor` — Mayor Scrapy AI conversation and idea-to-proposal flow.
- `/treasury` — read-only treasury view and Robinhood Chain network adapter.
- `/citizens/[username]` — citizen identity, reputation and build history.
- `/admin` — human-controlled `LIVE → PASSED → BUILDING → BUILT` queue.

The current MVP uses signed wallet sessions and independently reads the SCRAPY balance from Robinhood Chain at action time. Each signed wallet has one base vote, even with zero tokens. Every complete 250,000 SCRAPY adds one vote: 0 gives one, 250,000 gives two, 500,000 gives three, and 1,000,000 gives five. Only new votes use the new formula; existing receipts remain unchanged. Build requests still require at least 250,000 SCRAPY. Vote receipts preserve wallet, balance, block number and calculated weight.

Product routes start with empty state and do not seed fake proposals, citizens, treasury balances, world objects or chat messages. Locally created proposal/world state currently persists in the browser. Town Chat switches to shared Supabase persistence when the server variables are configured; otherwise it identifies itself as a local relay. Production proposal and vote records still need the same server-backed persistence before launch.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` when configuring integrations. Keep `OPENAI_API_KEY` server-only; never rename it with a `NEXT_PUBLIC_` prefix.

Validation:

```bash
npm run lint
npm run build
```

## Deploy to Vercel

1. In Vercel, choose **Add New → Project** and import `NullPigeon/VILLE`.
2. Keep the detected framework as **Next.js** and deploy from `main`.
3. Add the variables from `.env.example` under **Project Settings → Environment Variables**.
4. Set `NEXT_PUBLIC_SITE_URL` to the final Vercel URL and redeploy once.
5. Add `OPENAI_API_KEY` to activate the live Mayor; without it Mayor uses the built-in Scrapy fallback.
6. Set `SCRAPY_TOKEN_ADDRESS`, `NEXT_PUBLIC_TREASURY_ADDRESS`, `ROBINHOOD_TESTNET_RPC_URL` and a long `WALLET_SESSION_SECRET` for real governance and treasury reads.
7. Run `supabase/migrations/001_landville_chat.sql`, then add the Supabase variables to make Town Chat global across users.

Robinhood Chain integration is adapter-first: the UI can request that a user wallet add or switch networks, but the app never stores private keys or signs treasury transactions.
