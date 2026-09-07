'use client';
/* oxlint-disable react/react-compiler, next/no-img-element -- explicit admin form hydration; banner URLs are admin-curated and intentionally accept arbitrary HTTPS hosts */

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import type { ProjectBanner } from '@/lib/project-banner';

type BannerForm = { name: string; twitterUrl: string; websiteUrl: string; description: string; imageUrl: string; active: boolean; displayOrder: number };
const emptyForm: BannerForm = { name: '', twitterUrl: 'https://x.com/', websiteUrl: 'https://', description: '', imageUrl: 'https://', active: true, displayOrder: 0 };
function bannerForm(banner: ProjectBanner): BannerForm { return { name: banner.name, twitterUrl: banner.twitterUrl, websiteUrl: banner.websiteUrl, description: banner.description, imageUrl: banner.imageUrl, active: banner.active, displayOrder: banner.displayOrder }; }

export function ProjectBannerAdmin() {
  const [banners, setBanners] = useState<ProjectBanner[]>([]);
  const [editing, setEditing] = useState('');
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/admin/project-banners', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Cannot load project banners.');
    setBanners(data.banners);
  }, []);
  useEffect(() => { void load().catch((error) => setNotice((error as Error).message)); }, [load]);
  function reset() { setEditing(''); setForm(emptyForm); }
  async function save(value: BannerForm, id = editing) {
    const response = await fetch(id ? `/api/admin/project-banners/${encodeURIComponent(id)}` : '/api/admin/project-banners', {
      method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Banner update failed.');
    return data.banner as ProjectBanner;
  }
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setNotice('');
    try { await save(form); await load(); setNotice(editing ? 'BANNER UPDATED.' : 'BANNER ADDED TO THE WALL.'); reset(); }
    catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }
  async function toggle(banner: ProjectBanner) {
    if (busy) return; setBusy(true); setNotice('');
    try { await save({ ...bannerForm(banner), active: !banner.active }, banner.id); await load(); setNotice(banner.active ? 'BANNER HIDDEN.' : 'BANNER IS LIVE.'); }
    catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="lv-panel banner-admin">
    <header className="lv-panel-head"><h2>ONE SCRAPY PAGE</h2><span>{banners.filter((item) => item.active).length} LIVE / {banners.length} TOTAL</span></header>
    <div className="banner-admin-layout">
      <form className="proposal-form banner-admin-form" onSubmit={submit}>
        <h3>{editing ? 'EDIT PROJECT BANNER' : 'ADD PROJECT BANNER'}</h3>
        <p>Recommended artwork: 1200×400 (3:1). Any size works; the public wall crops it to fit.</p>
        <label>PROJECT NAME<input required minLength={2} maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>X / TWITTER URL<input required type="url" maxLength={2048} value={form.twitterUrl} onChange={(event) => setForm({ ...form, twitterUrl: event.target.value })} /></label>
        <label>PROJECT WEBSITE<input required type="url" maxLength={2048} value={form.websiteUrl} onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })} /></label>
        <label>BANNER IMAGE URL<input required type="url" maxLength={2048} value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} /></label>
        <label>SHORT DESCRIPTION<textarea required minLength={10} maxLength={280} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label>DISPLAY ORDER<input required type="number" min={0} max={9999} value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })} /></label>
        <label className="banner-active"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> PUBLISH ON THE WALL</label>
        {form.imageUrl.startsWith('https://') && <img className="banner-admin-preview" src={form.imageUrl} alt="Banner preview" referrerPolicy="no-referrer" />}
        <div className="build-actions"><button className="lv-button primary" disabled={busy}>{busy ? 'SAVING…' : editing ? 'SAVE BANNER' : 'ADD BANNER'}</button>{editing && <button type="button" className="lv-button" disabled={busy} onClick={() => { reset(); setNotice(''); }}>CANCEL EDIT</button>}</div>
      </form>
      <div className="banner-admin-list">{banners.map((banner) => <article key={banner.id} className={banner.active ? '' : 'hidden-banner'}>
        <img src={banner.imageUrl} alt="" referrerPolicy="no-referrer" />
        <div><small>ORDER {banner.displayOrder} · {banner.active ? 'LIVE' : 'HIDDEN'}</small><strong>{banner.name}</strong><span>{banner.description}</span></div>
        <div className="build-actions"><button disabled={busy} onClick={() => { setEditing(banner.id); setForm(bannerForm(banner)); setNotice(''); }}>EDIT</button><button disabled={busy} onClick={() => void toggle(banner)}>{banner.active ? 'HIDE' : 'SHOW'}</button></div>
      </article>)}{!banners.length && <p className="empty-state">No project banners yet.</p>}</div>
    </div>
    {notice && <output className="admin-warning" aria-live="polite">{notice}</output>}
  </section>;
}
