export type MapPoint = { x: number; y: number };
export type MapFootprint = { left: number; top: number; right: number; bottom: number };

/** Cover the viewport with one terrain, never a second image behind its edges. */
export function worldMinimumZoom(width: number, height: number, mapWidth: number, mapHeight: number) {
  return Math.max(.06, width / mapWidth, height / mapHeight);
}

export function worldCamera(x: number, y: number, zoom: number, width: number, height: number, mapWidth: number, mapHeight: number) {
  const scale = Math.max(worldMinimumZoom(width, height, mapWidth, mapHeight), zoom);
  return { x: Math.max(Math.min(0, width - mapWidth * scale), Math.min(0, x)),
    y: Math.max(Math.min(0, height - mapHeight * scale), Math.min(0, y)), zoom: scale };
}

export function buildingPosition(index: number, count: number, district: MapPoint & { id: string }, width: number, height: number): MapPoint {
  if (district.id === 'townwide') {
    const slots = [[0, -330], [0, 350], [-490, 0], [490, 0]];
    const [x, y] = slots[index % slots.length];
    const tier = 1 + Math.floor(index / slots.length);
    return { x: width / 2 + x * tier, y: height / 2 + y * tier };
  }
  const row = Math.floor(index / 2);
  const columns = Math.min(2, count - row * 2);
  return { x: width * district.x / 100 + (index % 2 - (columns - 1) / 2) * 560,
    y: height * district.y / 100 + (row - (Math.ceil(count / 2) - 1) / 2) * 450 };
}

/** Display actors in nearby walking space rather than on a roof or a nameplate. */
export function walkingPosition(point: MapPoint, occupied: readonly MapFootprint[], width: number, height: number): MapPoint {
  const clamp = ({ x, y }: MapPoint) => ({ x: Math.max(45, Math.min(width - 45, x)), y: Math.max(95, Math.min(height - 35, y)) });
  const free = ({ x, y }: MapPoint) => !occupied.some(rect => x > rect.left - 28 && x < rect.right + 28 && y > rect.top - 15 && y < rect.bottom + 90);
  const origin = clamp(point);
  if (free(origin)) return origin;
  for (let radius = 65; radius <= 1300; radius += 65) {
    for (let step = 0; step < 16; step++) {
      const angle = Math.PI / 2 + step * Math.PI / 8;
      const candidate = clamp({ x: origin.x + Math.cos(angle) * radius, y: origin.y + Math.sin(angle) * radius });
      if (free(candidate)) return candidate;
    }
  }
  return origin;
}
