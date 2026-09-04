'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CITIZEN_AVATARS, citizenLabel, type CitizenIdentity } from '@/lib/citizen-identity';
import { readJsonResponse } from '@/lib/http-response';
import { useWallet } from '@/components/landville/wallet-provider';
import { CitizenAvatar } from '@/components/landville/citizen-avatar';
import styles from './citizen-profile.module.css';

export function ProfileEditor({ citizen, onSaved }: { citizen: CitizenIdentity; onSaved(profile: CitizenIdentity): void }) {
  const wallet = useWallet();
  const [username, setUsername] = useState(citizen.username || '');
  const [bio, setBio] = useState(citizen.bio);
  const [avatar, setAvatar] = useState(citizen.avatar);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function save(event: { preventDefault(): void }) {
    event.preventDefault();
    if (busy || wallet.address !== citizen.wallet) return;
    setBusy(true); setNotice('');
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, bio, avatar }) });
      const data = await readJsonResponse<{ profile: CitizenIdentity }>(response, 'Save profile');
      onSaved(data.profile); setUsername(data.profile.username || ''); setBio(data.profile.bio);
      setNotice('Profile saved. Your citizen number and history stay with you.');
      await wallet.refreshProfile().catch(() => undefined);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save profile.'); }
    finally { setBusy(false); }
  }
  return <form className={styles.editor} onSubmit={save}>
    <span className={styles.label}>YOUR CABINET / EDIT PROFILE</span>
    <h3>Your name. Your place here.</h3>
    <p>Permanent identity: {citizen.citizenNumber ? `Citizen #${citizen.citizenNumber}` : 'number pending — migration 006 required'}. Scrapy is #1.</p>
    <label htmlFor="citizen-username">USERNAME</label><input id="citizen-username" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={24} disabled={busy} autoComplete="off" spellCheck={false} aria-describedby="username-help" />
    <p id="username-help">3–24 letters, numbers or underscores; start with a letter. Names are lowercase and unique. Leave blank to use {citizenLabel({ citizenNumber: citizen.citizenNumber, username: null })}.</p>
    <label htmlFor="citizen-bio">ABOUT YOU</label><textarea id="citizen-bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} rows={3} disabled={busy} />
    <fieldset disabled={busy}><legend>AVATAR</legend><div className={styles.avatars}>{CITIZEN_AVATARS.map((value) => <label key={value}><input type="radio" name="citizen-avatar" value={value} checked={avatar === value} onChange={() => setAvatar(value)} /><CitizenAvatar avatar={value} /><span>{value}</span></label>)}</div></fieldset>
    <p>Your username, avatar and bio are public. Never include private information or wallet secrets.</p>
    <Button type="submit" className="lv-button primary" disabled={busy || !citizen.citizenNumber}>{busy ? 'SAVING…' : 'SAVE PROFILE'}</Button>
    {notice && <output aria-live="polite">{notice}</output>}
  </form>;
}
