'use client';

import { useEffect, useState } from 'react';
import { BatteryCharging, Hammer, Sun } from 'lucide-react';
import { readJsonResponse } from '@/lib/http-response';
import { YARD_ACTIONS, yardMaterialGain, type YardEconomy } from '@/lib/yard-economy';
import type { CityProfession, YardFeature } from '@/lib/personal-agent';
import './yard-shift-desk.css';

export function YardShiftDesk({ profession, feature, onLevelChange }: {
  profession: CityProfession; feature: YardFeature; onLevelChange: (level: number) => void;
}) {
  const [economy, setEconomy] = useState<YardEconomy | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recommended = YARD_ACTIONS.find((action) => action.roles.some((role) => role === profession)) || YARD_ACTIONS[0];
  useEffect(() => {
    let active = true;
    fetch('/api/yards/economy', { cache: 'no-store' })
      .then((response) => readJsonResponse<{ economy: YardEconomy }>(response, 'Load yard resources'))
      .then(({ economy: result }) => { if (active) { setEconomy(result); onLevelChange(result.houseLevel); } })
      .catch((caught: Error) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, [onLevelChange]);

  async function act(action: string) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/yards/economy', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, requestId: crypto.randomUUID() }) });
      const result = await readJsonResponse<{ economy: YardEconomy }>(response, 'Work in yard');
      setEconomy(result.economy); onLevelChange(result.economy.houseLevel);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save this shift.'); }
    finally { setBusy(false); }
  }

  function shiftButton(action: typeof YARD_ACTIONS[number]) {
    const gain = yardMaterialGain(action.id, profession);
    return <button key={action.id} type="button" disabled={busy || !economy || economy.energy < 2 || economy.dailyShifts >= 4} onClick={() => void act(action.id)}><strong>{action.name}</strong><span>{action.detail}</span><small>2 energy → {gain} {gain === 1 ? 'material' : 'materials'}</small></button>;
  }

  return <section className="yard-shifts" aria-label="Agent yard resources">
    <header><div><small>YOUR AGENT / CITY SHIFTS</small><h2>Make your place grow.</h2></div><span>OFFCHAIN GAME RESOURCES</span></header>
    <p>Give your agent a small city shift. Each uses 2 energy and earns 1 material, or 2 when it matches their profession. Use materials to upgrade the look of your home. These shifts do not post a World job, spend USDG or pay SCRAPY.</p>
    {error && <p className="yard-shifts-error" role="alert">{error}</p>}
    {!economy ? <p>Loading yard resources…</p> : <>
      <div className="yard-shifts-stats"><div><BatteryCharging /><strong>{economy.energy}/{economy.capacity}</strong><span>Energy · {feature === 'SOLAR_RIG' ? '+1 every hour' : '+1 every 2 hours'}</span></div><div><Hammer /><strong>{economy.materials}</strong><span>Materials earned in yard shifts</span></div><div><Sun /><strong>{economy.houseLevel}/3</strong><span>Home upgrades</span></div></div>
      {economy.nextEnergyAt && <p className="yard-shifts-small">Next energy: {new Date(economy.nextEnergyAt).toLocaleString()} · {economy.dailyShifts}/4 shifts used today (UTC)</p>}
      <h3>Your role’s shift</h3><div className="yard-shifts-actions">{shiftButton(recommended)}</div>
      <details><summary>See other city shifts</summary><div className="yard-shifts-actions">{YARD_ACTIONS.filter((action) => action.id !== recommended.id).map(shiftButton)}</div></details>
      <div className="yard-shifts-upgrade"><span><strong>Upgrade your home</strong><small>{economy.upgradeCost === null ? 'Your house is fully upgraded.' : `Level ${economy.houseLevel + 1} costs ${economy.upgradeCost} materials.`}</small></span><button type="button" disabled={busy || economy.upgradeCost === null || economy.materials < economy.upgradeCost} onClick={() => void act('UPGRADE')}>{busy ? 'SAVING…' : 'UPGRADE HOUSE'}</button></div>
      <details><summary>Recent yard shifts</summary><ul>{economy.shifts.map((shift) => <li key={shift.request_id}>{shift.action.replace('_', ' ')} · {shift.materials_delta > 0 ? '+' : ''}{shift.materials_delta} materials · {new Date(shift.created_at).toLocaleDateString()}</li>)}</ul></details>
    </>}
  </section>;
}
