'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Pickaxe, RadioTower } from 'lucide-react';
import { useWallet } from '@/components/landville/wallet-provider';
import { liveFarmPoints, type CityPointsState } from '@/lib/city-points';
import { readJsonResponse } from '@/lib/http-response';
import './city-miner.css';

export function useCityPoints() {
  const wallet = useWallet();
  const [state, setState] = useState<CityPointsState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [clockOffset, setClockOffset] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/city-points', { cache: 'no-store' });
      const result = await readJsonResponse<CityPointsState>(response, 'Load City Points');
      setClockOffset(Date.parse(result.asOf) - Date.now());
      setState(result);
      setError('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'City Points are unavailable.'); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh, wallet.address]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => { void refresh(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const checkIn = useCallback(async () => {
    if (!wallet.address || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/city-points', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const result = await readJsonResponse<CityPointsState>(response, 'Check in');
      setClockOffset(Date.parse(result.asOf) - Date.now());
      setState(result);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Check-in failed.'); }
    finally { setBusy(false); }
  }, [busy, wallet.address]);

  const serverNow = now ? now + clockOffset : Date.parse(state?.asOf || '1970-01-01T00:00:00Z');
  const livePoints = state?.me ? state.me.points + liveFarmPoints(state.farm, serverNow)
    - liveFarmPoints(state.farm, Date.parse(state.asOf)) : 0;
  return { state, error, busy, now: serverNow, livePoints, checkIn, refresh, wallet };
}

export function CityMiner({ city, compact = false }: {
  city: ReturnType<typeof useCityPoints>;
  compact?: boolean;
}) {
  const { state, error, busy, now, livePoints, checkIn, wallet } = city;
  const active = Boolean(state?.farm && now < Date.parse(state.farm.endsAt));
  return <section className={`city-miner ${compact ? 'city-miner-compact' : ''}`} aria-label="Your City Points miner">
    <div className="city-miner-head"><span><Pickaxe size={16} /> YOUR YARD MINER</span><b className={active ? 'on' : ''}>{active ? '● RUNNING' : '○ STANDBY'}</b></div>
    <div className="city-miner-value"><strong>{state?.me ? livePoints.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 }) : '0.000000'}</strong><span>POINTS THIS SEASON</span></div>
    {active ? <p className="city-miner-detail"><RadioTower size={16} /> +{state?.farm?.ratePerDay} points per 24h · verified at block {state?.farm?.blockNumber} · active until 00:00 UTC</p>
      : <p className="city-miner-detail">Check in every UTC day to start your agent&apos;s miner. Accrual begins at check-in and stops at midnight.</p>}
    {state?.verificationUnavailable && <p className="city-miner-alert">Mainnet check failed. Your daily check-in counted; retry today to activate the miner.</p>}
    {error && <p className="city-miner-alert" role="alert">{error}</p>}
    <div className="city-miner-actions">
      {wallet.address ? <button type="button" onClick={() => void checkIn()} disabled={busy || active}>
        {busy ? 'VERIFYING MAINNET…' : active ? 'MINER ACTIVE TODAY' : state?.checkedInToday ? 'ACTIVATE MINER' : 'DAILY CHECK-IN +2'}
      </button> : <Link href="/citizens">SIGN IN TO CHECK IN <ArrowUpRight size={14} /></Link>}
      {wallet.address && !state?.hasAgent && <Link href={`/citizens/${wallet.address}`}>CREATE YOUR AGENT <ArrowUpRight size={14} /></Link>}
      {wallet.address && !wallet.linkedWallet && <Link href={`/citizens/${wallet.address}`}>LINK WALLET FOR MINER <ArrowUpRight size={14} /></Link>}
      {compact && <Link href="/useful-citizens">SEE USEFUL CITIZENS <ArrowUpRight size={14} /></Link>}
    </div>
    {!compact && <small className="city-miner-foot">A robot and at least 1 SCRAPY in a linked wallet are required for mining. A fresh chain balance sets today&apos;s rate.</small>}
  </section>;
}

export function YardCityMiner() {
  const city = useCityPoints();
  return <CityMiner city={city} compact />;
}
