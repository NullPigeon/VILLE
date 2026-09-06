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

## Avoid

- generic hacker UI, Matrix rain, random scanlines or glitch bars
- centered avatar inside a neon targeting circle
- gratuitous words such as CEREMONIAL, NODE, RELIC, SIGNAL or PROTOCOL
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
inline CSS, inline SVG, transient JavaScript and one worker-injected generated image.
It cannot call runtime networks, wallets, storage, cookies, parent/opener APIs,
servers or external links. Refuse specifications that require those capabilities;
do not simulate them with fake data.
