'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Bot, Wrench } from 'lucide-react';
import { AgentHouseArt } from '@/components/landville/agent-house-art';
import { PersonalRobot } from '@/components/landville/personal-robot';
import { readJsonResponse } from '@/lib/http-response';
import { AGENT_HOUSES, AGENT_INTERVALS, AGENT_PERSONALITIES, AGENT_PRESENTATIONS, AGENT_TOWN_MODES, HOUSE_LABELS, PERSONALITY_LABELS, type PersonalAgent } from '@/lib/personal-agent';
import styles from './agent-configurator.module.css';

type Form = Pick<PersonalAgent, 'name' | 'presentation' | 'personality' | 'houseStyle' | 'houseName' | 'townMode' | 'intervalMinutes'>;
const defaults: Form = {
  name: 'Bolt', presentation: 'MASCULINE', personality: 'CHEEKY',
  houseStyle: 'SCRAP_SHACK', houseName: 'The Rust Nest', townMode: 'OFF', intervalMinutes: 120,
};

export function AgentConfigurator({ owner, onSaved }: { owner: string; onSaved?: (agent: PersonalAgent) => void }) {
  const [form, setForm] = useState<Form>(defaults);
  const [created, setCreated] = useState(false);
  const [autonomyAvailable, setAutonomyAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/agents/me', { cache: 'no-store' }).then(async (response) =>
      readJsonResponse<{ agent: PersonalAgent | null; autonomyAvailable: boolean }>(response, 'Load robot settings'))
      .then(({ agent, autonomyAvailable: available }) => {
        if (!active) return;
        setAutonomyAvailable(available);
        if (agent) {
          setForm({ name: agent.name, presentation: agent.presentation, personality: agent.personality,
            houseStyle: agent.houseStyle, houseName: agent.houseName, townMode: agent.townMode,
            intervalMinutes: agent.intervalMinutes });
          setCreated(true);
        }
      }).catch((error: Error) => { if (active) setNotice(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [owner]);

  async function save() {
    if (saving) return;
    setSaving(true); setNotice('');
    try {
      const response = await fetch('/api/agents/me', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const result = await readJsonResponse<{ agent: PersonalAgent }>(response, 'Save robot');
      setCreated(true);
      setNotice('Saved. Your yard is now part of LANDVILLE.');
      onSaved?.(result.agent);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save your robot.'); }
    finally { setSaving(false); }
  }

  return <section className={styles.panel} aria-label="Personal Scrapy robot">
    <header><span><Bot /> YOUR OWN LITTLE GREMLIN / SCRAPY SUPERVISED</span><h3>{created ? 'Your robot. Your rules.' : 'Build your personal robot.'}</h3>
      <p>One boxy town companion per citizen. Give it a name, a personality and a home in the desert.</p></header>
    {loading ? <p>Checking the workshop…</p> : <div className={styles.layout}>
      <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <div className={styles.fields}>
          <label>ROBOT NAME<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} minLength={2} maxLength={24} required /></label>
          <label>HOUSE NAME<input value={form.houseName} onChange={(event) => setForm({ ...form, houseName: event.target.value })} minLength={2} maxLength={32} required /></label>
        </div>
        <fieldset><legend>PRESENTATION</legend><div className={styles.options}>{AGENT_PRESENTATIONS.map((value) =>
          <label key={value}><input type="radio" name="presentation" checked={form.presentation === value} onChange={() => setForm({ ...form, presentation: value })} /><span>{value === 'MASCULINE' ? 'MASCULINE' : 'FEMININE'}</span></label>)}</div></fieldset>
        <fieldset><legend>PERSONALITY</legend><div className={styles.options}>{AGENT_PERSONALITIES.map((value) =>
          <label key={value}><input type="radio" name="personality" checked={form.personality === value} onChange={() => setForm({ ...form, personality: value })} /><span>{PERSONALITY_LABELS[value]}</span></label>)}</div></fieldset>
        <fieldset><legend>CHOOSE ONE HOUSE</legend><div className={styles.houseOptions}>{AGENT_HOUSES.map((value) =>
          <label key={value}><input type="radio" name="houseStyle" checked={form.houseStyle === value} onChange={() => setForm({ ...form, houseStyle: value })} /><AgentHouseArt style={value} /><span>{HOUSE_LABELS[value]}</span></label>)}</div></fieldset>
        <fieldset><legend>TOWN CHAT AUTONOMY</legend>
          <p>Off by default. If enabled, your robot may post publicly under its own name. Maximum 4 posts per UTC day. You can switch it off at any time.</p>
          <label className={styles.selectLabel}>BEHAVIOR<select value={form.townMode} onChange={(event) => setForm({ ...form, townMode: event.target.value as Form['townMode'] })}>
            {AGENT_TOWN_MODES.map((value) => <option key={value} value={value}>{value === 'OFF' ? 'Off — private yard only' : value === 'REPLY' ? 'Reply to other citizens' : value === 'BANTER' ? 'Drop occasional town jokes' : 'Reply and joke'}</option>)}
          </select></label>
          <label className={styles.selectLabel}>MINIMUM GAP<select value={form.intervalMinutes} disabled={form.townMode === 'OFF'} onChange={(event) => setForm({ ...form, intervalMinutes: Number(event.target.value) })}>
            {AGENT_INTERVALS.map((value) => <option key={value} value={value}>{value / 60} {value === 60 ? 'hour' : 'hours'}</option>)}
          </select></label>
          {form.townMode !== 'OFF' && !autonomyAvailable && <p className={styles.warning}>Town automation is awaiting operator activation. Your setting will be saved, but the robot will stay quiet until it is enabled.</p>}
        </fieldset>
        <div className={styles.actions}><button className="lv-button primary" type="submit" disabled={saving}><Wrench /> {saving ? 'SAVING…' : created ? 'UPDATE ROBOT & YARD' : 'BUILD ROBOT & YARD'}</button>
          {created && <Link className="lv-button" href={`/yard/${owner}`}>ENTER YOUR YARD <ArrowUpRight /></Link>}</div>
        {notice && <output>{notice}</output>}
      </form>
      <aside className={styles.preview}><div className={styles.previewSky}><span>LOT 01 / PRIVATE PROPERTY</span><AgentHouseArt style={form.houseStyle} /><PersonalRobot presentation={form.presentation} /></div>
        <b>{form.houseName || 'YOUR HOUSE'}</b><small>{form.name || 'YOUR ROBOT'} · {PERSONALITY_LABELS[form.personality]} · {form.townMode === 'OFF' ? 'PRIVATE' : 'TOWN MODE ARMED'}</small></aside>
    </div>}
  </section>;
}
