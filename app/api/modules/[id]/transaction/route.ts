import { NextRequest, NextResponse } from 'next/server';
import { MODULE_TRANSACTION_ACTIONS, type ModuleTransactionAction } from '@/lib/build-contract';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { readCityModule } from '@/lib/server/city-module';
import { assertCitizen, database, enforceRate } from '@/lib/server/database';
import { prepareModuleTransaction, quoteExactInputSingle } from '@/lib/server/module-transaction';
import { proposalId } from '@/lib/server/validation';
import type { RobinhoodWalletInput } from '@/lib/module-runtime';

type PublishedObject = { proposal_id: string; artifact_path?: string; artifact_hash?: string };

function object(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Invalid transaction input.');
  return value as Record<string, unknown>;
}

async function verifiedModule(id: string, published: PublishedObject) {
  if (!published.artifact_path || !published.artifact_hash) throw new ApiError(503, 'Published module permissions are unavailable.');
  const artifact = await readCityModule(id, published.artifact_path);
  if (artifact.hash !== published.artifact_hash) throw new ApiError(503, 'The deployed module does not match its published permissions.');
  return artifact.module;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const citizen = requireWallet(request);
    await assertCitizen(citizen);
    if (process.env.LANDVILLE_WALLET_TRANSACTIONS_ENABLED !== 'true') throw new ApiError(503, 'Wallet transactions are not enabled by the LANDVILLE operator.');
    const id = proposalId((await params).id);
    const body = object(await jsonBody(request));
    if (Object.keys(body).some((key) => !['input'].includes(key))) throw new ApiError(400, 'Unsupported transaction request.');
    const input = object(body.input) as RobinhoodWalletInput;
    const operation = input.operation as ModuleTransactionAction;
    if (!MODULE_TRANSACTION_ACTIONS.includes(operation)) throw new ApiError(400, 'Unsupported wallet transaction operation.');

    const objects = await database<PublishedObject[]>(`landville_objects?select=proposal_id,artifact_path,artifact_hash&proposal_id=eq.${id}&limit=1`);
    if (!objects[0]) throw new ApiError(404, 'Published module not found.');
    const cityModule = await verifiedModule(id, objects[0]);
    if (!cityModule.capabilities?.transactions?.actions.includes(operation)) throw new ApiError(403, 'This module did not declare that wallet transaction permission.');
    await enforceRate(citizen, 'module-transaction', 20);

    if (operation === 'uniswap.quoteExactInputSingle') {
      return NextResponse.json(await quoteExactInputSingle(input), { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const citizens = await database<Array<{ linked_wallet: string | null }>>(`landville_citizens?select=linked_wallet&wallet=eq.${citizen}&limit=1`);
    const linkedWallet = citizens[0]?.linked_wallet;
    if (!linkedWallet) throw new ApiError(409, 'Link and connect an EVM wallet before requesting a transaction.');
    return NextResponse.json(await prepareModuleTransaction(input, linkedWallet), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
