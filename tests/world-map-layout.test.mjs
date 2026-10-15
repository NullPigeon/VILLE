import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { worldMinimumZoom, worldCamera, buildingPosition, walkingPosition } from '../lib/world-map-layout.ts';

void test('zoom-out and camera bounds cover wide and narrow viewports with one map', () => {
  for (const [width, height] of [[1660, 800], [390, 844], [2560, 1080]]) {
    const min = worldMinimumZoom(width, height, 5200, 2800);
    assert.ok(5200 * min >= width - .001 && 2800 * min >= height - .001);
    const topLeft = worldCamera(9999, 9999, .01, width, height, 5200, 2800);
    const bottomRight = worldCamera(-9999, -9999, .01, width, height, 5200, 2800);
    assert.equal(topLeft.x, 0);
    assert.equal(topLeft.y, 0);
    assert.ok(Math.abs(bottomRight.x + 5200 * min - width) < .001);
    assert.ok(Math.abs(bottomRight.y + 2800 * min - height) < .001);
  }
});

void test('module rows leave room for both architecture and freestanding signs', () => {
  const district = { id: 'dump', x: 36, y: 34 };
  for (const count of [1, 3, 8]) {
    const points = Array.from({ length: count }, (_, i) => buildingPosition(i, count, district, 5200, 3800));
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      const a = points[i], b = points[j];
      assert.ok(Math.abs(a.x - b.x) >= 500 || Math.abs(a.y - b.y) >= 400);
    }
  }
});

void test('actors stay in walkable space, including after restoring a saved position on a building', () => {
  const footprint = { left: 1000, right: 1450, top: 800, bottom: 1120 };
  const point = { x: 1220, y: 900 };
  const placed = walkingPosition(point, [footprint], 5200, 2800);
  assert.ok(placed.x <= 972 || placed.x >= 1478 || placed.y <= 785 || placed.y >= 1210);
  assert.deepEqual(placed, walkingPosition(point, [footprint], 5200, 2800));
  assert.deepEqual(walkingPosition({ x: 500, y: 500 }, [footprint], 5200, 2800), { x: 500, y: 500 });
});

void test('map actors cannot inherit the landing hero or regress into dot LOD', () => {
  const page = fs.readFileSync(new URL('../app/world/page.tsx', import.meta.url), 'utf8');
  assert.ok(!page.includes('world-game-actor hero'));
  assert.ok(page.includes('world-game-actor player-hero'));
  for (const file of ['world-living-map.css', 'world-revision.css']) {
    const css = fs.readFileSync(new URL(`../app/world/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(css, /map-(?:far|mid)[^{]*world-game-actor[^}]*border-radius:50%/);
  }
});
