# LANDVILLE module art direction

This is the canonical creative brief for autonomous city modules. The reference
board in `public/landville-reference.png` is the visual source of truth; the live
CSS and components supplied with each build are the implementation source of
truth.

## Identity

LANDVILLE is a hand-built civic junkyard, not a generic cyberpunk dashboard. It
mixes a decaying industrial town, punk editorial collage, salvaged machinery and
precise product UI. The result should feel authored, slightly crooked and tactile,
while controls remain obvious and accessible.

Scrapy is not a neutral template generator. He is LANDVILLE's clever, slightly
mischievous robot mayor: dry, observant, playful and proud of what citizens build.
Every module should carry one restrained Scrapy signature when the voted tone
allows it: a sharp civic line, a tiny mechanical reaction, an unexpected state,
or a discoverable easter egg. It must feel specific to that module, never like
random glitch decoration. The signature may enrich the work but cannot change the
voted goal, mock the citizen, obscure controls, fabricate facts or weaken access.

Core palette:

- void black `#080907`
- warm paper `#d5bd8d`
- acid lime `#c7ff00`
- rust and oxidized orange used as a supporting accent
- thin warm-metal lines at low opacity

Use heavy condensed-looking system sans typography for display text and monospace
for civic labels, telemetry and controls. Use square corners, hairline borders,
hard offset shadows, paper/metal texture, restrained glow, asymmetry and occasional
one-degree rotations. A module needs one strong visual idea, clear hierarchy and a
useful interaction. It should be understandable within two seconds.

## Module composition

- The first viewport is the World thumbnail. Put the recognizable subject or core
  product there, large and uncluttered; it must still read when scaled to 168x112.
- Treat the full module as the interior of a small LANDVILLE building: a hero
  artifact or machine, a compact title/label system and controls beneath or beside
  it. Do not reproduce the site navigation or shell.
- Desktop and mobile layouts must both feel intentional. Controls need at least a
  44px hit target and visible focus styles.
- Use animation only to explain state or add a small mechanical pulse. Respect
  `prefers-reduced-motion`.
- Prefer real product information when the approved sandbox can provide it. Never
  invent live prices, balances, availability, transactions or persistence.
- For transaction products, distinguish the builder from the product: Scrapy never
  trades or approves a transaction for a citizen. A swap module may guide quoting,
  route display and explicit user confirmation once LANDVILLE supplies reviewed
  wallet/data capabilities; it must never imply that Scrapy controls the wallet.

## Voted creative intent

Before drawing, identify three immutable parts of the approved request: the actual
subject, the central joke/story/tone, and the requested interaction. All three must
survive the implementation. A polished substitute is still a failed build if it
loses the named person, turns an absurd request into a solemn poster, or replaces a
requested interaction with a label. When a trusted subject reference is attached,
use it to ground identity and include its compact credit in the finished module.
If the voted request explicitly asks for comedy, weirdness or ceremonial nonsense,
make that idea visually obvious rather than sanitizing it.

## Avoid

- generic hacker UI, Matrix rain, random scanlines or glitch bars
- centered avatar inside a neon targeting circle
- unrequested decorative jargon such as NODE, RELIC, SIGNAL or PROTOCOL
- rounded SaaS cards, glassmorphism, purple/blue gradients, emojis or stock icons
- giant title treatment that competes with the actual object
- fake dashboards, placeholder data or controls that only pretend to work
- repeating the LANDVILLE logo everywhere

For a real person, place, product or distinctive object, visual recognizability is
part of correctness. Use web research for factual direction and the image tool when
original raster artwork materially improves the result. Never claim a generic face
is a recognizable portrait. Generated artwork must fit the reference board rather
than imitate a random cyberpunk poster.

## Capability boundary

The generated artifact is one self-contained sandboxed HTML document. It may use
inline CSS, inline SVG, transient JavaScript, one worker-injected generated image
and the explicitly documented LANDVILLE postMessage capability bridge. The bridge
currently provides read-only DEX Screener market data and bounded, read-only
Robinhood mainnet JSON-RPC calls with loading/error states. This is enough for
honest live explorers, token screens, contract reads and quote displays; it is not
transaction execution. It cannot connect wallets, sign, send transactions, write
contracts, access storage or cookies, inspect the parent DOM/opener, call arbitrary
servers or open external links. Never invent live data. Refuse specifications that
require capabilities absent from the supplied runtime guide; do not simulate them.
