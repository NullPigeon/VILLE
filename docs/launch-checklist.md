# LANDVILLE launch configuration

The repository contains the integration code, not your production credentials.
An environment-variable name shown in Vercel is not proof that its value works.
The operator configures and redeploys Vercel; do not paste secrets into chat or Git.

## 1. Production variables to set now

In the LANDVILLE Vercel project's environment settings, select **Production**.
Use separate credentials and a separate database for Preview/staging.

| Variable | Value | Type |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://landville.xyz` | Config (public) |
| `SUPABASE_URL` | `https://eflesgktanzbkuuvhicu.supabase.co` | Config |
| `SUPABASE_SECRET_KEY` | The project's server secret key | Secret |
| `WALLET_SESSION_SECRET` | A cryptographically random value, at least 32 characters | Secret |
| `OPENAI_API_KEY` | A valid API project key with access and billing available | Secret |
| `OPENAI_MODEL` | `gpt-5.4-mini` (current application default) | Config |
| `ROBINHOOD_MAINNET_RPC_URL` | `https://rpc.mainnet.chain.robinhood.com`, or a compatible dedicated mainnet RPC | Config, or Secret if it embeds credentials |
| `LANDVILLE_ADMIN_WALLETS` | Your operator wallet address; comma-separated for multiple operators | Config |
| `LANDVILLE_BUILDER_ENABLED` | `false` until the separate builder setup is complete | Config |

Instead of `SUPABASE_SECRET_KEY`, you may use the project's legacy
`SUPABASE_SERVICE_ROLE_KEY`. Set one valid server credential, not placeholder values
for both: the code prefers `SUPABASE_SECRET_KEY` when both exist.

Generate a session secret locally, then copy the output directly into Vercel:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not change an already valid session secret unnecessarily: changing it signs out
existing sessions. This is not your wallet private key. Never provide a seed phrase.

Optional: `NEXT_PUBLIC_ROBINHOOD_MAINNET_RPC_URL` controls the browser wallet's RPC;
its default is the public mainnet endpoint. Never put a credential in a public variable.
`NEXT_PUBLIC_SUPABASE_URL` is only a fallback for the server URL; it is not required
when `SUPABASE_URL` is set. `NEXT_PUBLIC_TREASURY_ADDRESS` is optional; it does not
provide an asset indexer. The SCRAPY contract is pinned in source: no token-address
environment variable or testnet variable is required for the production flow.

The AI model reference is [OpenAI's model documentation](https://developers.openai.com/api/docs/models/gpt-5.4-mini).
A key being present does not verify model access, quota or a successful response.

## 2. Database upgrade before deploying this chat release

For the citizen cabinet / two-action chat update, if 001–005 are already installed,
apply **006_citizen_profiles.sql**, then **007_chat_recipient.sql** once each before
deploying. No new environment variables are required. Migration 006 numbers existing
citizens by `joined_at, wallet` starting at 2; Scrapy's reserved #1 is not a fake wallet
account. Numbers are unique and immutable; sequence gaps after rolled-back joins are
possible and are not reused. Usernames are lowercase, 3–24 characters, unique, and
cannot impersonate reserved system/numbered-citizen names. Clearing a name restores
the numbered default. Public URLs remain wallet-based so renames do not break links.
Avatars are selected from local icons; arbitrary uploads/remote tracking URLs are not supported.
Migration 007 preserves old message history and stores whether a new message addresses
Scrapy. A normal SEND never calls AI, including when the key is configured. ASK SCRAPY
and SEND use the same 10/50 daily allowance. Private archives remain private.

After deployment, check sign-in redirects to `/citizens/<wallet>`, edit and save a
username, reload and verify it appears on the public profile and existing chat
messages. A different wallet must not be able to edit it. Test SEND with a normal
greeting (no AI reply), then ASK SCRAPY (public labeled AI reply). Enter defaults to SEND.
The chat scrollbar uses a robot icon in Chromium/WebKit and native green/dark colors
where scrollbar images are unsupported; keyboard/touch scrolling remain native.

Back up an existing production database. Apply only migrations not already applied,
in numerical order. If 001–004 are already installed, run only
`supabase/migrations/005_chat_provenance.sql` in the LANDVILLE Supabase SQL Editor.
This adds the reply-source field and constraints. It does not delete, publish or move
any historical messages. Do not run the disposable CI database tests in Supabase.

Afterwards, this read-only check should return `ai_source`:

```sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'landville_messages'
  and column_name = 'ai_source';
```

## 3. Redeploy and verify as the operator

Redeploy the latest main commit after setting variables and applying migration 005.

1. Open `/citizens`, connect your wallet and sign the authentication message. No
   transaction is needed. The signed wallet must match `LANDVILLE_ADMIN_WALLETS`.
2. Open `/admin` (BUILD CONTROL in the menu), then **CHECK CONFIGURATION**. It performs
   authenticated read-only storage checks and reports flags without secret values.
   It does not prove every database function, RPC or worker credential works.
3. Click **TEST LIVE AI · API COST**. This explicitly makes one small billable API
   request. A successful result proves a reply was received at that time; no test
   message is saved to Town Chat. The test is limited to once per minute per operator.
4. Send a real message using **ASK SCRAPY** in `/chat`. Confirm the reply says **AI RESPONSE**. Missing
   credentials or upstream failure produce clearly marked **SCRIPTED RESPONSE**,
   not a false claim that AI answered. Replies preserve this source after reload.
5. Read Town Chat in another browser. Confirm the same public history appears.
   Guests may read; writing requires signing in. The old `/mayor` page redirects to
   `/chat`; `/chat/archive` shows only the signed wallet's old private messages.

To propose a build, select **PREPARE MY PROPOSAL** on your own public message, review
the editable draft and explicitly confirm. Discussion alone never opens voting.
The existing token threshold, one-active-request limit and 12-hour vote rules remain.

## 4. Builder is a separate activation

Chat AI and the code-building worker are separate integrations. A working chat key
does not activate builds, CI, scheduled vote finalization or production publication.
Keep the worker disabled until [the builder checklist](build-executor.md) is complete:
Vercel coordinator credentials, GitHub Actions secrets/variables, branch protection,
one reviewed test build, a human-reviewed PR and verified production release.

This release does not resolve the anti-Sybil/token-transfer governance launch gate,
add full-stack module capabilities or remove human release review.
