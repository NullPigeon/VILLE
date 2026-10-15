# LANDVILLE painted World

## Visual contract

The shared runtime direction is `lib/world-art-direction.ts`. Both Scrapy's
conversation instructions and the building-image request use it. Comic-style
module character generation also receives the direction; explicit citizen choices
such as pixel art or anime remain respected.

- Hand-painted, ink-outlined desert cyberpunk, inspired by Borderlands 2 and 3.
- Olive, aged cream, rust, charcoal and restrained acid-lime light.
- Warm light from upper left, three-quarter front view, consistent grounding.
- Distinct architecture: shape, entrance, roof, machinery and repair details follow
  the module's function. The five design categories are starting points only.
- Small personal agents are funny and varied: wheeled couriers, tracked workers,
  tiny round citizens and bigger grumpy-but-lovable mechanical brutes.
- Preserve the established mayor Scrapy mascot and its brand colors.
- No decorative crowds or fictional usable buildings painted into the terrain.

## Artwork and integration

Original artwork was created with the built-in image generation tool. No external
plugin or new runtime dependency was installed. Static assets do not call an image
model when visitors open World.

| Asset in `public/world-art` | Use |
| --- | --- |
| `buildings.png` | Five painted fallback exteriors for existing modules; the sixth image is unused |
| `citizens.png` | Scrap Scout, Roadrunner, Signal Rider |
| `agents.png` | All ten existing personal robot skin IDs, including a single-wheel courier and tracked chef |
| `homes.png` | Scrap Shack, Relay Garage, Lookout Tower |
| `desert.png` | One continuous terrain behind the real settlement |

Atlases remain intact. `PaintedSprite` crops them at render time, with an explicit
clip rectangle so adjacent cells cannot leak through aspect-ratio letterboxing.
Transparent alpha was checked in the delivered PNGs. Houses, robots and heroes
use shared components in World, yards and configuration screens.

## Scrapy's unique building workflow

1. A citizen and Scrapy define the function, district and distinctive exterior.
2. Citizens vote on the proposal using the existing governance flow.
3. An authenticated build admin requests an original building image through the
   existing building-art action. The configured OpenAI image model renders the
   proposal's visual brief, camera, materials and palette.
4. Draft artwork is reviewed before release. Only approved art attached to a
   published module is served by the public building-image endpoint.
5. Approved custom artwork replaces the fallback exterior automatically. Names
   remain live text on separate wooden neon signs rather than baked image text.

Scrapy does not generate images merely by saying he has done so in chat. The chat
brief remains below its existing 600-character storage limit. Generation needs
the existing image-provider configuration and consumes its configured API budget.

## Map behavior

- The camera covers the viewport with one terrain and clamps pan to its bounds.
  On narrow screens the rest of the landscape is reachable by panning.
- Districts have more separation; module rows reserve space for exterior signs.
- Actors retain their painted silhouettes at every zoom. Distant labels hide
  until hover/focus; there are no replacement dots or ovals.
- Saved positions that overlap architecture are displayed in nearby clear space.
  This is display placement, not a new pathfinding or authoritative physics system.
- The player uses a scoped `player-hero` class, avoiding the landing page's
  unrelated `.hero` height and padding.

## Deployment and checks

No new database migration is introduced by this artwork update. The unique
building-art and World-feature functionality still needs the migration from PR89:
`20261014213215_scrapy_world_features.sql`.

Previous migrations requested from PR83 onward, in chronological order:

1. `20261012120000_city_skills.sql`
2. `20261012121000_yard_features_and_robot_skins.sql`
3. `20261013120000_yard_shifts_and_home_upgrades.sql`
4. `20261014213215_scrapy_world_features.sql`

Check the target database's migration history before applying pending migrations.
This change does not execute any database migration.

Regression checks cover viewport bounds, building spacing, actor clearance, the
hero-class collision, removal of marker LOD, building-category selection and the
image prompt's database length limit. Existing API tests cover authentication and
approved-only public image access. A browser visual walkthrough is still required
after deployment; no automated browser validation was performed for this change.

## Generation recipes and provenance

All asset sheets were generated as original artwork in this task using built-in
image generation. Original outputs remain in the task's generated-images folder.

- Buildings: 3 by 2 atlas; gallery, saloon, radio town hall, avatar workshop, trading
  post and homestead; full facades, patched roofs, purpose-specific machinery;
  black ink, olive/cream/rust, lime lamps; transparent background, no labels.
  Selected source: exec-03338934-ed16-402e-be1f-0a2694da6239.png.
- Citizens: three full-body adults, Scout with rusty long coat and tools, courier
  with cream jacket and scarf, hooded radio engineer; realistic proportions,
  graphic cel shadows, transparent background.
  Selected source: exec-e900ecfa-5fed-4b22-ac26-195e38a99ea5.png.
- Homes: shack, relay garage and lookout tower, consistent front three-quarter
  camera and warm upper-left lighting; complete architecture, no scenery.
  Selected source: exec-e1fcbe3b-faf3-48d2-abf9-37d2c52ee5c6.png.
- Agents: the user's mayor-office image was the personality reference for visitors,
  not permission to replace the mayor. Ten skins were iterated to add a bulky
  mechanic, tracked cook, copper architect and single-wheel courier. The final
  edit requested large transparent gutters and preserved all ten identities.
  Selected source: exec-e58c3a6f-41c9-483c-9309-e707502d205e.png.
- Terrain: wide desert valley, cliffs along the outer margins, center 65% flat
  buildable ground, no people, buildings, objects, labels or HUD.
  Selected source: exec-c9bc4e68-cda9-4f44-aa17-b5b4245740d5.png.
