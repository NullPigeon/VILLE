import Image from 'next/image';
import { useId, useState } from 'react';
import type { WorldObjectRecord } from '@/lib/landville-data';
import { buildingDesignFromBrief, buildingFinishFromBrief } from '@/lib/building-design';

// Scrapy chooses a reviewed silhouette in its plan; older builds map to stable designs.
export function WorldBuildingArt({ kind, seed = '', title = '', description = '', approved = false }: {
  kind: WorldObjectRecord['kind']; seed?: string; title?: string; description?: string; approved?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const [imageFailed, setImageFailed] = useState(false);
  const design = buildingDesignFromBrief(description, title, kind);
  const finish = buildingFinishFromBrief(description);
  const rust = { RUST: '#a36b3b', BRASS: '#bc9858', OLIVE: '#617147' }[finish.material];
  const brass = { RUST: '#e6c582', BRASS: '#f1d896', OLIVE: '#c8ca8a' }[finish.material];
  const olive = { RUST: '#4e6042', BRASS: '#716e4b', OLIVE: '#476b53' }[finish.material];
  const neon = { LIME: '#d7fb63', AMBER: '#ffc66c', CYAN: '#8de9db' }[finish.accent];
  const ink = '#121b15';
  const shade = '#273529';
  let hash = 0;
  for (const char of seed) hash += char.charCodeAt(0);
  const variation = hash % 3;
  if (approved && !imageFailed && /^LV-[0-9]+$/.test(seed)) return <Image unoptimized width={254} height={264} className="world-building-art generated-building-art" src={`/api/world/buildings/${seed}/image`} alt="" draggable={false} onError={() => setImageFailed(true)} />;
  return <svg className={`world-building-art design-${design.toLowerCase()}`} viewBox="0 0 260 270" aria-hidden="true" fill="none" stroke={ink} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
    <defs>
      <pattern id={`${id}-hatch`} width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)"><path d="M0 1h11M0 6h6" stroke={ink} strokeWidth="1.3" opacity=".48" /></pattern>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2=".9" y2="1"><stop stopColor="#768268" /><stop offset=".48" stopColor={olive} /><stop offset="1" stopColor={shade} /></linearGradient>
    </defs>
    <path d="M17 241 209 253l37-20-192-19Z" fill="#111710" opacity=".43" stroke="none" />
    <path d="M27 224 221 222l15 16-204 10Z" fill="#856943" /><path d="M38 237h188" stroke={brass} strokeWidth="2" />
    {design === 'GALLERY' && <>
      <path d="M49 224V77l126-22 31 20v149Z" fill={`url(#${id}-metal)`} strokeWidth="7" /><path d="m49 77 127-22 30 20-125 22Z" fill={rust} strokeWidth="7" />
      <path d="M75 105 174 88v102L75 202Z" fill="#15241c" strokeWidth="8" /><path d="m87 170 30-58 27 40 17-28v56Z" fill="#b49170" strokeWidth="3" /><circle cx="148" cy="112" r="8" fill={neon} />
      <path d="m52 78 4-44 96-18 19 39" fill={olive} strokeWidth="7" /><path d="m68 41 70-15m-65 27 57-12" stroke={brass} strokeWidth="3" />
      <path d="M193 87v122m13-127v126M61 100v116" stroke={ink} strokeWidth="7" /><path d="M73 202h107m-97 9 90-3" stroke={neon} strokeWidth="3" />
      <path d="M48 80v145h158V77Z" fill={`url(#${id}-hatch)`} stroke="none" opacity=".38" />
    </>}
    {design === 'SALOON' && <>
      <path d="M22 225V105l35-45h145l35 43v122Z" fill={`url(#${id}-metal)`} strokeWidth="7" /><path d="m16 109 36-57h156l38 56-20 8-31-40H62l-29 42Z" fill={rust} strokeWidth="8" />
      <path d="M50 123h160v66H50Z" fill="#294035" strokeWidth="6" /><path d="M46 190h168v15H46Z" fill={brass} strokeWidth="5" />
      <path d="M71 205v20m118-20v20M61 111v79m143-78v78" stroke={ink} strokeWidth="8" /><path d="M94 223v-62h69v62" fill="#202a22" strokeWidth="6" /><path d="M124 166v56" stroke={brass} strokeWidth="3" />
      <path d="M30 113 52 95l24 16 23-16 28 16 26-17 27 16 24-15 31 18" stroke={neon} strokeWidth="5" /><path d="M62 56h138M73 69h115" stroke="#201d17" strokeWidth="3" />
      <path d="M23 115v108h212V106Z" fill={`url(#${id}-hatch)`} stroke="none" opacity=".4" />
    </>}
    {design === 'RELAY' && <>
      <path d="M49 224V107l24-22 94-10 37 26v123Z" fill={`url(#${id}-metal)`} strokeWidth="7" /><path d="m49 107 24-22 94-10 37 26-121 19Z" fill={rust} strokeWidth="7" />
      <path d="M76 121h99v76H76Z" fill="#14221a" strokeWidth="7" /><path d="m88 138 60-7m-60 19 49-5m-49 18 69-9" stroke={neon} strokeWidth="4" />
      <path d="M185 80V20m-17 21h34m-26 16h20" strokeWidth="6" /><circle cx="185" cy="18" r="9" fill={neon} />
      <path d="M97 82V44h48v36m-42-25h36m-32 11h28" fill={olive} strokeWidth="5" /><path d="M68 224v-22h116v22M58 108v109m141-109v109" stroke={ink} strokeWidth="7" />
      <path d="M50 109v115h154V103Z" fill={`url(#${id}-hatch)`} stroke="none" opacity=".42" />
    </>}
    {design === 'WORKSHOP' && <>
      <path d="M27 225V111l34-29 135-8 35 31v120Z" fill={`url(#${id}-metal)`} strokeWidth="7" /><path d="m18 113 39-42 145-10 40 42-19 13-29-24-130 6-26 31Z" fill={rust} strokeWidth="8" />
      <path d="M67 135h121v90H67Z" fill="#1b2820" strokeWidth="7" /><path d="M67 156h121m-121 22h121m-121 22h121" stroke={brass} strokeWidth="4" />
      <path d="M184 60V7h24v75" fill={shade} strokeWidth="6" /><path d="M197 8v-21m-9-4 19 1" stroke={ink} strokeWidth="5" />
      <path d="M35 128h25v60H35m159-52h28v74h-28" fill={olive} strokeWidth="6" /><path d="m35 130 22-2m-22 21 22-2m-22 21 22-2m140-27 20-3m-19 22 20-4" stroke={neon} strokeWidth="3" />
      <path d="M27 113v112h204V106Z" fill={`url(#${id}-hatch)`} stroke="none" opacity=".37" />
    </>}
    {design === 'BAZAAR' && <>
      <path d="M30 224V119l32-22h131l35 22v105Z" fill={`url(#${id}-metal)`} strokeWidth="7" /><path d="M17 127 63 69l127-8 54 62-22 13-39-42H70l-31 46Z" fill={rust} strokeWidth="8" />
      <path d="M35 130h188v42H35Z" fill={brass} strokeWidth="6" /><path d="m47 132 12 38 13-38 13 38 13-38 13 38 13-38 13 38 13-38 13 38 13-38 13 38 13-38" stroke={olive} strokeWidth="6" />
      <path d="M64 185h130v39H64Z" fill="#203225" strokeWidth="6" /><path d="M79 190v34m36-34v34m37-34v34m26-34v34" stroke={neon} strokeWidth="3" />
      <path d="M30 125v99h198V120Z" fill={`url(#${id}-hatch)`} stroke="none" opacity=".32" />
    </>}
    {variation === 0 && <path d="M214 96v-31m-9 10h18" stroke={neon} strokeWidth="3" />}
    {variation === 1 && <path d="m45 213 15-8m148 7 12-7" stroke={neon} strokeWidth="3" />}
    {variation === 2 && <path d="M30 215h19m164-1h15" stroke={neon} strokeWidth="3" />}
    <path d="m39 230 29 3m100-1 37-1m-145-120 12-4m109-7 9 3" stroke={brass} strokeWidth="2" />
  </svg>;
}
