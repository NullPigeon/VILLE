'use client';

import { useState } from 'react';
import { Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/components/landville/wallet-provider';
import styles from './citizen-profile.module.css';

export function EmailOtpForm({ attach = false }: { attach?: boolean }) {
  const account = useWallet();
  const [email, setEmail] = useState(account.email);
  const [token, setToken] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function send(event: { preventDefault(): void }) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setNotice('');
    try {
      await account.sendEmailCode(email);
      setSent(true); setNotice('CHECK YOUR EMAIL FOR THE 6-DIGIT CODE');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not send the code.'); }
    finally { setBusy(false); }
  }

  async function verify(event: { preventDefault(): void }) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setNotice('');
    try {
      await account.verifyEmailCode(email, token);
      setNotice(attach ? 'EMAIL LOGIN ATTACHED TO THIS CITIZEN' : 'WELCOME TO LANDVILLE');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not verify the code.'); }
    finally { setBusy(false); }
  }

  return <form className={styles.emailAuth} onSubmit={sent ? verify : send}>
    <span className={styles.label}>{sent ? <ShieldCheck /> : <Mail />} {attach ? 'ADD PERMANENT EMAIL LOGIN' : 'SIGN IN / CREATE BY EMAIL'}</span>
    <p>{attach ? 'The verified email becomes the permanent login for this citizen and cannot be replaced.' : 'Enter your email. We will send a one-time 6-digit code—no password.'}</p>
    <label htmlFor="citizen-email">EMAIL</label>
    <input id="citizen-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} disabled={busy || sent} required />
    {sent && <><label htmlFor="citizen-email-code">EMAIL CODE</label><input id="citizen-email-code" value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy} /></>}
    <div className={styles.actions}>
      <Button type="submit" className="lv-button primary" disabled={busy || (sent && token.length !== 6)}>{busy ? 'WORKING…' : sent ? 'VERIFY CODE' : 'SEND LOGIN CODE'}</Button>
      {sent && <Button type="button" className="lv-button" disabled={busy} onClick={() => { setSent(false); setToken(''); setNotice(''); }}>CHANGE EMAIL</Button>}
    </div>
    {notice && <output aria-live="polite">{notice}</output>}
  </form>;
}
