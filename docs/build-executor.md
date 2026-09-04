# Scrapy builder: setup and operating contract

## What is implemented

A trusted GitHub Actions controller finalizes expired votes, atomically claims the
oldest approved and technically reviewed proposal, requests an HTML/CSS/JavaScript
module through the Responses API, validates its contract, and writes **one JSON
artifact** to a `codex/build-lv-<id>-<attempt>` branch using GitHub's Git API. It
creates a commit attributed to `NullPigeon` and opens a PR. It cannot auto-merge.
The model gets the reviewed spec, not repository credentials or shell tools.
The controller never executes generated JavaScript. A separate, secret-free CI job
checks artifact contracts, script syntax, lint, unit/API tests, real PostgreSQL
migrations/concurrency, and the full Next.js build. Functional acceptance remains
an explicit human task, not an AI self-reported pass.

This is a bounded V1 builder, **not an unrestricted full-stack coding agent**.
Modules run in an opaque iframe with an HTTP sandbox CSP. No network, wallet,
shared storage, cookies, server imports, dependencies, forms or parent access.
State is transient and the UI says so. A persistent board, streaming radio,
marketplace or external integration needs a separately reviewed backend capability.
Do not approve a spec outside this runtime; reject it with an explanation or keep
the queue paused for engineering work. No fake persistent functionality.

Citizen drafts are still text-derived. The operator defines acceptance checks after
the vote, using the unchanged voted summary as the immutable goal. A future citizen-
confirmed engineering-spec flow before voting is not implemented by this release.

## 1. Activate shared storage

In the **LANDVILLE** Supabase SQL Editor, apply migrations 001 through 007 in
order, only those not already applied. Migration 004 adds `landville_build_jobs` and
service-role-only transaction functions. Migration 005 records chat reply provenance without publishing private archives. Existing Supabase data is not deleted.
First back up an existing production database. The CI database tests are disposable;
never run `tests/build-database.sql` against Supabase.

Configure the existing Supabase, wallet-session, operator-wallet and mainnet settings
from `.env.example`. Confirm two real citizens see the same Town history before
enabling build execution.

## 2. Vercel environment (operator deploys)

Set server-only `LANDVILLE_WORKER_SECRET` to a random value with at least 32
characters; use the same value in the GitHub Actions secret below. Set
`LANDVILLE_BUILD_ACTOR` to a wallet in `LANDVILLE_ADMIN_WALLETS`.

For publication checks, set `LANDVILLE_GITHUB_READ_TOKEN` with read access to this
repository's Contents, Pull requests and Checks. Set `LANDVILLE_VERCEL_READ_TOKEN`,
`LANDVILLE_VERCEL_PROJECT_ID` and, if applicable, `LANDVILLE_VERCEL_TEAM_ID`. Keep all
keys server-only. Restrict Vercel credentials to the narrowest supported scope.
`NEXT_PUBLIC_SITE_URL` must be the actual production HTTPS alias, not a preview URL.
Enable Vercel's automatically exposed system environment variables: the verifier
uses `VERCEL_ENV`, `VERCEL_DEPLOYMENT_ID`, `VERCEL_GIT_COMMIT_SHA`.

Keep `LANDVILLE_BUILDER_ENABLED=false` until setup is complete. Do not give preview
deployments production Supabase credentials. For browser acceptance use a separate
staging Supabase project and operator wallet/session configuration, or test locally
with the reviewed module branch and a staging database. No real production keys in CI.

## 3. Repository Actions configuration

Repository: **NullPigeon/VILLE**. Create these Actions secrets:

- `LANDVILLE_WORKER_SECRET`: same as the coordinator in Vercel.
- `LANDVILLE_BUILDER_OPENAI_KEY`: dedicated project key; configure its spending limit.
- `LANDVILLE_GITHUB_WRITE_TOKEN`: repository-restricted token with Contents and Pull
  requests write. No Workflows, administration or organization permission. A GitHub
  App installation token can replace the fine-grained PAT if its rotation is managed
  externally. The bundled worker does not mint installation tokens.

Actions variables:

- `LANDVILLE_SITE_URL`: production HTTPS origin, no path/query.
- `LANDVILLE_BUILDER_MODEL`: an explicitly selected Responses/Structured Outputs
  model available in your API project. There is no guessed worker model default.
