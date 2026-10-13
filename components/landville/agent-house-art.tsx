import type { AgentHouse } from '@/lib/personal-agent';

export function AgentHouseArt({ style, className = '' }: { style: AgentHouse; className?: string }) {
  if (style === 'RELAY_GARAGE') return <svg className={className} viewBox="0 0 230 180" aria-label="Relay Garage">
    <path d="M15 79L30 42H201L216 79V160H15Z" fill="#454235" stroke="#D2BA84" strokeWidth="6" />
    <path d="M17 83 19 158H214V81M27 51l-8 28h196l-12-32" fill="none" stroke="#181c16" strokeWidth="6" strokeLinejoin="round" />
    <path d="m24 91 12-5m-10 12 10-4m160 7 13-5m-14 12 12-4M27 143l12-4m154 1 14-6" fill="none" stroke="#171c16" strokeWidth="2.5" strokeLinecap="round" opacity=".78" />
    <path d="M7 80H223L202 37H27Z" fill="#6D5035" stroke="#C7FF00" strokeWidth="4" />
    <path d="m25 52 47-2m19-4 60-1m20-1 24 1m-116 25 26 1m42-1 29 1" fill="none" stroke="#241f19" strokeWidth="2" opacity=".7" />
    <path d="M55 100H174V161H55Z" fill="#1C2018" stroke="#AE9263" strokeWidth="6" />
    <path d="M55 114H174M55 130H174M55 146H174" stroke="#897C5C" strokeWidth="4" />
    <circle cx="185" cy="105" r="8" fill="#C7FF00" /><path d="M41 28H187" stroke="#C7FF00" strokeWidth="5" />
    <path d="M166 38V11H190V38" fill="#574A34" stroke="#AE9263" strokeWidth="4" />
  </svg>;
  if (style === 'LOOKOUT_TOWER') return <svg className={className} viewBox="0 0 230 180" aria-label="Lookout Tower">
    <path d="M69 62H161L178 160H52Z" fill="#3F4233" stroke="#C2A875" strokeWidth="6" />
    <path d="M69 66 55 157h120L160 66" fill="none" stroke="#171b15" strokeWidth="5" />
    <path d="m64 91 15 5m-17 4 13 6m-14 5 12 5m86-27-14 6m18 3-15 8m17 2-13 6M62 145l16-3m77-2 15-4" fill="none" stroke="#141914" strokeWidth="2.5" strokeLinecap="round" opacity=".72" />
    <path d="M47 70L60 25H170L184 70Z" fill="#5D513A" stroke="#C7FF00" strokeWidth="5" />
    <path d="m63 34 22-3m-22 10 34-4m23-5 25-2m-86 29 22-5m75-15 17 13" fill="none" stroke="#241f18" strokeWidth="2" opacity=".7" />
    <path d="M88 25V9H143V25" fill="#363A2E" stroke="#B6A076" strokeWidth="4" />
    <path d="M81 91H149V124H81Z" fill="#121A16" stroke="#C7FF00" strokeWidth="4" />
    <path d="M97 160V132H133V160" fill="#1B1E17" stroke="#C5AA77" strokeWidth="4" />
    <path d="M174 44L210 15M177 47L205 63" stroke="#BFA878" strokeWidth="4" />
    <circle cx="211" cy="14" r="6" fill="#C7FF00" />
  </svg>;
  return <svg className={className} viewBox="0 0 230 180" aria-label="Scrap Shack">
    <path d="M24 76L112 27L206 74V161H24Z" fill="#4A4535" stroke="#CAB17B" strokeWidth="6" />
    <path d="M26 92 27 159h177V77" fill="none" stroke="#161b15" strokeWidth="5" />
    <path d="m28 100 13-6m-11 15 12-5m-10 14 14-6m135-18 18-9m-13 18 13-6m-12 17 12-5M29 144l14-5m142-2 16-8" fill="none" stroke="#161b15" strokeWidth="2.6" strokeLinecap="round" opacity=".72" />
    <path d="M9 79L109 20L220 74L207 85L109 36L25 91Z" fill="#805739" stroke="#C7FF00" strokeWidth="4" />
    <path d="m31 72 20-12m7-4 18-11m10-8 15-9m27 8 18 10m8 4 15 8m13 8 15 9" fill="none" stroke="#271f17" strokeWidth="2.5" strokeLinecap="round" opacity=".65" />
    <path d="M91 160V102H139V160" fill="#1C2118" stroke="#A98B5A" strokeWidth="5" />
    <path d="M38 100H76V129H38ZM154 100H192V129H154Z" fill="#17231A" stroke="#C7FF00" strokeWidth="4" />
    <path d="M56 100V129M173 100V129M38 114H76M154 114H192" stroke="#8F7A52" strokeWidth="3" />
    <path d="M169 41V17H191V54" fill="#54422E" stroke="#A98B5A" strokeWidth="4" />
    <path d="M52 156L73 147M153 153L175 142" stroke="#C46D3A" strokeWidth="6" />
  </svg>;
}
