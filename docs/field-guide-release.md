# Scrapy Field Guide and home map

This release replaces the sample landing feed with a six-destination interactive town directory. The home map is platform navigation; `/world` remains the map of published community modules.

## Release requirements

- Normal application merge and deployment only. No SQL migration, contract deployment, environment changes or Scrapy builder rerun.
- Do not enable wallet transactions as a side effect of releasing this UI. The transaction chapter distinguishes deployed infrastructure from confirmed production availability.
- Existing authentication, quotas, proposal rules, module artifacts and World positions are unchanged.

## Content and navigation

- `lib/field-guide.ts`: 15 chapters, sections, page links and short sharing descriptions.
- `app/docs`: server-rendered overview and pre-rendered chapters, search navigation, mobile chapter menu, table of contents, previous/next links and copy controls.
- `app/page.tsx`, `components/landville/home-city-map.tsx`, `app/home.css`: introduction, map, mayor introduction, first steps, builder summary and token explanation.
- The product sidebar includes Field Guide. The compact mobile dock is unchanged; open the menu to find the guide.
- Public text uses clear English. Styling uses LANDVILLE's dark surfaces, acid accents and mayor artwork.

## Maintenance

When changing token thresholds, quotas, voting or transaction capabilities, update the relevant guide chapter and review date. Keep implemented features, activation requirements and roadmap ideas separate. Do not advertise an unpublished module as live.

Verify links against actual routes; individual module and profile links are intentionally described as patterns, not fabricated example destinations. Keep copy-ready descriptions under the standard X post length.

## Checks

Run `npm run lint`, `npm test`, `npm run check:modules`, and `npm run build`.

Browser checks: six map links, mayor introduction, pause/resume, reduced-motion CSS, mobile navigation at narrow widths, guide search including no results, chapter selection closing the mobile menu, table overflow inside its scroll area, copying share text, and invalid-chapter 404.
