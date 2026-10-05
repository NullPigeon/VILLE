import { ScrapyBot } from '@/components/landville/scrapy-bot';

export function WorldLife({ height }: { height: number }) {
  return <div className="city-world-life" style={{ height }} aria-hidden="true">
    <div className="city-mayor-patrol"><ScrapyBot /><span>MAYOR ON THE MOVE</span></div>
    <div className="city-tumbleweed"><svg viewBox="0 0 60 60" fill="none"><circle cx="30" cy="30" r="22" /><path d="m7 20 42 25M11 45l35-32M24 5l15 49M4 34l49-10M17 9l29 39M7 43l40-31M10 20l33 28-4-36-20 40-8-25 43 4" /></svg></div>
    <i className="city-dust dust-one" /><i className="city-dust dust-two" />
    <div className="city-windmill"><svg viewBox="0 0 80 130"><path d="M39 50 19 125h42L40 50M27 95h27M22 113h35" fill="none" stroke="#353323" strokeWidth="5" /><g className="city-windmill-blades"><path d="M40 40 20 3 36 2l6 33 34-19 4 15-34 10 20 33-16 5-10-34L7 62 2 47l33-8Z" fill="#b28d4d" stroke="#393426" strokeWidth="3" /></g><circle cx="40" cy="40" r="6" fill="#d1d868" stroke="#333423" strokeWidth="3" /></svg></div>
  </div>;
}
