'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Fingerprint, Hammer, LogOut, MessageCircle, ShieldCheck, Vote, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { useWallet } from '@/components/landville/wallet-provider';
import { shortWallet, walletUsername } from '@/lib/governance';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import styles from './citizen-profile.module.css';

export function CitizenProfile({ identity }: { identity?: string }) {
  const { objects, proposals, voted } = useLandville();
  const wallet = useWallet();
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');
  const requestedWallet = (identity || wallet.address).toLowerCase();
  const isOwnWallet = Boolean(requestedWallet && wallet.address === requestedWallet);
  // A shortened display name is not an identity: match the full signed wallet.
  const authored = proposals.filter((proposal) => proposal.eligibilitySnapshot?.wallet.toLowerCase() === requestedWallet);
  const authoredIds = new Set(authored.map((proposal) => proposal.id));
  const built = objects.filter((object) => authoredIds.has(object.id));
  const ownReceipts = isOwnWallet ? Object.entries(voted).filter(([, receipt]) => receipt.wallet.toLowerCase() === requestedWallet) : [];

  async function checkHoldings() {
    setChecking(true);
    setNotice('');
    try { await wallet.refreshVotingPower(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Holdings unavailable.'); }
    finally { setChecking(false); }
  }

  return <ProductShell title={requestedWallet ? 'CITIZEN FILE' : 'BECOME A CITIZEN'} eyebrow="YOUR WALLET / YOUR IDEAS / YOUR TOWN">
    <div className={styles.page}>
      <section className={styles.intro}>
        <div className={styles.manifesto}>
          <span className={styles.label}><Fingerprint /> LANDVILLE CITIZENSHIP</span>
          <h2>{requestedWallet ? <>A WALLET.<br />A VOICE.<br /><em>A PLACE HERE.</em></> : <>THIS TOWN<br />WON’T BUILD<br /><em>ITSELF.</em></>}</h2>
          <p>You are not a spectator. You are a citizen: bring an idea, argue for it, vote on what belongs here.</p>
          <p className={styles.scrapyNote}>“Bring a wallet. The personality is your problem.” <span>— SCRAPY</span></p>
        </div>
        <div className={styles.passport}>
          <span className={styles.label}><ShieldCheck /> {isOwnWallet ? 'WALLET SIGNED' : requestedWallet ? 'ADDRESS VIEW' : 'YOUR CITIZEN FILE'}</span>
          <Fingerprint className={styles.fingerprint} aria-hidden="true" />
          {requestedWallet ? <>
            <h3>{isOwnWallet ? `@${walletUsername(requestedWallet)}` : shortWallet(requestedWallet)}</h3>
            <p className={styles.address}>{requestedWallet}</p>
            <p>{isOwnWallet ? 'This wallet is your identity. No invented name, avatar or reputation.' : 'A wallet address is not proof of a registered citizen. Only activity available in this browser is shown below.'}</p>
            <div className={styles.actions}>
              <a className="lv-button" href={`${activeRobinhoodChain.explorerUrl}/address/${requestedWallet}`} target="_blank" rel="noreferrer">VIEW WALLET <ArrowUpRight /></a>
              {isOwnWallet ? <Button className="lv-button" onClick={() => wallet.disconnectWallet().catch(() => setNotice('Could not sign out. Try again.'))}><LogOut /> SIGN OUT</Button> : <Link className="lv-button" href="/citizens">MY CITIZEN FILE <ArrowUpRight /></Link>}
            </div>
          </> : <>
            <h3>WHO ARE YOU IN LANDVILLE?</h3>
            <p>Your wallet identifies you. Your proposals, votes and builds give your citizen file a history.</p>
            <Button className="lv-button primary" disabled={wallet.status === 'CONNECTING'} onClick={() => wallet.connectWallet().catch(() => undefined)}><Wallet /> {wallet.status === 'CONNECTING' ? 'CHECK YOUR WALLET…' : 'CONNECT WALLET'}</Button>
            <p className={styles.caption}>Use an EVM browser wallet. Sign a message to prove ownership. No payment, transaction or SCRAPY required to sign in.</p>
          </>}
          <span className={styles.network}>ROBINHOOD MAINNET · {activeRobinhoodChain.id}</span>
        </div>
      </section>

      {(notice || wallet.error) && <p className={styles.error} role="alert">{notice || wallet.error}</p>}

      <section className={styles.roles} aria-label="What citizens can do">
        <article><MessageCircle /><span className={styles.label}>01 / JOIN THE CONVERSATION</span><h3>A voice in the town.</h3><p>Talk with other citizens and Scrapy in public Town Chat. No tokens needed to speak.</p><Link href="/chat">OPEN TOWN CHAT <ArrowUpRight /></Link></article>
        <article><Vote /><span className={styles.label}>02 / DECIDE WHAT BELONGS</span><h3>One wallet. A starting vote.</h3><p>One base vote, plus one for every full 250,000 SCRAPY. Holdings are verified on mainnet when you vote.</p><Link href="/proposals">EXPLORE PROPOSALS <ArrowUpRight /></Link></article>
        <article><Hammer /><span className={styles.label}>03 / LEAVE SOMETHING BEHIND</span><h3>Give an idea a home.</h3><p>Refine it with Scrapy in the workshop. Build requests currently need 250,000 SCRAPY; complexity tiers are still to be defined.</p><Link href="/mayor">ENTER THE WORKSHOP <ArrowUpRight /></Link></article>
      </section>

      {isOwnWallet && <section className={styles.holdings} aria-label="Mainnet voting power">
        <div><span className={styles.label}>SCRAPY / MAINNET HOLDINGS</span><h3>{wallet.snapshot ? `${wallet.snapshot.tokenBalanceFormatted} SCRAPY · ${wallet.snapshot.weight} votes` : 'Your balance hasn’t been checked yet.'}</h3><p>{wallet.snapshot ? `Snapshot at block ${wallet.snapshot.blockNumber}. Checked again for every vote or build request.` : 'Sign-in is complete. Checking holdings is separate; a failed check never means a zero balance.'}</p></div>
        <Button className="lv-button" disabled={checking} onClick={checkHoldings}>{checking ? 'CHECKING…' : 'CHECK VOTING POWER'}</Button>
      </section>}

      {requestedWallet && <section className={styles.records}>
        <header><div><span className={styles.label}>CITIZEN ACTIVITY</span><h3>{isOwnWallet ? 'Your part of the town.' : 'Activity for this address.'}</h3></div><span className={styles.localTag}>THIS BROWSER ONLY</span></header>
        <p>Proposals, votes and world records are currently stored locally. This is not a shared citizen registry yet.</p>
        {authored.length || ownReceipts.length ? <>
          <dl className={styles.stats}><div><dt>PROPOSALS</dt><dd>{authored.length}</dd></div><div><dt>WORLD RECORDS</dt><dd>{built.length}</dd></div>{isOwnWallet && <div><dt>VOTES CAST</dt><dd>{ownReceipts.length}</dd></div>}</dl>
          <ul className={styles.activity}>
            {authored.map((proposal) => <li key={proposal.id}><Link href="/proposals">{proposal.title}</Link><span>{proposal.status}</span></li>)}
            {ownReceipts.map(([id, receipt]) => <li key={id}><Link href="/proposals">{id} · {receipt.choice} · {receipt.weight} votes</Link><span>BLOCK {receipt.blockNumber}</span></li>)}
          </ul>
        </> : <Empty className={styles.empty}><EmptyHeader><EmptyTitle>No recorded activity here yet.</EmptyTitle><EmptyDescription>A citizen file starts with what you actually do, not a made-up track record.</EmptyDescription></EmptyHeader><Link className="lv-button" href="/mayor">START WITH AN IDEA <ArrowUpRight /></Link></Empty>}
      </section>}
    </div>
  </ProductShell>;
}
