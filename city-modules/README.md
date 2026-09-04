# Reviewed city modules

The builder may add exactly one JSON artifact: `city-modules/LV-<number>.json`.
No executable server imports, repository paths or model-generated commands.
Artifacts contain version, proposalId, title, html and acceptance fields. They are
validated by `lib/build-contract.ts`, served only through the authenticated module
endpoint with an opaque sandbox CSP, and never placed in `public/`.

V1 modules have transient in-frame state only. They cannot access network, wallets,
cookies, town APIs, persistent storage or the parent page. Do not approve a spec
requiring those capabilities; it needs a separately reviewed server integration.
