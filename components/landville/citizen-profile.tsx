'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { citizenLabel } from '@/lib/citizen-identity';
import { ProfileEditor } from '@/components/landville/profile-editor';
import { CitizenAvatar } from '@/components/landville/citizen-avatar';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Fingerprint, Hammer, LogOut, MessageCircle, ShieldCheck, Vote, Wallet, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { useWallet } from '@/components/landville/wallet-provider';
import { shortWallet } from '@/lib/governance';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import type { CitizenRecord } from '@/lib/landville-data';
import styles from './citizen-profile.module.css';
import { SCRAPY_TOKEN, scrapyAccess, scrapyTokenExplorerUrl } from '@/lib/scrapy-token';
import { EmailOtpForm } from '@/components/landville/email-otp-form';

export function CitizenProfile({ identity }: { identity?: string }) {
  const { voted } = useLandville();
  const wallet = useWallet();
  const router = useRouter();
  useEffect(() => { if (!identity && wallet.address) router.replace(`/citizens/${wallet.address}`); }, [identity, wallet.address, router]);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');
  const [citizen, setCitizen] = useState<CitizenRecord | null>(null);
  const [recordError, setRecordError] = useState('');
  const requestedWallet = (identity || wallet.address).toLowerCase();
  const isOwnWallet = Boolean(requestedWallet && wallet.address === requestedWallet);
  const authored = citizen?.proposals || [];
  const built = citizen?.objects || [];
  const ownReceipts = isOwnWallet ? Object.entries(voted).filter(([, receipt]) => receipt.wallet.toLowerCase() === requestedWallet) : [];
  const tokenAccess = wallet.snapshot ? scrapyAccess(wallet.snapshot.tokenBalance, wallet.snapshot.tokenDecimals) : null;

  useEffect(() => {
    let active = true;
    // oxlint-disable-next-line react/react-compiler -- replace records when viewing a different wallet
    setCitizen(null);
    setRecordError('');
    if (!requestedWallet) return;
    fetch(`/api/citizens/${requestedWallet}`, { cache: 'no-store' }).then(async (response) => {
      const result = await response.json() as { citizen?: CitizenRecord; error?: string };
      if (!response.ok || !result.citizen) throw new Error(result.error || 'Citizen record unavailable.');
      if (active) setCitizen(result.citizen);
    }).catch((error: Error) => { if (active) setRecordError(error.message); });
    return () => { active = false; };
  }, [requestedWallet]);

  async function checkHoldings() {
    setChecking(true);
    setNotice('');
    try { await wallet.refreshVotingPower(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Holdings unavailable.'); }
    finally { setChecking(false); }
  }

  return <ProductShell title={isOwnWallet ? 'MY CABINET' : requestedWallet ? 'CITIZEN FILE' : 'BECOME A CITIZEN'} eyebrow="YOUR ACCOUNT / YOUR IDEAS / YOUR TOWN">
    <div className={styles.page}>
      <section className={styles.intro}>
        {requestedWallet ? <div>{recordError ? <p role="alert">{recordError}</p> : citizen ? isOwnWallet ? <ProfileEditor key={requestedWallet} citizen={citizen} onSaved={(profile) => setCitizen((previous) => previous?.wallet === profile.wallet ? { ...previous, ...profile } : previous)} /> : <section className={styles.passport}><span className={styles.label}>PUBLIC CITIZEN FILE</span><h3>{citizenLabel(citizen)}</h3><p>{citizen.bio || 'This citizen has not added a bio yet.'}</p><p>Proposals, votes and builds belong to this citizen identity.</p></section> : <p>Loading citizen profile…</p>}</div> : <div className={styles.manifesto}>
          <span className={styles.label}><Fingerprint /> LANDVILLE CITIZENSHIP</span>
          <h2>{requestedWallet ? <>A WALLET.<br />A VOICE.<br /><em>A PLACE HERE.</em></> : <>THIS TOWN<br />WON’T BUILD<br /><em>ITSELF.</em></>}</h2>
          <p>You are not a spectator. You are a citizen: bring an idea, argue for it, vote on what belongs here.</p>
          <p className={styles.scrapyNote}>“Bring an email. Bring a wallet if you want power.” <span>— SCRAPY</span></p>
        </div>}
        <div className={styles.passport}>
          <span className={styles.label}><ShieldCheck /> {isOwnWallet ? 'CITIZEN VERIFIED' : requestedWallet ? 'PUBLIC CITIZEN' : 'YOUR CITIZEN FILE'}</span>
          <CitizenAvatar avatar={citizen?.avatar} className={styles.fingerprint} />
          {requestedWallet ? <>
            <h3>{citizen ? citizenLabel(citizen) : shortWallet(requestedWallet)}</h3>
            {citizen?.citizenNumber && <span className={styles.label}>PERMANENT CITIZEN #{citizen.citizenNumber}</span>}<p className={styles.address}>{citizen?.linkedWallet || (isOwnWallet ? 'NO WALLET LINKED' : 'EMAIL-BACKED CITIZEN')}</p>
            <p>{isOwnWallet ? 'Your email or verified wallet opens this same citizen account. Your history stays attached to the citizen.' : citizen ? 'Public citizen record. Private email and archived conversations are never shown here.' : 'Looking up this citizen in the registry.'}</p>
            {isOwnWallet && wallet.email && <p className={styles.caption}>PERMANENT EMAIL LOGIN · {wallet.email}</p>}
            {citizen && <p className={styles.caption}>CITIZEN SINCE {new Date(citizen.joinedAt).toLocaleDateString()}</p>}
            <div className={styles.actions}>
              {citizen?.linkedWallet && <a className="lv-button" href={`${activeRobinhoodChain.explorerUrl}/address/${citizen.linkedWallet}`} target="_blank" rel="noreferrer">VIEW WALLET <ArrowUpRight /></a>}
              {isOwnWallet && !wallet.linkedWallet && <Button className="lv-button primary" disabled={wallet.status === 'CONNECTING'} onClick={() => wallet.connectWallet().catch(() => undefined)}><Wallet /> {wallet.status === 'CONNECTING' ? 'CHECK YOUR WALLET…' : 'LINK WALLET'}</Button>}
              {isOwnWallet ? <Button className="lv-button" onClick={() => wallet.disconnectWallet().catch(() => setNotice('Could not sign out. Try again.'))}><LogOut /> SIGN OUT</Button> : <Link className="lv-button" href="/citizens">MY CITIZEN FILE <ArrowUpRight /></Link>}
            </div>
          </> : <>
            <h3>WHO ARE YOU IN LANDVILLE?</h3>
            <p>Start with a permanent email login, or continue with an EVM wallet. You can attach a wallet to an email account later.</p>
            <EmailOtpForm />
            <Button className="lv-button" disabled={wallet.status === 'CONNECTING'} onClick={() => wallet.connectWallet().catch(() => undefined)}><Wallet /> {wallet.status === 'CONNECTING' ? 'CHECK YOUR WALLET…' : 'CONTINUE WITH WALLET'}</Button>
            <p className={styles.caption}>Wallet sign-in uses a message signature. It never creates a transaction or spends funds.</p>
          </>}
          <span className={styles.network}>ROBINHOOD MAINNET · {activeRobinhoodChain.id}</span>
        </div>
      </section>

      {(notice || wallet.error) && <p className={styles.error} role="alert">{notice || wallet.error}</p>}

      {isOwnWallet && !wallet.email && <EmailOtpForm attach />}

      {!requestedWallet && <section className={styles.roles} aria-label="What citizens can do">
        <article><MessageCircle /><span className={styles.label}>01 / JOIN THE CONVERSATION</span><h3>A voice in the town.</h3><p>Everyone shares Town Chat history. Your account gets 10 messages a day without SCRAPY, or 50 with a positive balance, in public Town Chat. Resets at 00:00 UTC.</p><Link href="/chat">OPEN TOWN CHAT <ArrowUpRight /></Link></article>
        <article><Vote /><span className={styles.label}>02 / DECIDE WHAT BELONGS</span><h3>One citizen. A starting vote.</h3><p>Every citizen gets one base vote. Link a wallet for one additional vote per full 250,000 SCRAPY.</p><Link href="/proposals">EXPLORE PROPOSALS <ArrowUpRight /></Link></article>
        <article><Hammer /><span className={styles.label}>03 / LEAVE SOMETHING BEHIND</span><h3>Give an idea a home.</h3><p>Any citizen may submit through a proposal-ready Scrapy plan in Town Chat. Keep up to two active proposals; a third unlocks after one is built or rejected.</p><Link href="/chat">DISCUSS IN TOWN CHAT <ArrowUpRight /></Link></article>
      </section>}

      {isOwnWallet && <section className={styles.holdings} aria-label="Mainnet voting power">
        <div><span className={styles.label}>{SCRAPY_TOKEN.ticker} / MAINNET HOLDINGS</span><h3>{wallet.linkedWallet ? wallet.snapshot ? `${wallet.snapshot.tokenBalanceFormatted} SCRAPY · ${wallet.snapshot.weight} votes` : 'Your balance hasn’t been checked yet.' : 'Link a wallet to add token power.'}</h3><p>{wallet.linkedWallet && wallet.snapshot ? `${tokenAccess?.dailyMessageLimit} messages per UTC day · proposal access is open to every citizen. Snapshot at block ${wallet.snapshot.blockNumber}.` : 'Your citizen account already has base access. A linked wallet adds SCRAPY voting power and holder chat access.'}</p><a className={styles.contract} href={scrapyTokenExplorerUrl(activeRobinhoodChain.explorerUrl)} target="_blank" rel="noreferrer">{SCRAPY_TOKEN.address} <ArrowUpRight /></a></div>
        <div className={styles.actions}>{wallet.linkedWallet ? <><Button className="lv-button" disabled={checking} onClick={checkHoldings}>{checking ? 'CHECKING…' : 'CHECK VOTING POWER'}</Button><Button className="lv-button" onClick={() => wallet.addScrapyToken().then(() => setNotice('$SCRAPY added to wallet.')).catch((error: Error) => setNotice(error.message))}><WalletCards /> ADD $SCRAPY TO WALLET</Button></> : <Button className="lv-button primary" onClick={() => wallet.connectWallet().catch(() => undefined)}><Wallet /> LINK WALLET</Button>}</div>
      </section>}

      {requestedWallet && <section className={styles.records}>
        <header><div><span className={styles.label}>CITIZEN ACTIVITY</span><h3>{isOwnWallet ? 'Your part of the town.' : 'Activity for this address.'}</h3></div><span className={styles.localTag}>SHARED CITIZEN REGISTRY</span></header>
        {recordError ? <p role="alert">{recordError}</p> : !citizen ? <p>Loading citizen record…</p> : authored.length || citizen.votesCast ? <>
          <dl className={styles.stats}><div><dt>PROPOSALS</dt><dd>{authored.length}</dd></div><div><dt>WORLD RECORDS</dt><dd>{built.length}</dd></div><div><dt>VOTES CAST</dt><dd>{citizen.votesCast}</dd></div></dl>
          <ul className={styles.activity}>
            {authored.map((proposal) => <li key={proposal.id}><Link href="/proposals">{proposal.title}</Link><span>{proposal.status}</span></li>)}
            {ownReceipts.map(([id, receipt]) => <li key={id}><Link href="/proposals">{id} · {receipt.choice} · {receipt.weight} votes</Link><span>BLOCK {receipt.blockNumber}</span></li>)}
          </ul>
        </> : <Empty className={styles.empty}><EmptyHeader><EmptyTitle>No recorded activity here yet.</EmptyTitle><EmptyDescription>A citizen file starts with what you actually do, not a made-up track record.</EmptyDescription></EmptyHeader><Link className="lv-button" href="/chat">START WITH AN IDEA <ArrowUpRight /></Link></Empty>}
      </section>}
    </div>
  </ProductShell>;
}
