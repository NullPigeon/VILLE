'use client';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import type { BuildingArtRow } from '@/lib/server/building-art';

export function BuildingArtReview({ id, title }: { id: string; title: string }) {
  const [art, setArt] = useState<BuildingArtRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [version, setVersion] = useState(0);
  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/building-art/${id}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load building art.');
    setArt(result.art);
  }, [id]);
  useEffect(() => {
    let active = true;
    void fetch(`/api/admin/building-art/${id}`, { cache: 'no-store' }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load building art.');
      return result.art as BuildingArtRow | null;
    }).then((result) => { if (active) setArt(result); }).catch((error) => { if (active) setNotice((error as Error).message); });
    return () => { active = false; };
  }, [id]);

  async function act(action: 'GENERATE' | 'APPROVE', regenerate = false) {
    setBusy(true); setNotice(action === 'GENERATE' ? 'Scrapy is drawing this building. This may take a few minutes…' : 'Approving design…');
    try {
      const response = await fetch(`/api/admin/building-art/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...(action === 'GENERATE' ? { regenerate } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Building design action failed.');
      setArt(result.art); setVersion((current) => current + 1);
      setNotice(action === 'APPROVE' ? 'Approved. This design will appear when the verified module is released.' : 'New design ready for visual review.');
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }

  return <section className="lv-panel building-art-review">
    <header className="lv-panel-head"><h2>SCRAPY BUILDING DESIGN · {id}</h2><span>{art?.state || 'NOT GENERATED'}</span></header>
    <p>Scrapy draws an original building for <strong>{title}</strong> from the approved proposal. Inspect its silhouette and LANDVILLE style before approval. The World shows only approved art. Each generation uses the configured OpenAI image API.</p>
    {art && ['DRAFT', 'APPROVED'].includes(art.state) && <div className="building-art-preview"><Image unoptimized width={400} height={400} src={`/api/admin/building-art/${id}/image?v=${version}`} alt={`Scrapy's proposed building design for ${title}`} /></div>}
    <div className="build-actions">
      {!art || art.state === 'FAILED' ? <button disabled={busy} onClick={() => void act('GENERATE')}>GENERATE UNIQUE DESIGN</button> : null}
      {art?.state === 'DRAFT' && <><button disabled={busy} onClick={() => void act('APPROVE')}>APPROVE FOR WORLD</button><button disabled={busy || art.attempts >= 3} onClick={() => void act('GENERATE', true)}>REDRAW ({3 - art.attempts} LEFT)</button></>}
      {art?.state === 'GENERATING' && <button disabled={busy} onClick={() => void load().catch((error) => setNotice((error as Error).message))}>CHECK PROGRESS</button>}
    </div>
    {notice && <output aria-live="polite" className="admin-warning">{notice}</output>}
  </section>;
}
