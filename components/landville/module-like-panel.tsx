'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useLandville } from '@/components/landville/provider';
import { useWallet } from '@/components/landville/wallet-provider';

export function ModuleLikePanel({ id }: { id: string }) {
  const town = useLandville();
  const wallet = useWallet();
  const cityModule = town.objects.find((object) => object.id === id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!cityModule) return null;

  const ownModule = Boolean(cityModule.creatorWallet && cityModule.creatorWallet.toLowerCase() === wallet.address.toLowerCase());
  const disabled = !wallet.address || ownModule || cityModule.likedByViewer || town.likeBudget.remaining < 1 || busy;

  async function like() {
    if (disabled) return;
    setBusy(true);
    setError('');
    try { await town.likeModule(id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'The like could not be recorded.'); }
    finally { setBusy(false); }
  }

  return <section className="module-like-panel" aria-label="Like this module">
    <div>
      <Heart className={cityModule.likedByViewer ? 'liked' : ''} />
      <span><b>{cityModule.likes} LIKES</b><small>{wallet.address ? `${town.likeBudget.remaining} / ${town.likeBudget.allowance} LEFT THIS UTC WEEK` : 'SIGN IN TO USE YOUR WEEKLY LIKES'}</small></span>
    </div>
    <button className="lv-button primary" disabled={disabled} onClick={() => void like()}>
      <Heart /> {busy ? 'STAMPING...' : ownModule ? 'YOUR OWN MODULE' : cityModule.likedByViewer ? 'LIKED' : town.likeBudget.remaining < 1 ? 'NO LIKES LEFT' : 'LIKE THIS MODULE'}
    </button>
    {error && <p>{error}</p>}
  </section>;
}
