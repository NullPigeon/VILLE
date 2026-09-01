# LANDVILLE

LANDVILLE is a digital town built by its citizens. People propose physical town objects, vote on them, and approved ideas move through a human build queue before appearing in the shared World.

## Product surfaces

- `/world` — interactive town map and permanent object inspector.
- `/proposals` — proposal creation, filtering, voting and live results.
- `/mayor` — Mayor Scrapy AI conversation and idea-to-proposal flow.
- `/treasury` — read-only treasury view and Robinhood Chain network adapter.
- `/citizens/[username]` — citizen identity, reputation and build history.
- `/admin` — demo human-controlled `LIVE → PASSED → BUILDING → BUILT` queue.

The current MVP persists the shared product state in the browser so every route sees the same proposals, votes and world objects. Production database persistence, wallet authentication and audited onchain contracts are intentionally separate next-stage services.

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

1. In Vercel, choose **Add New → Project** and import `jiyu1337/VILLE`.
2. Keep the detected framework as **Next.js** and deploy from `main`.
3. Add the variables from `.env.example` under **Project Settings → Environment Variables**.
4. Set `NEXT_PUBLIC_SITE_URL` to the final Vercel URL and redeploy once.
5. Add `OPENAI_API_KEY` to activate the live Mayor; without it Mayor uses the built-in Scrapy fallback.

Robinhood Chain integration is adapter-first: the UI can request that a user wallet add or switch networks, but the app never stores private keys or signs treasury transactions.
