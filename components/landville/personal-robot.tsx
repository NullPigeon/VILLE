import type { AgentPresentation } from '@/lib/personal-agent';

export function PersonalRobot({ presentation = 'MASCULINE', className = '' }: {
  presentation?: AgentPresentation; className?: string;
}) {
  return (
    <svg className={`personal-robot ${className}`} viewBox="0 0 180 250" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-label="Boxy LANDVILLE robot on one wheel">
      <ellipse cx="91" cy="236" rx="45" ry="9" fill="#070907" opacity=".55" />
      <path d="M87 41V20M87 20L100 12" stroke="#9B855D" strokeWidth="6" strokeLinecap="square" />
      <circle cx="101" cy="11" r="7" fill="#C7FF00" className="personal-robot-antenna" />
      <path d="M31 65L19 75V133L34 143L45 131V77L31 65ZM148 65L161 77V132L147 143L136 131V76L148 65Z"
        fill="#302F28" stroke="#9A8359" strokeWidth="4" />
      <path d="M19 128L9 151L21 159L40 137M160 128L171 151L159 159L140 137"
        stroke="#B49A6E" strokeWidth="8" strokeLinecap="square" />
      <path d="M40 48L141 44L153 142L135 166L47 169L28 146L40 48Z"
        fill="#3B3D30" stroke="#D5B881" strokeWidth="5" />
      <path d="M39 61L140 57L145 91L34 96L39 61Z" fill="#111A14" stroke="#A38653" strokeWidth="4" />
      <path d="M47 72H66L75 82L65 87H45M133 70H113L104 81L115 86H135"
        fill={presentation === 'FEMININE' ? '#FFCF7D' : '#C7FF00'} className="personal-robot-eyes" />
      <path d="M63 112H116M69 125H110M78 139H100" stroke="#8E805E" strokeWidth="5" />
      <path d="M33 99L48 102M134 101L148 97M46 157L55 173H127L137 155"
        stroke="#C7FF00" strokeWidth="4" />
      <path d="M70 174L78 193H106L114 173" fill="#9C6C3F" stroke="#D7B485" strokeWidth="5" />
      <circle cx="92" cy="217" r="25" fill="#1A1B17" stroke="#A7946B" strokeWidth="7" />
      <circle cx="92" cy="217" r="10" fill="#C7FF00" />
      <path d="M36 43L45 27L65 32M146 41L136 26L116 32"
        stroke="#A58658" strokeWidth="6" strokeLinecap="square" />
      <path d="M44 45L134 40" stroke="#C7FF00" strokeWidth="3" />
      <rect x="54" y="102" width="14" height="7" fill="#C46D3A" />
      <rect x="115" y="132" width="15" height="7" fill="#C46D3A" />
    </svg>
  );
}
