import type { TripDayMarker } from "@/lib/spots";

export type ClusteredTripDay = {
  spotId: string;
  dayIndex: number;
  offset: [number, number];
  label?: string;
};

/**
 * Fan-cluster trip-day markers that share a spot.
 *
 * - Single entry per spot → offset [0, 0] (no visual change).
 * - 2+ entries → fan around a 14px ring; first entry at top (angle = -π/2),
 *   remaining entries spread clockwise. Sorted by dayIndex within a cluster.
 *
 * Pixel offsets are zoom-invariant (Mapbox Marker `offset` prop), so the
 * cluster keeps a constant visual size as the user zooms.
 */
export function clusterTripDays(
  tripDays: TripDayMarker[],
): ClusteredTripDay[] {
  if (tripDays.length === 0) return [];

  const radius = 14;

  // Group by spotId, preserving first-seen order so output is deterministic.
  const groups = new Map<string, TripDayMarker[]>();
  for (const td of tripDays) {
    const arr = groups.get(td.spotId);
    if (arr) arr.push(td);
    else groups.set(td.spotId, [td]);
  }

  const out: ClusteredTripDay[] = [];
  for (const [spotId, members] of groups) {
    const sorted = [...members].sort((a, b) => a.dayIndex - b.dayIndex);
    const n = sorted.length;
    if (n === 1) {
      const m = sorted[0];
      out.push({
        spotId,
        dayIndex: m.dayIndex,
        offset: [0, 0],
        label: m.label,
      });
      continue;
    }
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const dx = radius * Math.cos(angle);
      const dy = radius * Math.sin(angle);
      const m = sorted[i];
      out.push({
        spotId,
        dayIndex: m.dayIndex,
        offset: [dx, dy],
        label: m.label,
      });
    }
  }

  return out;
}
