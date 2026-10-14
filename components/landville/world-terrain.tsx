import { useId } from 'react';

/** Terrain only: published places, homes and residents are rendered from city data above it. */
export function WorldTerrain({ width, height }: { width: number; height: number }) {
  const id = useId().replace(/:/g, '');
  const x = (value: number) => Math.round(width * value / 100);
  const y = (value: number) => Math.round(height * value / 100);
  const routes = [
    `M ${x(0)} ${y(48)} C ${x(22)} ${y(45)} ${x(34)} ${y(48)} ${x(50)} ${y(50)} S ${x(78)} ${y(49)} ${x(100)} ${y(52)}`,
    `M ${x(48)} 0 C ${x(50)} ${y(23)} ${x(48)} ${y(34)} ${x(50)} ${y(50)} S ${x(51)} ${y(78)} ${x(52)} ${height}`,
    `M ${x(8)} ${y(11)} C ${x(18)} ${y(20)} ${x(29)} ${y(35)} ${x(50)} ${y(50)} S ${x(74)} ${y(78)} ${x(92)} ${y(91)}`,
    `M ${x(92)} ${y(11)} C ${x(77)} ${y(23)} ${x(65)} ${y(40)} ${x(50)} ${y(50)} S ${x(28)} ${y(76)} ${x(9)} ${y(91)}`,
  ];
  const terrain = [
    { color: '#b0804b', path: `M0 0H${x(48)}L${x(45)} ${y(47)}Q${x(26)} ${y(43)} 0 ${y(51)}Z` },
    { color: '#628e79', path: `M${x(49)} 0H${width}V${y(49)}Q${x(79)} ${y(45)} ${x(54)} ${y(47)}Z` },
    { color: '#a57892', path: `M0 ${y(52)}Q${x(28)} ${y(48)} ${x(47)} ${y(54)}L${x(49)} ${height}H0Z` },
    { color: '#88924c', path: `M${x(54)} ${y(54)}Q${x(78)} ${y(50)} ${width} ${y(51)}V${height}H${x(50)}Z` },
  ];
  const ridges = [
    { fill: '#765438', path: `M0 ${y(7)} ${x(5)} ${y(5)} ${x(9)} ${y(10)} ${x(14)} ${y(9)} ${x(17)} ${y(15)} ${x(13)} ${y(19)} ${x(5)} ${y(17)} 0 ${y(21)}Z` },
    { fill: '#805a38', path: `M${x(2)} ${y(29)} ${x(8)} ${y(25)} ${x(13)} ${y(29)} ${x(16)} ${y(34)} ${x(11)} ${y(39)} ${x(4)} ${y(37)}Z` },
    { fill: '#3e7768', path: `M${x(83)} ${y(5)} ${x(89)} ${y(8)} ${x(95)} ${y(5)} ${width} ${y(10)}V${y(28)} ${x(94)} ${y(25)} ${x(86)} ${y(18)}Z` },
    { fill: '#477762', path: `M${x(80)} ${y(33)} ${x(87)} ${y(29)} ${x(94)} ${y(34)} ${x(98)} ${y(40)} ${x(92)} ${y(43)} ${x(84)} ${y(40)}Z` },
    { fill: '#805679', path: `M0 ${y(68)} ${x(7)} ${y(65)} ${x(12)} ${y(70)} ${x(17)} ${y(68)} ${x(18)} ${y(77)} ${x(9)} ${y(81)} 0 ${y(79)}Z` },
    { fill: '#775473', path: `M${x(25)} ${y(85)} ${x(31)} ${y(81)} ${x(39)} ${y(84)} ${x(41)} ${y(91)} ${x(34)} ${y(94)} ${x(27)} ${y(92)}Z` },
    { fill: '#566638', path: `M${x(83)} ${y(66)} ${x(90)} ${y(62)} ${x(97)} ${y(67)} ${width} ${y(75)} ${x(94)} ${y(79)} ${x(86)} ${y(76)}Z` },
    { fill: '#596d3b', path: `M${x(65)} ${y(83)} ${x(70)} ${y(79)} ${x(78)} ${y(82)} ${x(83)} ${y(88)} ${x(79)} ${y(93)} ${x(69)} ${y(91)}Z` },
  ];
  return <svg className="world-terrain" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <pattern id={`${id}-grain`} width="33" height="28" patternUnits="userSpaceOnUse">
        <path d="m3 4 8-2m15 13 5-2M8 22l4-1" stroke="#201f16" strokeWidth="1.5" opacity=".29" />
        <circle cx="19" cy="5" r="1.5" fill="#151c14" opacity=".4" />
      </pattern>
      <pattern id={`${id}-hatch`} width="25" height="25" patternUnits="userSpaceOnUse" patternTransform="rotate(23)">
        <path d="M0 0v25M6 0v12" stroke="#161d17" strokeWidth="2" opacity=".17" />
      </pattern>
      <radialGradient id={`${id}-light`}><stop stopColor="#f6dc9b" stopOpacity=".48"/><stop offset="1" stopColor="#f6dc9b" stopOpacity="0"/></radialGradient>
    </defs>
    <rect width={width} height={height} fill="#6e6444" />
    {terrain.map((area) => <path key={area.color} d={area.path} fill={area.color} stroke="#1c2017" strokeWidth="12" />)}
    <rect width={width} height={height} fill={`url(#${id}-grain)`} />
    {ridges.map((ridge) => <g key={ridge.path}>
      <path d={ridge.path} fill={ridge.fill} stroke="#192019" strokeWidth="9" strokeLinejoin="round" />
      <path d={ridge.path} fill={`url(#${id}-hatch)`} stroke="#e7c78f" strokeWidth="2" strokeLinejoin="round" opacity=".64" />
    </g>)}
    <rect width={width} height={height} fill={`url(#${id}-hatch)`} />
    <ellipse cx={x(50)} cy={y(50)} rx={x(35)} ry={y(25)} fill={`url(#${id}-light)`} />
    <g fill="none" strokeLinejoin="round" strokeLinecap="round">
      {routes.map((path, index) => <g key={index}>
        <path d={path} stroke="#141b14" strokeWidth={index < 2 ? 73 : 42} />
        <path d={path} stroke="#b5a06f" strokeWidth={index < 2 ? 59 : 30} />
        <path d={path} stroke="#e1ca8e" strokeWidth="2" strokeDasharray="13 24" opacity=".8" />
      </g>)}
    </g>
    <g fill="none" stroke="#1c251b" opacity=".56">
      <path d={`M${x(3)} ${y(17)}q${x(9)} -${y(4)} ${x(18)} ${y(1)}m-${x(15)} ${y(4)}q${x(10)} -${y(4)} ${x(17)} ${y(1)}M${x(69)} ${y(14)}q${x(12)} -${y(5)} ${x(20)} ${y(1)}M${x(8)} ${y(75)}q${x(9)} -${y(5)} ${x(22)} ${y(2)}M${x(74)} ${y(83)}q${x(9)} -${y(3)} ${x(20)} ${y(2)}`} strokeWidth="4" />
      <path d={`M${x(4)} ${y(19)}q${x(9)} -${y(4)} ${x(18)} ${y(1)}M${x(70)} ${y(16)}q${x(12)} -${y(5)} ${x(19)} ${y(1)}M${x(9)} ${y(77)}q${x(9)} -${y(5)} ${x(21)} ${y(2)}M${x(75)} ${y(85)}q${x(9)} -${y(3)} ${x(18)} ${y(2)}`} strokeWidth="2" />
    </g>
    <rect x="7" y="7" width={width - 14} height={height - 14} fill="none" stroke="#141a12" strokeWidth="14" />
    <rect x="19" y="19" width={width - 38} height={height - 38} fill="none" stroke="#e8d096" strokeWidth="3" opacity=".55" />
  </svg>;
}
