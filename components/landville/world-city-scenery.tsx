// City infrastructure is scenery. Published places remain the interactive map layer.
export function WorldCityScenery({ height }: { height: number }) {
  const streets = [
    `M 210 ${height * 0.16} H 665 V ${height * 0.41} H 205 V ${height * 0.16}`,
    `M 940 ${height * 0.15} H 1395 V ${height * 0.4} H 940 Z`,
    `M 205 ${height * 0.62} H 660 V ${height * 0.89} H 205 Z`,
    `M 942 ${height * 0.62} H 1395 V ${height * 0.89} H 942 Z`,
    `M 205 ${height * 0.4} V ${height * 0.49} M 1395 ${height * 0.4} V ${height * 0.48}`,
    `M 205 ${height * 0.62} V ${height * 0.52} M 1395 ${height * 0.62} V ${height * 0.5}`,
  ];
  return (
    <svg
      className="world-city-scenery"
      viewBox={`0 0 1600 ${height}`}
      style={{ height }}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="city-sand-grain"
          width="57"
          height="43"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 8 7 h 3 M 39 29 h 2 M 21 35 l 2 -1 M 48 10 l 3 1"
            fill="none"
            stroke="#dab883"
            opacity=".23"
          />
          <circle cx="31" cy="16" r=".8" fill="#503820" opacity=".25" />
        </pattern>
        <pattern
          id="city-paving"
          width="24"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <rect width="24" height="16" fill="#645b43" />
          <path
            d="M 0 0 H 24 M 0 8 H 24 M 12 0 V 8 M 0 8 V 16 M 24 8 V 16"
            fill="none"
            stroke="#938366"
            strokeWidth=".7"
          />
        </pattern>
        <pattern
          id="city-yard-gravel"
          width="28"
          height="23"
          patternUnits="userSpaceOnUse"
        >
          <rect width="28" height="23" fill="#51422d" />
          <path
            d="M 3 5 l 2 -1 M 17 16 l 3 1 M 24 4 l 1 2 M 8 20 l 2 -1"
            stroke="#88704b"
            strokeWidth="1"
            opacity=".4"
          />
        </pattern>
        <pattern
          id="city-grass"
          width="37"
          height="31"
          patternUnits="userSpaceOnUse"
        >
          <rect width="37" height="31" fill="#907349" />
          <path
            d="M 8 12 l 7 -2 M 27 27 l 6 -1 M 18 5 l 4 1"
            fill="none"
            stroke="#c1a071"
            strokeWidth="1"
          />
        </pattern>
        <pattern
          id="city-hazard"
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="14" height="14" fill="#272a1c" />
          <rect width="6" height="14" fill="#a58d42" opacity=".7" />
        </pattern>
        <linearGradient id="city-canal" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#61462f" />
          <stop offset=".5" stopColor="#8c663e" />
          <stop offset="1" stopColor="#593d2a" />
        </linearGradient>
        <radialGradient id="city-square-light">
          <stop stopColor="#a7b94a" stopOpacity=".2" />
          <stop offset="1" stopColor="#a7b94a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height={height} fill="url(#city-sand-grain)" />

      <g className="city-desert-terrain">
        <path
          d={`M 0 0 H 470 C 347 35 367 70 241 84 S 90 140 0 153 Z`}
          fill="#a2834b"
        />
        <path d="M 0 20 C 117 8 183 34 273 19 S 382 24 446 0 M 0 43 C 126 31 152 66 251 48 S 353 54 405 18 M 0 77 C 86 56 152 92 227 69" />
        <path
          d={`M 1600 0 H 1270 C 1310 82 1501 72 1470 164 S 1549 235 1600 258 Z`}
          fill="#ad8b51"
        />
        <path d="M 1313 0 C 1350 59 1563 32 1513 143 S 1563 218 1600 227 M 1354 0 C 1395 33 1606 14 1544 124 S 1578 186 1600 185" />
        <path
          d={`M 0 ${height} V ${height - 192} C 92 ${height - 182} 181 ${height - 234} 297 ${height - 117} S 578 ${height - 73} 636 ${height} Z`}
          fill="#a98a54"
        />
        <path
          d={`M 0 ${height - 158} C 167 ${height - 139} 166 ${height - 197} 275 ${height - 91} S 506 ${height - 44} 574 ${height} M 0 ${height - 125} C 144 ${height - 102} 173 ${height - 159} 266 ${height - 68} S 477 ${height - 10} 509 ${height} M 0 ${height - 75} C 151 ${height - 48} 158 ${height - 98} 215 ${height - 31}`}
        />
        <path
          d={`M 1600 ${height - 198} C 1543 ${height - 249} 1512 ${height - 157} 1390 ${height - 137} S 1259 ${height - 79} 1202 ${height} H 1600 Z`}
          fill="#a17a45"
        />
        <path
          d={`M 1600 ${height - 164} C 1547 ${height - 210} 1508 ${height - 124} 1419 ${height - 108} S 1308 ${height - 53} 1258 ${height} M 1600 ${height - 117} C 1551 ${height - 155} 1514 ${height - 85} 1444 ${height - 73} S 1367 ${height - 24} 1328 ${height}`}
        />
        {[
          [165, 0.11],
          [1390, 0.08],
          [140, 0.58],
          [1455, 0.8],
          [735, 0.9],
          [857, 0.08],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${height * y})`}>
            <path
              d="M -16 4 L -9 -9 L 11 -13 L 23 1 L 13 12 L -7 14 Z"
              fill="#ad9163"
            />
            <path d="M -9 -9 L 11 -13 L 23 1 L 5 3 Z" fill="#d0b37b" />
            <path d="M 5 3 L 23 1 L 13 12 L -7 14 Z" fill="#7c613f" />
          </g>
        ))}
      </g>

      <path
        className="city-perimeter-shadow"
        d={`M 66 60 H 1510 Q 1544 60 1544 94 V ${height - 91} Q 1544 ${height - 54} 1507 ${height - 54} H 82 Q 49 ${height - 54} 49 ${height - 87} V 90 Q 49 60 66 60 Z`}
      />
      <path
        className="city-perimeter-road"
        d={`M 66 60 H 1510 Q 1544 60 1544 94 V ${height - 91} Q 1544 ${height - 54} 1507 ${height - 54} H 82 Q 49 ${height - 54} 49 ${height - 87} V 90 Q 49 60 66 60 Z`}
      />

      <path
        d={`M 96 100 C 128 ${height * 0.25} 68 ${height * 0.36} 104 ${height * 0.46} S 135 ${height * 0.74} 96 ${height - 100}`}
        className="city-canal-bank"
      />
      <path
        d={`M 96 100 C 128 ${height * 0.25} 68 ${height * 0.36} 104 ${height * 0.46} S 135 ${height * 0.74} 96 ${height - 100}`}
        className="city-canal-water"
      />
      {[0.18, 0.38, 0.65, 0.83].map((y) => (
        <path
          key={y}
          d={`M 88 ${height * y} l 17 -3 m -14 9 l 10 -2`}
          className="city-water-ripple"
        />
      ))}

      <g className="city-local-streets">
        {streets.map((d, index) => (
          <path key={index} d={d} className="city-local-curb" />
        ))}
        {streets.map((d, index) => (
          <path key={index} d={d} className="city-local-road" />
        ))}
      </g>
      <g className="city-railway">
        <path d={`M 1483 116 V ${height - 120} M 1493 116 V ${height - 120}`} />
        {Array.from(
          { length: Math.max(0, Math.floor((height - 235) / 18)) },
          (_, i) => (
            <path
              key={i}
              d={`M 1477 ${122 + i * 18} H 1499`}
              className="city-rail-sleeper"
            />
          ),
        )}
        <g transform={`translate(1458 ${height * 0.25})`}>
          <rect
            x="9"
            y="9"
            width="41"
            height="125"
            rx="3"
            fill="#060a07"
            opacity=".5"
          />
          <rect
            width="42"
            height="120"
            rx="3"
            fill="#625b38"
            stroke="#a08d56"
          />
          <rect
            x="5"
            y="9"
            width="32"
            height="102"
            fill="#373f2a"
            stroke="#92804b"
          />
          {[23, 45, 67, 89].map((y) => (
            <path key={y} d={`M 7 ${y} H 35`} stroke="#7c7650" />
          ))}
          <rect x="13" y="46" width="16" height="29" fill="#889749" />
          <text
            x="21"
            y="65"
            textAnchor="middle"
            fill="#233021"
            fontSize="9"
            fontFamily="monospace"
          >
            LV
          </text>
        </g>
      </g>

      <g transform={`translate(74 ${height * 0.12})`}>
        <path
          d="M 6 11 H 144 V 143 H 6 Z"
          fill="url(#city-yard-gravel)"
          stroke="#82724a"
        />
        <path d="M 6 119 H 144" stroke="url(#city-hazard)" strokeWidth="9" />
        <Warehouse x={14} y={17} width={103} color="rust" />
        <Container x={16} y={83} color="#746442" />
        <Container x={74} y={86} color="#65543b" />
        <text className="city-ground-label" x="20" y="139">
          SALVAGE WORKS
        </text>
        <path
          d="M 5 10 V 143 M 145 10 V 143"
          stroke="#9a8150"
          strokeWidth="3"
          strokeDasharray="2 12"
        />
      </g>
      <g transform={`translate(665 ${height * 0.13})`}>
        <Warehouse x={0} y={0} width={76} color="rust" />
        <path
          d="M 21 -12 V -44 H 33 V -12 M 44 -12 V -33 H 53 V -12"
          fill="#4f5039"
          stroke="#91815a"
        />
        <path
          d="M 27 -49 C 9 -59 44 -68 29 -78 M 49 -40 C 63 -49 37 -54 49 -63"
          className="city-factory-steam"
        />
        <g transform="translate(4 90)">
          <ellipse
            cx="31"
            cy="30"
            rx="25"
            ry="12"
            fill="#070b07"
            opacity=".5"
          />
          <path
            d="M 9 3 V 25 Q 30 43 51 25 V 3"
            fill="#514e33"
            stroke="#92845b"
          />
          <ellipse
            cx="30"
            cy="3"
            rx="21"
            ry="9"
            fill="#7e7550"
            stroke="#a79769"
          />
          <ellipse
            cx="30"
            cy="3"
            rx="12"
            ry="5"
            fill="#384435"
            stroke="#9aa064"
          />
          <path d="M 17 8 V 29" stroke="#918a58" />
        </g>
      </g>
      <g transform={`translate(225 ${height * 0.085})`}>
        <Container x={0} y={0} color="#806849" />
        <Container x={66} y={0} color="#78603b" />
        <Container x={132} y={0} color="#4f6040" />
        <path
          d="M 8 34 H 173"
          stroke="#8b743f"
          strokeWidth="3"
          strokeDasharray="13 9"
        />
      </g>

      <g transform={`translate(954 ${height * 0.085})`}>
        <Warehouse x={0} y={0} width={97} color="teal" />
        <Warehouse x={129} y={6} width={113} color="teal" />
        <path d="M 4 82 H 267 V 105" className="city-power-cable" />
        <text className="city-ground-label" x="8" y="98">
          MUNICIPAL POWER GRID
        </text>
      </g>
      <g transform={`translate(1408 ${height * 0.39})`}>
        <rect
          x="-17"
          y="-111"
          width="70"
          height="136"
          fill="#213832"
          stroke="#537368"
        />
        <path
          d="M -11 -103 H 44 M -11 -60 H 44 M -11 -15 H 44"
          stroke="#426358"
        />
        {[-85, -41, 4].map((y) => (
          <g key={y} transform={`translate(14 ${y})`}>
            <ellipse cx="4" cy="7" rx="18" ry="10" fill="#101c17" />
            <ellipse rx="18" ry="10" fill="#5c8070" stroke="#8caa80" />
            <path d="M -10 0 H 10 M 0 -6 V 6" stroke="#293e33" />
            <circle r="3" fill="#b6d483" />
          </g>
        ))}
        <path
          d="M 10 -115 V -154 M -2 -146 H 22 M -7 -135 H 27"
          stroke="#89a589"
          strokeWidth="3"
        />
      </g>
      <g transform={`translate(1356 ${height * 0.16})`}>
        <rect width="76" height="90" fill="#1d2a22" stroke="#687d5e" />
        {[9, 36, 63].map((y) => (
          <g key={y} transform={`translate(8 ${y})`}>
            <rect width="57" height="17" fill="#40605a" stroke="#749588" />
            <path
              d="M 19 1 V 16 M 38 1 V 16 M 1 8 H 56"
              stroke="#94b6a0"
              opacity=".55"
            />
          </g>
        ))}
      </g>

      <g transform={`translate(150 ${height * 0.75})`}>
        <path
          d="M -27 -95 Q 54 -133 91 -63 L 90 58 Q 11 100 -40 37 Z"
          fill="url(#city-grass)"
          stroke="#b79d70"
        />
        <path
          d="M -19 -43 Q 61 -49 57 33"
          stroke="#9c9260"
          strokeWidth="14"
          fill="none"
        />
        {[
          [-3, -72],
          [62, -76],
          [6, 40],
          [64, 46],
          [-24, -13],
        ].map(([x, y], i) => (
          <Tree key={i} x={x} y={y} />
        ))}
        <Bench x={22} y={-20} />
        <text className="city-ground-label" x="-13" y="84">
          THE COMMONS
        </text>
      </g>
      <g transform={`translate(678 ${height * 0.73})`}>
        <ellipse cx="5" cy="13" rx="69" ry="59" fill="#090d09" opacity=".6" />
        <circle r="61" fill="#39352c" stroke="#807054" strokeWidth="3" />
        <path
          d="M -50 10 A 51 51 0 0 0 50 10 M -40 10 A 41 41 0 0 0 40 10 M -30 10 A 31 31 0 0 0 30 10"
          fill="none"
          stroke="#847350"
          strokeWidth="5"
        />
        <path d="M -27 -9 V -36 H 27 V -9 Z" fill="#473d41" stroke="#a68483" />
        <path d="M -22 -30 H 22 M -22 -22 H 22" stroke="#c990c8" opacity=".7" />
        <circle cy="-23" r="6" fill="#1c2418" stroke="#d5a3bd" />
        <text className="city-ground-label" x="0" y="85" textAnchor="middle">
          SCRAP AMPHITHEATRE
        </text>
      </g>
      <g transform={`translate(299 ${height * 0.905})`}>
        <path
          d="M -17 -14 H 314 V 39 H -17 Z"
          fill="url(#city-paving)"
          stroke="#7d7752"
        />
        {[0, 52, 104, 156, 208, 260].map((x, i) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <rect
              x="3"
              y="5"
              width="39"
              height="18"
              fill="#080c09"
              opacity=".5"
            />
            <rect
              width="38"
              height="18"
              fill={['#906679', '#85704d', '#4e7972'][i % 3]}
              stroke="#a6a070"
            />
            <path
              d="M 8 4 L 15 13 L 24 4 L 31 12"
              stroke="#d6bc7d"
              fill="none"
              strokeWidth="2"
            />
          </g>
        ))}
        <text className="city-ground-label" x="142" y="59" textAnchor="middle">
          WALL OF WONDERFUL NONSENSE
        </text>
      </g>

      <g transform={`translate(1004 ${height * 0.89})`}>
        <path
          d="M -30 -21 H 426 V 65 H -30 Z"
          fill="url(#city-paving)"
          stroke="#6e704a"
        />
        {[0, 76, 152, 228, 304].map((x, i) => (
          <MarketStall
            key={x}
            x={x}
            y={0}
            color={i % 2 ? '#8d8251' : '#617b42'}
          />
        ))}
        <text className="city-ground-label" x="186" y="91" textAnchor="middle">
          MARKET WALK
        </text>
        <Tree x={391} y={8} />
      </g>
      <g transform={`translate(934 ${height * 0.72})`}>
        <Warehouse x={0} y={0} width={70} color="olive" />
        <rect
          x="5"
          y="72"
          width="48"
          height="34"
          fill="#504f33"
          stroke="#999362"
        />
        <path d="M 13 77 H 47 M 13 85 H 47 M 13 93 H 47" stroke="#938660" />
      </g>
      <g transform={`translate(1404 ${height * 0.69})`}>
        <Warehouse x={0} y={0} width={55} color="olive" />
        <Container x={0} y={81} color="#6a7447" />
      </g>

      <g className="city-street-lettering">
        <text
          x="1060"
          y={height * 0.525}
          transform={`rotate(4 1060 ${height * 0.525})`}
        >
          SCRAPY AVENUE
        </text>
        <text
          x="782"
          y={height * 0.13}
          transform={`rotate(90 782 ${height * 0.13})`}
        >
          CIVIC SPINE
        </text>
        <text x="395" y={height * 0.535}>
          WEST CROSSING
        </text>
      </g>
      {[
        [122, 0.085],
        [1440, 0.085],
        [133, 0.92],
        [1437, 0.93],
        [890, 0.095],
        [901, 0.91],
      ].map(([x, y], i) => (
        <Tree key={i} x={x} y={height * y} />
      ))}
      <g transform={`translate(1288 ${height - 111})`} className="city-compass">
        <circle r="23" fill="#172318" stroke="#6a7c4e" />
        <path d="M 0 -16 L 8 10 L 0 4 L -8 10 Z" fill="#a7b56b" />
        <text x="0" y="-32" textAnchor="middle">
          N
        </text>
        <text x="-56" y="39">
          LANDVILLE / CITY WORKS
        </text>
      </g>
    </svg>
  );
}

export function WorldSquareGround({ height }: { height: number }) {
  return (
    <svg
      className="world-square-ground"
      viewBox="-200 -200 400 400"
      style={{ top: height / 2 - 200 }}
      aria-hidden="true"
    >
      <ellipse cx="8" cy="14" rx="174" ry="144" fill="#302b1c" opacity=".6" />
      <path
        d="M -170 -62 L -72 -138 H 76 L 172 -60 V 68 L 75 142 H -74 L -169 64 Z"
        fill="url(#city-paving)"
        stroke="#c4b17b"
        strokeWidth="3"
      />
      <circle r="121" fill="none" stroke="#b0a272" strokeWidth="2" />
      <circle
        r="132"
        fill="none"
        stroke="#96885e"
        strokeWidth="7"
        strokeDasharray="3 12"
      />
      <circle r="170" fill="url(#city-square-light)" />
      {[0, 90, 180, 270].map((angle) => (
        <g key={angle} transform={`rotate(${angle})`}>
          <path
            d="M -32 -172 H 32 M -32 -162 H 32 M -32 -152 H 32"
            stroke="#e1d0a1"
            strokeWidth="5"
            opacity=".85"
          />
          <path d="M -41 -146 H 41" stroke="#bead7b" strokeWidth="3" />
        </g>
      ))}
      <Bench x={-115} y={-66} />
      <Bench x={74} y={74} />
      <Tree x={-124} y={72} small />
      <Tree x={115} y={-63} small />
    </svg>
  );
}

function Warehouse({
  x,
  y,
  width,
  color,
}: {
  x: number;
  y: number;
  width: number;
  color: 'rust' | 'teal' | 'olive';
}) {
  const palette = {
    rust: ['#ca8c4e', '#855334', '#efc886'],
    teal: ['#649c8a', '#355c4f', '#b4c995'],
    olive: ['#a3ac5f', '#576443', '#d6d797'],
  }[color];
  return (
    <g className="city-workshop" transform={`translate(${x} ${y})`}>
      <path
        d={`M 9 10 H ${width + 13} V 61 H 9 Z`}
        fill="#060905"
        opacity=".65"
      />
      <path
        d={`M 0 0 H ${width} V 48 H 0 Z`}
        fill={palette[1]}
        stroke="#333020"
        strokeWidth="3"
      />
      <path
        d={`M 0 0 L 12 -14 H ${width + 12} L ${width} 0 Z`}
        fill={palette[0]}
        stroke="#333020"
        strokeWidth="3"
      />
      <path
        d={`M ${width} 0 L ${width + 12} -14 V 33 L ${width} 48 Z`}
        fill={palette[1]}
        stroke="#333020"
        strokeWidth="3"
      />
      <path
        d={`M 9 -5 H ${width - 3} M 17 -10 H ${width + 4}`}
        stroke={palette[2]}
        opacity=".55"
      />
      <rect
        x={width * 0.18}
        y="16"
        width={width * 0.32}
        height="27"
        fill="#1a2318"
        stroke={palette[0]}
      />
      <path
        d={`M ${width * 0.18} 22 H ${width * 0.5} M ${width * 0.18} 28 H ${width * 0.5} M ${width * 0.18} 34 H ${width * 0.5}`}
        stroke={palette[0]}
      />
      <rect
        x={width * 0.64}
        y="14"
        width={width * 0.22}
        height="10"
        fill="#aebc79"
        opacity=".7"
      />
      <path d={`M ${width * 0.75} 14 V 24`} stroke={palette[1]} />
      <rect
        x="3"
        y="4"
        width={width - 7}
        height="3"
        fill={palette[2]}
        opacity=".45"
      />
    </g>
  );
}

function Container({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M 5 8 H 60 V 29 H 5 Z" fill="#080b07" opacity=".5" />
      <path d="M 0 0 L 7 -6 H 61 L 54 0 Z" fill={color} stroke="#a7966a" />
      <rect width="54" height="21" fill={color} stroke="#ae9e6b" />
      <path d="M 54 0 L 61 -6 V 15 L 54 21 Z" fill="#3d452e" stroke="#9b9262" />
      {[7, 15, 23, 31, 39, 47].map((x) => (
        <path key={x} d={`M ${x} 3 V 18`} stroke="#211f1666" strokeWidth="2" />
      ))}
    </g>
  );
}

function Tree({
  x,
  y,
  small = false,
}: {
  x: number;
  y: number;
  small?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${small ? 0.7 : 1})`}>
      <path d="M -3 21 L 25 33 L 33 26 L 7 14 Z" fill="#3d301a" opacity=".45" />
      <path
        d="M 0 20 V -29 M 0 -2 H -16 V -17 M 0 5 H 16 V -8"
        stroke="#394b2d"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M -2 18 V -29 M -3 -5 H -17 V -17 M 2 2 H 15 V -8"
        stroke="#8c9956"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M -3 -20 H 3 M -3 -12 H 3 M -3 9 H 3"
        stroke="#b2b779"
        strokeWidth="1"
      />
      <path d="M -12 22 H 12" stroke="#aa8951" strokeWidth="3" />
    </g>
  );
}

function Bench({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="4" y="6" width="41" height="15" fill="#0a1009" opacity=".6" />
      <rect width="40" height="14" rx="1" fill="#80704b" stroke="#a99b67" />
      <path
        d="M 0 4 H 40 M 0 9 H 40 M 7 -3 V 18 M 33 -3 V 18"
        stroke="#403f2b"
        strokeWidth="2"
      />
    </g>
  );
}

function MarketStall({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M 7 12 H 67 V 51 H 7 Z" fill="#070d08" opacity=".6" />
      <rect
        x="0"
        y="10"
        width="58"
        height="30"
        fill="#493f2d"
        stroke="#9d9261"
      />
      <path
        d="M -5 -5 L 4 -16 H 55 L 64 -5 V 12 H -5 Z"
        fill={color}
        stroke="#b2aa6c"
      />
      <path
        d="M 9 -14 V 12 M 26 -14 V 12 M 44 -14 V 12"
        stroke="#d0c28a"
        strokeWidth="8"
        opacity=".65"
      />
      <path d="M -5 11 H 64" stroke="#d0c28a" strokeWidth="3" />
      <rect x="5" y="20" width="15" height="12" fill="#b29350" />
      <rect x="26" y="23" width="21" height="9" fill="#5e8543" />
      <path d="M 0 13 V 42 M 58 13 V 42" stroke="#ac9d66" strokeWidth="3" />
    </g>
  );
}
