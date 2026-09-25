import type { AgentHouse } from '@/lib/personal-agent';

export function AgentHouseArt({ style, className = '' }: { style: AgentHouse; className?: string }) {
  if (style === 'RELAY_GARAGE') return <svg className={className} viewBox="0 0 230 180" aria-label="Relay Garage">
    <path d="M15 79L30 42H201L216 79V160H15Z" fill="#454235" stroke="#D2BA84" strokeWidth="6" />
    <path d="M7 80H223L202 37H27Z" fill="#6D5035" stroke="#C7FF00" strokeWidth="4" />
    <path d="M55 100H174V161H55Z" fill="#1C2018" stroke="#AE9263" strokeWidth="6" />
    <path d="M55 114H174M55 130H174M55 146H174" stroke="#897C5C" strokeWidth="4" />
    <circle cx="185" cy="105" r="8" fill="#C7FF00" /><path d="M41 28H187" stroke="#C7FF00" strokeWidth="5" />
    <path d="M166 38V11H190V38" fill="#574A34" stroke="#AE9263" strokeWidth="4" />
  </svg>;
  if (style === 'LOOKOUT_TOWER') return <svg className={className} viewBox="0 0 230 180" aria-label="Lookout Tower">
    <path d="M69 62H161L178 160H52Z" fill="#3F4233" stroke="#C2A875" strokeWidth="6" />
    <path d="M47 70L60 25H170L184 70Z" fill="#5D513A" stroke="#C7FF00" strokeWidth="5" />
    <path d="M88 25V9H143V25" fill="#363A2E" stroke="#B6A076" strokeWidth="4" />
    <path d="M81 91H149V124H81Z" fill="#121A16" stroke="#C7FF00" strokeWidth="4" />
    <path d="M97 160V132H133V160" fill="#1B1E17" stroke="#C5AA77" strokeWidth="4" />
    <path d="M174 44L210 15M177 47L205 63" stroke="#BFA878" strokeWidth="4" />
    <circle cx="211" cy="14" r="6" fill="#C7FF00" />
  </svg>;
  return <svg className={className} viewBox="0 0 230 180" aria-label="Scrap Shack">
    <path d="M24 76L112 27L206 74V161H24Z" fill="#4A4535" stroke="#CAB17B" strokeWidth="6" />
    <path d="M9 79L109 20L220 74L207 85L109 36L25 91Z" fill="#805739" stroke="#C7FF00" strokeWidth="4" />
    <path d="M91 160V102H139V160" fill="#1C2118" stroke="#A98B5A" strokeWidth="5" />
    <path d="M38 100H76V129H38ZM154 100H192V129H154Z" fill="#17231A" stroke="#C7FF00" strokeWidth="4" />
    <path d="M56 100V129M173 100V129M38 114H76M154 114H192" stroke="#8F7A52" strokeWidth="3" />
    <path d="M169 41V17H191V54" fill="#54422E" stroke="#A98B5A" strokeWidth="4" />
    <path d="M52 156L73 147M153 153L175 142" stroke="#C46D3A" strokeWidth="6" />
  </svg>;
}
