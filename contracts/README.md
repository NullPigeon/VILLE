# LANDVILLE transaction adapters

Generated city modules never submit arbitrary calldata. Each write action is
implemented by a reviewed host adapter and must also be declared in the immutable
module artifact.

## Fee swap adapter v1

`LandvilleTransactionRouter.sol` supports one action: a direct, single-pool ERC-20
to ERC-20 Uniswap V3 exact-input swap on Robinhood Mainnet.

- The citizen approves only the exact gross input amount to this router.
- The router transfers 1% of the input token to its immutable treasury.
- The remaining 99% is swapped through the immutable official SwapRouter02.
- Output always goes to `msg.sender`.
- LANDVILLE derives `amountOutMinimum` from a fresh quote; the module cannot set a
  router, treasury, recipient or arbitrary call.
- The contract has no owner, upgrade hook, arbitrary-call function or native ETH
  receive path.

The 1% is charged in the input token, not ETH. An ETH-denominated percentage would
need a trusted price conversion and an additional value-bearing path, increasing
both attack surface and transaction complexity.

## Mainnet deployment gate

Do not enable this adapter from an unreviewed deployment.

1. Compile with Solidity `0.8.30`, optimize, test and independently review the
   bytecode/source.
2. Deploy to Robinhood Mainnet (chain `4663`) with constructor arguments:
   - `treasury_`: the public `SCRAPY_TREASURY_ADDRESS`.
   - `swapRouter_`: official SwapRouter02
     `0xcaf681a66d020601342297493863e78c959e5cb2`.
3. Verify the source on the chain explorer.
4. Confirm `treasury()`, `swapRouter()` and `feeBps()` return the expected immutable
   values (`feeBps()` must be `100`).
5. Set `LANDVILLE_TRANSACTION_ROUTER_ADDRESS` to the verified deployment in Vercel
   Production.
6. Test with valueless tokens and a minimal amount, then set
   `LANDVILLE_WALLET_TRANSACTIONS_ENABLED=true` and redeploy.

No treasury private key is used by this adapter. Fees arrive at the public treasury
address through contract execution. Treasury withdrawals remain governed by the
separate treasury system.

## Adding another action

Staking, minting, purchases or other actions require a new protocol-specific adapter
and typed input schema. Before enabling one, add its literal action to the shared
artifact allowlist, implement server-side validation/calldata construction, add
confirmation copy and adversarial tests, then require `WALLET REVIEW` on generated
module PRs. Never add a generic target/data/value action.
