import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, isAdmin, requireMutation } from '@/lib/server/api';
import { requireBuildAdmin } from '@/lib/server/builds';
import { database, databaseConfigured, enforceRate } from '@/lib/server/database';
import { mayorConfiguration, requestMayorReply } from '@/lib/server/mayor-ai';
import { walletSessionConfigured } from '@/lib/wallet-session';
import { isAddress } from 'viem';
import { MARKET_SERVICES } from '@/lib/market-services';
import { marketServiceConfigured } from '@/lib/server/market-catalog';

export const runtime = 'nodejs';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  try {
    await requireBuildAdmin(request);
    let storage = 'not configured';
    if (databaseConfigured()) {
      try {
        await Promise.all([
          database('landville_messages?select=id,ai_source,ask_scrapy&limit=0'),
          database('landville_citizens?select=wallet,citizen_number,username,bio,avatar&limit=0'),
          database('landville_proposals?select=id&limit=0'),
          database('landville_build_jobs?select=proposal_id&limit=0'),
          database('landville_project_banners?select=id&limit=0'),
          database('landville_module_private_state?select=module_id&limit=0'),
          database('landville_module_shared_records?select=id&limit=0'),
          database('landville_module_counters?select=module_id&limit=0'),
          database('landville_module_images?select=module_id&limit=0'),
          database('landville_world_citizens?select=citizen_wallet&limit=0'),
        ]);
        storage = 'reachable; citizen profiles, universal module storage and project banners available';
      } catch { storage = 'unavailable: check credentials and apply every Supabase migration'; }
    }
    const marketTables = await Promise.all([
      ['landville_market_orders', 'authorization_hash'],
      ['landville_market_stall_drafts', 'id'],
      ['landville_linked_agents', 'id'],
    ].map(async ([table, column]) => {
      if (!databaseConfigured()) return false;
      return database(`${table}?select=${column}&limit=0`).then(() => true).catch(() => false);
    }));
    return NextResponse.json({
      storage,
      sessionConfigured: walletSessionConfigured(),
      privyConfigured: Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() && process.env.PRIVY_APP_SECRET?.trim()),
      ai: { ...mayorConfiguration(), verified: false },
      moduleImages: {
        enabled: process.env.LANDVILLE_MODULE_IMAGE_ENABLED === 'true',
        model: process.env.LANDVILLE_MODULE_IMAGE_MODEL || 'gpt-image-2.5-flare',
        keyPresent: Boolean(process.env.OPENAI_API_KEY?.trim()),
      },
      walletTransactions: {
        enabled: process.env.LANDVILLE_WALLET_TRANSACTIONS_ENABLED === 'true',
        adapterConfigured: Boolean(/^0x[0-9a-fA-F]{40}$/.test(process.env.LANDVILLE_TRANSACTION_ROUTER_ADDRESS || '')),
        treasuryConfigured: Boolean(/^0x[0-9a-fA-F]{40}$/.test(process.env.SCRAPY_TREASURY_ADDRESS || '')),
        chainId: 4663,
        mode: 'reviewed adapters / 1% fee swap installed',
      },
      agentMarket: {
        paymentSwitchOn: process.env.LANDVILLE_X402_ENABLED === 'true',
        relayerKeyPresent: /^0x[0-9a-fA-F]{64}$/.test(process.env.LANDVILLE_X402_RELAYER_PRIVATE_KEY?.trim() || ''),
        payoutAddressPresent: isAddress(process.env.LANDVILLE_X402_PAYOUT_ADDRESS?.trim() || ''),
        modelPresent: Boolean(process.env.LANDVILLE_MARKET_MODEL?.trim()),
        orderStorage: marketTables[0], recipeStorage: marketTables[1], linkedAgentStorage: marketTables[2],
        configuredServiceIds: MARKET_SERVICES.filter(marketServiceConfigured).map((service) => service.id),
      },
      builderEnabled: process.env.LANDVILLE_BUILDER_ENABLED === 'true',
      builderConfigurationPresent: Boolean((process.env.LANDVILLE_WORKER_SECRET?.length || 0) >= 32 &&
        process.env.LANDVILLE_BUILD_ACTOR && isAdmin(process.env.LANDVILLE_BUILD_ACTOR) &&
        process.env.LANDVILLE_GITHUB_READ_TOKEN && process.env.LANDVILLE_VERCEL_READ_TOKEN && process.env.LANDVILLE_VERCEL_PROJECT_ID),
    }, { headers });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const wallet = await requireBuildAdmin(request);
    await enforceRate(wallet, 'ai-readiness', 1);
    const result = await requestMayorReply([{ id: 'readiness', kind: 'CITIZEN', wallet, author: 'Operator', body: 'Reply with one short sentence confirming you can answer. This is a connectivity test, not a town message.', createdAt: new Date().toISOString() }], wallet);
    return NextResponse.json({ ok: result.ok, message: result.ok ? 'Live AI response received. Nothing was posted to Town Chat.' : result.reason, checkedAt: new Date().toISOString() }, { headers });
  } catch (error) { return apiFailure(error); }
}
