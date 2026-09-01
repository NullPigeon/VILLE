'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CircleDollarSign, ExternalLink, Network, ShieldCheck, WalletCards } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { addRobinhoodNetwork, robinhoodChain } from '@/lib/robinhood-chain';

export default function TreasuryPage() {
  const { proposals } = useLandville();
  const [networkMessage, setNetworkMessage] = useState('');
  const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '';
  const activeProposals = proposals.filter((proposal) => proposal.status === 'LIVE').length;
  async function addNetwork() {
    try { await addRobinhoodNetwork('testnet'); setNetworkMessage('ROBINHOOD TESTNET READY'); }
    catch (error) { setNetworkMessage((error as Error).message === 'NO_WALLET' ? 'NO EVM WALLET FOUND' : 'WALLET DECLINED THE NETWORK'); }
  }
  return <ProductShell title="TREASURY" eyebrow="PUBLIC FUNDS / READ-ONLY" actions={<button className="lv-button" onClick={addNetwork}><Network /> ADD TESTNET</button>}>
    <div className="admin-warning" style={{borderColor:'var(--acid)',color:'var(--acid)',background:'#17200d'}}><ShieldCheck /> MAYOR CAN READ THIS TREASURY. MAYOR CANNOT SIGN, SEND, SWAP OR ACCESS PRIVATE KEYS.</div>
    {networkMessage&&<div className="status-tag">{networkMessage}</div>}
    <section className="treasury-summary"><article className="metric-card"><small>TOTAL VALUE</small><strong>—</strong><span>{treasuryAddress ? 'AWAITING CHAIN INDEXER' : 'TREASURY NOT CONFIGURED'}</span></article><article className="metric-card"><small>ACTIVE PROPOSALS</small><strong>{activeProposals}</strong><span>LIVE GOVERNANCE RECORDS</span></article><article className="metric-card"><small>LAST ACTION</small><strong>—</strong><span>NO ONCHAIN ACTIONS LOADED</span></article></section>
    <div className="product-grid"><section className="lv-panel"><header className="lv-panel-head"><h2><WalletCards /> ASSETS</h2><span>{treasuryAddress || 'NO ADDRESS'}</span></header><div className="asset-list"><div className="empty-state"><WalletCards /> Treasury assets will appear after a public address and chain indexer are configured.</div></div><div style={{padding:16}}><Link className="lv-button" href="/proposals">VIEW TREASURY PROPOSALS <ArrowUpRight /></Link></div></section>
      <aside className="lv-panel"><header className="lv-panel-head"><h2><CircleDollarSign /> CHAIN ADAPTER</h2><span>READ-ONLY</span></header><div className="chain-card"><div className="chain-status"><i /><div><b>{robinhoodChain.testnet.name}</b><small>ADAPTER CONFIGURED</small></div></div><div className="chain-facts"><div><span>CHAIN ID</span><b>{robinhoodChain.testnet.id}</b></div><div><span>GAS TOKEN</span><b>ETH</b></div><div><span>FINALITY</span><b>STAGED L2 → L1</b></div><div><span>EXECUTION</span><b>DISABLED</b></div></div><p className="chain-note">Set the public RPC and treasury address in Vercel before production reads.</p><a className="lv-button" href={treasuryAddress ? `${robinhoodChain.testnet.explorerUrl}/address/${treasuryAddress}` : robinhoodChain.testnet.explorerUrl} target="_blank" rel="noreferrer">OPEN EXPLORER <ExternalLink /></a></div></aside>
    </div>
  </ProductShell>;
}
