# SCRAPY Treasury

## Rules

- A creator reward is created only when a module is first verified and inserted into the World.
- Rebuilds and later revisions do not create another reward.
- The creator must hold the configured minimum (initially 1,000,000 SCRAPY) in the wallet linked to the citizen account when eligibility is checked.
- The reward is the lower of 0.005 ETH or 1% of the currently available Treasury ETH.
- Holders may file Treasury proposals. One proposal is LIVE at a time; the rest queue in creation order.
- Voting lasts 48 hours, has no quorum, and passes only when YES power exceeds NO power with at least one YES vote.
- A requested ETH amount cannot exceed 10% of the balance observed when the proposal is filed.
- `REWARD_POLICY` proposals automatically update the minimum creator hold when they pass. Other passed proposals are recorded mandates and require a separately reviewed executor.

## Production setup

1. Run the unapplied Treasury migrations in timestamp order in the production Supabase SQL Editor: `20260911120000_treasury_governance.sql`, `20260912150000_require_five_module_voters.sql`, then `20260912151000_reduce_creator_reward_cap.sql`. If the first migration already ran, run only the two later files.
2. Add `SCRAPY_TREASURY_ADDRESS` to Vercel Production.
3. Export the EOA private key (not the seed phrase) and add it as `SCRAPY_TREASURY_PRIVATE_KEY` in Vercel **Production only**, with Vercel's **Sensitive** option enabled. Never add it to Preview or Development, send it in chat, download it with `vercel env pull`, or commit it.
4. Add `SCRAPY_REWARD_PAYOUT_ENABLED=false` and redeploy.
5. Open `/treasury`, verify the public address and ETH balance, and confirm holder proposal/vote behavior.
6. Fund only a small reward budget, set `SCRAPY_REWARD_PAYOUT_ENABLED=true`, and redeploy.
7. Keep the existing `Scrapy builder` scheduler enabled. Its five-minute cycle resolves new reward eligibility and processes at most one payment at a time.

The signer is fail-closed outside a Vercel Production runtime even if the payout switch is accidentally enabled. Keep only a small operational reward balance in this hot wallet; use a separate cold or multisig wallet for reserves.

If a send has an uncertain result, the reward moves to `PAYMENT_REVIEW` and automatic payouts stop. Verify the address and transaction history manually before changing database state. This prevents an uncertain request from being paid twice.
