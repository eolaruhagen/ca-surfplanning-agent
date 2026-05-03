export function normalizeDeg(deg: number): number {
  const m = deg % 360;
  return m < 0 ? m + 360 : m;
}

export function directionInRange(deg: number, min: number, max: number): boolean {
  const d = normalizeDeg(deg);
  const lo = normalizeDeg(min);
  const hi = normalizeDeg(max);
  return lo <= hi ? d >= lo && d <= hi : d >= lo || d <= hi;
}

export function angularDelta(a: number, b: number): number {
  const d = Math.abs(normalizeDeg(a) - normalizeDeg(b));
  return d > 180 ? 360 - d : d;
}

export function directionDistance(deg: number, range: [number, number]): number {
  if (directionInRange(deg, range[0], range[1])) return 0;
  return Math.min(angularDelta(deg, range[0]), angularDelta(deg, range[1]));
}

const EARTH_R_MI = 3958.8;
export function haversineMiles(a: [number, number], b: [number, number]): number {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R_MI * Math.asin(Math.min(1, Math.sqrt(s)));
}
