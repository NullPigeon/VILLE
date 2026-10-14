import type { WorldFeatureKind } from '@/lib/world-change';

const INK = '#101b14';
const STEEL = '#536753';
const LIGHT = '#f3d793';
const NEON = '#d5f66e';

export function WorldFeatureArt({ kind }: { kind: WorldFeatureKind }) {
  return <svg className="world-feature-art" viewBox="0 0 180 210" aria-hidden="true">
    <g stroke={INK} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="90" cy="193" rx="71" ry="12" fill="#17261ac9" stroke="none" />
      {kind === 'SIGNAL_MAST' && <>
        <path d="M63 182h55l-9-20H72Z" fill="#997544" /><path d="M80 164 88 43h12l9 121Z" fill={STEEL} />
        <path d="M75 66h36M72 97h40M69 129h45M86 42l-24-14M101 42l22-16" fill="none" />
        <circle cx="94" cy="31" r="13" fill={NEON} /><path d="M53 51q-21-20 0-41M136 52q21-20 0-41" fill="none" stroke={NEON} strokeWidth="4" />
        <path d="m82 76 23 21-27 30 31 25M106 74 76 98l32 29-36 25" fill="none" stroke={LIGHT} strokeWidth="3" />
      </>}
      {kind === 'NEON_SIGN' && <>
        <path d="M43 183h96l-6-14H50Z" fill="#947045" /><path d="M53 169V49h13v120m48 0V49h13v120" fill={STEEL} />
        <path d="M24 46 151 28l8 73L31 120Z" fill="#243c32" strokeWidth="7" />
        <path d="m39 58 100-14M42 107l103-14" fill="none" stroke="#a58154" strokeWidth="3" />
        <path d="M49 82h80m-68-12 12 25m18-26 12 24m12-27 8 24" fill="none" stroke={NEON} strokeWidth="7" />
        <path d="M35 48 26 33m118-2 9-14" fill="none" stroke={LIGHT} strokeWidth="3" />
      </>}
      {kind === 'SOLAR_RIG' && <>
        <path d="M30 181h120l-11-16H42Z" fill="#a47b49" /><path d="M51 165 72 74h11l-14 91m42 0-14-91h11l22 91" fill={STEEL} />
        <path d="M21 68 127 44l28 70-110 27Z" fill="#34675d" strokeWidth="7" />
        <path d="m47 63 24 72m12-82 24 72m12-81 23 73M35 102l104-25" fill="none" stroke="#93d4bb" strokeWidth="4" />
        <path d="M77 160h41v-27H77Z" fill={NEON} /><path d="M87 146h18" fill="none" stroke={INK} strokeWidth="3" />
      </>}
      {kind === 'GARDEN' && <>
        <path d="M30 177h120l-10-36H40Z" fill="#9d704a" /><path d="M41 153h98m-87 13h76" fill="none" stroke={LIGHT} strokeWidth="3" />
        <path d="M52 143V91m29 51V72m29 70V80m25 62V99" fill="none" stroke="#43683c" strokeWidth="7" />
        <path d="M51 100q-27-20-22-40 31 2 27 35m27-17q-25-22-10-51 27 13 12 47m23 16q20-34 43-27-4 37-41 32m25 6q-4-28 22-35 10 26-19 41" fill="#9cc76b" />
        <path d="M38 124q23-23 43 0 22-28 48-2 18-18 34 6l-12 20H31Z" fill="#5b8b45" />
        <circle cx="61" cy="116" r="5" fill={NEON} /><circle cx="122" cy="123" r="5" fill={LIGHT} />
      </>}
      <path d="m34 187 13 3m18-2 19 4m49-6 15 3" fill="none" stroke={LIGHT} strokeWidth="2" />
    </g>
  </svg>;
}
