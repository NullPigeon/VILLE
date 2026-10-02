// Original vector scenery. It follows the existing map coordinates and is never interactive.
export function WorldFrontierArt({ height }: { height: number }) {
  return <svg className="world-frontier-art" viewBox={`0 0 1600 ${height}`} style={{ height }} aria-hidden="true">
    <defs>
      <pattern id="frontier-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <path d="M0 0V9" stroke="#382b20" strokeWidth="2" opacity=".22" />
      </pattern>
    </defs>
    <g className="frontier-cliffs" stroke="#57402b" strokeWidth="3" strokeLinejoin="round">
      <path d="M0 0H369L312 26 286 54 182 46 117 84 39 64 0 92Z" fill="#b78048" />
      <path d="M0 0H369L310 13 276 32 178 27 110 59 44 42 0 64Z" fill="#e6b56b" />
      <path d="M39 64 44 42M117 84 110 59M182 46 178 27M286 54 276 32" />
      <path d={`M1600 ${height}H1284L1325 ${height-30} 1341 ${height-61} 1440 ${height-42} 1485 ${height-91} 1570 ${height-112} 1600 ${height-68}Z`} fill="#8d573a" />
      <path d={`M1600 ${height-68} 1570 ${height-112} 1485 ${height-91} 1440 ${height-42} 1464 ${height-24} 1506 ${height-65} 1561 ${height-75} 1600 ${height-31}Z`} fill="#d89b56" />
    </g>
    <g transform="translate(727 73)" stroke="#302d20" strokeWidth="4" strokeLinejoin="round">
      <path d="M-8 42 2 99H22L20 44M139 36 144 94H163L160 34" fill="#756749" />
      <path d="m-23-15 184-9 16 57-196 11Z" fill="#372f25" />
      <path d="m-19-23 184-9 9 54-196 11Z" fill="#d3a052" />
      <path d="m-17-18 177-8" stroke="#f1d28a" strokeWidth="3" />
      <path d="M-7 29 9 10M18 28 34 8M131 23l15-17M153 20l12-15" stroke="#53472e" strokeWidth="7" />
      <path d="m28-10 104-5 4 36-104 5Z" fill="#252d20" />
      <text x="82" y="11" textAnchor="middle" fill="#d6ef7b" stroke="none" fontFamily="Arial" fontSize="16" fontWeight="900">LANDVILLE</text>
      <text x="82" y="63" textAnchor="middle" fill="#3a3222" stroke="none" fontFamily="monospace" fontSize="8" fontWeight="900">BUILT FROM GOOD BAD IDEAS</text>
      <circle cx="-7" cy="-12" r="3" fill="#f1dbab" /><circle cx="152" cy="-21" r="3" fill="#f1dbab" />
    </g>
    <g transform={`translate(660 ${height*.32})`} stroke="#302e21" strokeWidth="4" strokeLinejoin="round">
      <path d="m-43 46 105 17 24-19-74-39Z" fill="#45351f" opacity=".3" stroke="none" />
      <path d="m-26-56-15 111M26-56l15 111M-36 35h72M-32 6h64M-27-32l60 67M27-32-60 67" fill="none" />
      <path d="M-40-115v60q40 27 80 0v-60" fill="#b76837" />
      <path d="M-40-88q40 23 80 0v18q-40 23-80 0Z" fill="#ddac5d" />
      <ellipse cy="-115" rx="40" ry="16" fill="#edc983" />
      <path d="M-28-120q25-11 50-2M-27-101v15M-27-64v10" stroke="#f0c57a" strokeWidth="3" fill="none" />
      <path d="M37-53h13v101M41-26h12M43-5h12M46 17h12" fill="none" />
      <path d="M0-132v-47" />
      <g className="frontier-pennant"><path d="M1-179 51-171 37-155 1-157Z" fill="#d0ed58" /><path d="m13-171 17 3-13 6" fill="none" strokeWidth="3" /></g>
      <text x="0" y="-74" textAnchor="middle" fill="#302e21" stroke="none" fontSize="13" fontWeight="900" fontFamily="Arial">SCRAP / 01</text>
    </g>
    <g transform={`translate(1198 ${height*.115})`} stroke="#24382f" strokeWidth="4" strokeLinejoin="round">
      <path d="M-17 50h75l17-12-47-41Z" fill="#42361f" opacity=".35" stroke="none" />
      <path d="M0-19-18 42H39L18-19M-8 18h35" fill="#78855b" />
      <g className="frontier-dish"><path d="M-29-90Q-39-25 41-21Z" fill="#67a49b" /><path d="M-29-90Q4-87 41-21Q-6-13-29-90Z" fill="#b1d0a0" /><path d="M-5-61 33-91M23-102l20 22" fill="none" /><circle cx="33" cy="-91" r="6" fill="#d2ee70" /></g>
      <path className="frontier-transmission" d="M42-112q28 4 35 26m-29-43q37 5 46 38" stroke="#cdeb67" strokeWidth="5" fill="none" />
    </g>
    <g transform={`translate(887 ${height*.72}) rotate(5)`} stroke="#342c21" strokeWidth="3" strokeLinejoin="round">
      <path d="M-22 0v59M29-3v60" strokeWidth="6" /><path d="m-46-75 91-5 7 74-99 7Z" fill="#b47748" />
      <path d="m-41-69 80-5 7 59-85 6Z" fill="#e5ca8d" />
      <path d="m-21-54 41-3 5 27-43 4Z" fill="#3a4730" /><path d="m-25-58 22-9 25 6-3 5Z" fill="#79744a" />
      <path d="m-11-44 3-1m15-1 3-1" stroke="#d6f155" strokeWidth="6" strokeLinecap="round" />
      <path d="m-8-35 13-1" stroke="#d6f155" strokeWidth="2" />
      <text x="0" y="-15" textAnchor="middle" fill="#373523" stroke="none" fontSize="8" fontFamily="Arial" fontWeight="900">YOUR IDEA. OUR TOWN.</text>
      <path d="m-36-62 9-2m55 41 8-3" stroke="#fff0b7" strokeWidth="2" />
    </g>
    <g stroke="#5b432b" strokeWidth="2" fill="none" opacity=".55">
      <path d={`M342 ${height*.43}l21 4-9 12 17 9m-29-21-12 10M1094 ${height*.61}l-17 9 7 18-24 4M1299 ${height*.42}l19-6 13 9-2 12M315 ${height*.7}l13-18 24 5 12-10`} />
    </g>
    {[[559,.1],[1298,.82],[249,.57],[1062,.94]].map(([x,y],index)=><g key={index} transform={`translate(${x} ${height*y})`} stroke="#453724" strokeWidth="2.5" strokeLinejoin="round">
      <path d="m-23 7 15-22 29 3 17 21-12 16-34-1Z" fill="#b8814c" /><path d="m-23 7 15-22 29 3-9 16Z" fill="#e7b86c" /><path d="m12 4 26 5-12 16-19-7Z" fill="#79553a" /><path d="m-8-15 20 19-5 14" fill="none" />
    </g>)}
  </svg>;
}