- `LANDVILLE_SCHEDULER_ENABLED=true`: enables the scheduled coordinator.
- `LANDVILLE_BUILDER_ENABLED=false` initially: finalize votes without paid builds.

Use the dedicated write credential, not the workflow's default `GITHUB_TOKEN`, so
the generated PR can trigger normal CI. Configure branch protection on `main`:
require PR review and **City checks**, disallow force pushes and direct writes by
the builder identity, and do not grant it a bypass. Do not enable automatic merging.
Credentials can technically grant broader Contents access than the controller uses;
branch protection is an essential second boundary.

The schedule requests a tick every five minutes; GitHub may delay scheduled jobs.
Votes still reject late submissions exactly at the deadline in PostgreSQL. Status
finalization happens on the next successful tick, not necessarily at the exact second.
One job can run globally and the workflow has a ten-minute timeout. Database leases
last fifteen minutes. An expired lease fails closed and blocks the queue for review.

## 4. First real build

1. Start with a small, transient module such as a counter or mini-game. Run its real
   12-hour vote; do not falsify votes or create production sample citizens.
2. Sign in as an operator at `/admin`. Review the passed goal; write concrete
   acceptance checks and confirm it fits the sandbox runtime.
3. Set `LANDVILLE_BUILDER_ENABLED=true` in **both Vercel and Actions**, redeploy the
   coordinator, and manually run **Scrapy builder** from Actions for the first test.
4. Inspect the PR. It must add exactly `city-modules/LV-<id>.json`. Wait for the exact
   head commit's **City checks**. Inspect source and test every acceptance criterion.
5. Merge manually into main. Wait for the Vercel production deployment to be ready.
6. On the production site's `/admin`, click **VERIFY PRODUCTION RELEASE**. The server
   verifies repo/branch/head, CI, merged SHA, Vercel project, active production alias
   and the locally packaged artifact SHA-256. It accepts no supplied release URL.
7. Only then does one transaction mark BUILT, create the clickable World object,
   broadcast to Town Chat and unlock the citizen's next proposal.

For V1, publish immediately after the PR's merge deployment, before merging another
commit: the verifier deliberately requires the current production SHA to equal
that PR's merge SHA. If the deployment fails, keep the job in REVIEW. Never manually
register a path to bypass verification. Automatic post-deploy publication is not
enabled; the final human click records acceptance and starts server verification.

## Failures and recovery

Never mark failed work BUILT. An operator can retry a FAILED job up to three total
attempts without changing the approved spec, or reject the proposal with a reason.
Retries get distinct branches and leases. An old worker cannot complete a newer
attempt. COMPLETE receipts are idempotent and retried without duplicating the PR.

If a provider timeout leaves a branch/PR but no receipt, inspect the private Actions
run and the deterministic branch. Do not blindly retry. Close an orphaned PR before
approving a new attempt; automatic orphan reconciliation is not implemented. If you
reject a BUILDING proposal while the worker is running, stop its Actions run and
close any resulting PR; database completion/publication rejects the stale job.
Provider errors are deliberately not copied into public chat or database fields.

Do not edit generated files in the PR and then try to publish against the old
receipt: the head/hash checks reject changed artifacts. Rebuild through a new reviewed
attempt or add an explicit receipt-reconciliation flow before expanding the workflow.

If CI or acceptance review fails on a REVIEW job, close its unmerged PR and use
REBUILD AFTER CLOSING PR. The server verifies the old PR is closed and unmerged
before allowing the same reviewed spec to be attempted again (three attempts total).

## Remaining launch gates

Production migration application, credentials, branch protection, the chosen model's
actual API access and a real GitHub/Vercel end-to-end build need operator activation.
Local tests use mocked AI/GitHub HTTP; they are not proof of live integration. The
Actions SQL test uses real disposable PostgreSQL, not your production database.
Multi-wallet/token-movement governance abuse policy remains a separate launch gate.

References: [Responses Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[GitHub commits](https://docs.github.com/en/rest/git/commits),
[GitHub PRs](https://docs.github.com/en/rest/pulls/pulls),
[Vercel deployment verification](https://vercel.com/docs/rest-api/deployments/get-a-deployment-by-id-or-url),
[CSP sandbox](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox).
