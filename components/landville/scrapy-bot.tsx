// Original SVG mascot, based on LANDVILLE's cap, CRT face and scrap-metal palette.
export function ScrapyBot({ portrait = false, className = '' }: { portrait?: boolean; className?: string }) {
  return <svg className={`scrapy-bot ${className}`} viewBox={portrait ? '0 0 180 126' : '0 0 180 230'} fill="none" aria-hidden="true">
    {!portrait && <ellipse className="scrapy-shadow" cx="92" cy="220" rx="53" ry="8" fill="#070b08" opacity=".28" />}
    <g className="scrapy-idle" stroke="#171a13" strokeWidth="4" strokeLinejoin="round">
      {!portrait && <>
        <path d="m58 174-4 32-15 5 1 8h36l5-42m22 0 4 42h35l1-9-17-7-6-29" fill="#6e654c" />
        <path d="m44 119-16 7-9 38 12 6 14-24m91-27 15 8 4 34-12 4-13-25" fill="#c08a44" />
        <g className="scrapy-wave"><path d="m148 156 10-27 11 3-3 35-15 8-14-14" fill="#7f8861" /><path d="m158 133 2-15m6 17 6-13" stroke="#c4ad71" /></g>
        <path d="m50 109 81 2 9 69-24 15-62-9-12-20Z" fill="#b89049" />
        <path d="m61 121 56 1 5 45-62-2Z" fill="#716f45" /><path d="m47 171 13 15 54 7 23-15" stroke="#dbbc73" />
        <path d="M75 178h29" stroke="#272c20" strokeWidth="7" />
        <circle cx="89" cy="140" r="15" fill="#c7ef3d" strokeWidth="2" /><path d="m81 140 4 4 11-9" strokeWidth="3" />
        <path d="m49 138 9 2m64 8 12-3m-75-18 8-2" stroke="#e2c996" strokeWidth="2" />
      </>}
      <path d="m25 65-9-37m0 0 4-8" stroke="#998d5d" /><circle className="scrapy-signal" cx="20" cy="19" r="5" fill="#c7ff00" strokeWidth="2" />
      <path d="M35 60 24 64l-3 34 13 8m108-46 12 5 4 34-15 8" fill="#ab873f" />
      <path d="m30 71-1 25m119-25 3 25" stroke="#d1dc58" strokeWidth="3" />
      <path d="m44 40 88 3 13 20-3 43-19 13-75-3-16-15 1-41Z" fill="#b4a35d" />
      <path d="m44 57 89 2 2 45-12 6-76-2-8-11Z" fill="#22321b" />
      <path d="m47 65 77-1m-81 9 6-7" stroke="#496232" strokeWidth="2" />
      <g className="scrapy-eyes" stroke="none" fill="#c7ff00"><ellipse cx="67" cy="82" rx="8" ry="13" /><ellipse cx="112" cy="82" rx="8" ry="13" /></g>
      <path d="m80 101 10 3 10-3" stroke="#a8d951" strokeWidth="2" />
      <path d="m39 48 7-21 27-15 46 4 13 24 20 11-15 8-37-8-57 10-17-6Z" fill="#756444" />
      <path d="m48 29 31-11 36 3 11 22-27-4-53 11m58-31-5 20" stroke="#baa577" strokeWidth="2" />
      <path d="m67 30 3 12 10-2m4-14 7 12 5-15" stroke="#d7e695" strokeWidth="3" />
      <path d="m120 105 15 2-2 18-14-2Z" fill="#dfc692" strokeWidth="2" /><path d="m123 119 1-9 3 5 4-4-1 10" strokeWidth="1.5" />
      <g fill="#3b402a" stroke="none"><circle cx="42" cy="105" r="2" /><circle cx="139" cy="67" r="2" /><circle cx="48" cy="55" r="2" /></g>
    </g>
  </svg>;
}
