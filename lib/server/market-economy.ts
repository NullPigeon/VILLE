import 'server-only';
import { createPublicClient, createWalletClient, defineChain, encodeFunctionData, erc20Abi, http, isAddress, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ApiError } from '@/lib/server/api';
import { citizenAccount, database, rpc } from '@/lib/server/database';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';

export const MARKET_USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
export const SELLER_MARKUP_SHARE_BPS = 9000n;
const chain = defineChain({ id: activeRobinhoodChain.id, name: activeRobinhoodChain.name,
  nativeCurrency: activeRobinhoodChain.nativeCurrency, rpcUrls: { default: { http: [activeRobinhoodChain.rpcUrl] } } });

export function sellerPayoutReady() {
  const payout = process.env.LANDVILLE_X402_PAYOUT_ADDRESS?.trim() || '';
  const treasury = process.env.SCRAPY_TREASURY_ADDRESS?.trim() || '';
  const secret = process.env.SCRAPY_TREASURY_PRIVATE_KEY?.trim() || '';
  if (process.env.LANDVILLE_MARKET_SELLER_PAYOUTS_ENABLED !== 'true' || process.env.VERCEL_ENV !== 'production' ||
    !isAddress(payout) || !isAddress(treasury) || payout.toLowerCase() !== treasury.toLowerCase() ||
    !/^0x[0-9a-fA-F]{64}$/.test(secret)) return false;
  return privateKeyToAccount(secret as `0x${string}`).address.toLowerCase() === treasury.toLowerCase();
}

export function sellerAmounts(basePriceUsd: string, markupMicro: number) {
  const base = parseUnits(basePriceUsd, 6);
  const markup = BigInt(markupMicro);
  const gross = base + markup;
  if (markup < 10_000n || markup > 1_000_000n || gross > 2_000_000n) throw new ApiError(400, 'Choose a markup from 0.01 to 1 USDG within the 2 USDG call limit.');
  const seller = markup * SELLER_MARKUP_SHARE_BPS / 10_000n;
  return { base, markup, gross, seller, treasury: gross - seller, priceUsd: (Number(gross) / 1_000_000).toFixed(6) };
}

export async function sellerWallet(owner: string) {
  const citizen = await citizenAccount(owner);
  if (!citizen?.linked_wallet || !isAddress(citizen.linked_wallet)) throw new ApiError(409, 'Link an EVM wallet in your profile to receive payouts.');
  return citizen.linked_wallet.toLowerCase();
}

type Payout = { id: string; recipient_wallet: string; amount_micro: number | string; status: string; transaction_hash: string | null };

export async function sellerBalance(owner: string) {
  const [totals, payouts] = await Promise.all([
    rpc<Array<{ available_micro: number | string; earned_micro: number | string; city_micro: number | string }>>(
      'landville_market_seller_balance', { p_owner: owner }),
    database<Payout[]>(`landville_market_payouts?select=id,recipient_wallet,amount_micro,status,transaction_hash&owner_wallet=eq.${owner}&order=created_at.desc&limit=10`),
  ]);
  return { availableMicro: Number(totals[0]?.available_micro || 0),
    earnedMicro: Number(totals[0]?.earned_micro || 0),
    cityMicro: Number(totals[0]?.city_micro || 0), payouts };
}

export async function withdrawSellerBalance(owner: string) {
  if (!sellerPayoutReady()) throw new ApiError(503, 'Seller payouts are not enabled on the production treasury wallet.');
  const recipient = await sellerWallet(owner);
  const payout = await rpc<Payout>('landville_claim_market_payout', { p_owner: owner, p_recipient: recipient });
  const amount = BigInt(payout.amount_micro);
  let broadcastAttempted = false;
  try {
    const account = privateKeyToAccount(process.env.SCRAPY_TREASURY_PRIVATE_KEY!.trim() as `0x${string}`);
    const publicClient = createPublicClient({ chain, transport: http(activeRobinhoodChain.rpcUrl) });
    const [chainId, balance] = await Promise.all([publicClient.getChainId(),
      publicClient.readContract({ address: MARKET_USDG, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] })]);
    if (chainId !== 4663 || balance < amount) throw new Error('MARKET_TREASURY_INSUFFICIENT_USDG');
    const walletClient = createWalletClient({ account, chain, transport: http(activeRobinhoodChain.rpcUrl) });
    broadcastAttempted = true;
    const hash = await walletClient.sendTransaction({ account, chain, to: MARKET_USDG,
      data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [recipient as `0x${string}`, amount] }) });
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
    if (receipt.status !== 'success') throw new Error('MARKET_PAYOUT_TRANSACTION_FAILED');
    await rpc('landville_finish_market_payout', { p_id: payout.id, p_transaction: hash.toLowerCase() });
    return { amountMicro: amount.toString(), transaction: hash, recipient };
  } catch {
    // After a broadcast attempt, an RPC timeout cannot prove whether USDG moved.
    await rpc(broadcastAttempted ? 'landville_flag_market_payout' : 'landville_release_market_payout',
      { p_id: payout.id }).catch(() => undefined);
    throw new ApiError(503, broadcastAttempted
      ? `Payout ${payout.id} needs review. Do not request another transfer; contact LANDVILLE.`
      : 'Treasury transfer is unavailable. Your earnings remain available; try later.');
  }
}
