# Security

Public source code is not a credential. Publishing this repository exposes its code,
history, documentation, addresses and artwork. It should not expose production secrets
or private database records. This is a design boundary, not a security guarantee.

## Credentials and data

- Keep OpenAI, Supabase, GitHub, Vercel, worker and session secrets in the deployment
  platform's secret storage. `.env.local`, `.vercel`, `work/` and build outputs are
  ignored. `.env.example` contains configuration names and empty secret placeholders.
- `NEXT_PUBLIC_` variables are browser-visible. Never use that prefix for a secret.
- Supabase project URLs, token contracts and wallet addresses are identifiers, not
  database passwords. Knowing the URL must not grant access to protected tables.
- Database access uses server-only credentials. Migrations enable row-level security
  and restrict browser roles. Signing into LANDVILLE does not grant direct database access.
- Wallet signatures establish identity; the application does not request seed phrases
  or private keys. Admin permission comes from the server's wallet allowlist.
- Town Chat, public profiles and proposals are public product data. The legacy Workshop
  archive is restricted to its signed-in owner and is not copied into Town Chat.
- Production wallet-session signing refuses a missing or short secret. The development
  fallback and isolated test credentials in source must never be used in production.

## Pull requests and generated modules

City checks use a disposable local PostgreSQL database and no production credentials.
Do not change them to run untrusted PR code with production keys, a write token or
`pull_request_target` privileges. The trusted builder has separate, narrowly scoped
credentials. Its model receives a reviewed specification, not those credentials.

Generated modules run in an opaque sandbox with a restrictive content security policy.
They cannot access wallet providers, parent-page storage, cookies or external APIs.
Human review, passing checks and production-release verification remain required.
Sandboxing and automated checks do not replace a security review of generated code.

## Before making the repository public

- Scan the full reachable Git history, not only the current checkout. Inspect past
  branches, PRs, Actions logs and artifacts, releases, discussions and issues separately.
- If a real secret was committed or logged, revoke/rotate it first. Removing it from
  the latest file is not enough; coordinate any history cleanup with collaborators.
  See [GitHub's guidance on exposed credentials](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
- Protect `main`: require reviewed pull requests and City checks; block force pushes
  and builder bypasses. Enable available secret scanning, push protection and private
  vulnerability reporting. Confirm those settings in GitHub rather than assuming them.
- Give preview deployments a separate database and separate credentials. Verify that
  untrusted branches cannot deploy with production secrets.
- Verify deployed RLS and authorization with two separate accounts. Check that guests
  cannot write, one citizen cannot edit another, and private history stays private.
- Keep the builder disabled until repository protection and its end-to-end release
  checks are configured. Account/wallet multiplication and token movement between votes
  remain an unresolved governance-abuse concern.
- Choose a license explicitly if reuse rights are intended. Public visibility alone
  is not an open-source license. No new license is granted by this checklist.
  See [GitHub's licensing guidance](https://docs.github.com/en/enterprise-cloud%40latest/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

GitHub makes Actions history and logs visible when a private repository becomes public.
Review [the visibility-change consequences](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility) before changing that setting.

## Reporting

Do not post live secrets, private data or exploit details in a public issue. Use GitHub's
private vulnerability reporting when the repository offers it; otherwise contact the
maintainer privately to arrange a secure report. A report should identify the affected
version, impact and minimal reproduction without exposing other citizens' data.
