import type { Feature, FeatureCollection } from "geojson";

/**
 * Extract LineString / MultiLineString features (the driving route) from
 * the backend's `trip.route_geojson` FeatureCollection.
 *
 * Backend ships per-session `Point` features alongside one LineString tagged
 * `properties.kind === 'route'`. The trip-view renders the route line, while
 * pins are rendered separately from `flatSessions`.
 *
 * Returns `null` if the input is malformed or contains no line features so
 * the caller can short-circuit Source/Layer rendering.
 */
export function extractRouteFeatures(raw: unknown): FeatureCollection | null {
  if (!raw || typeof raw !== "object") return null;
  const fc = raw as FeatureCollection;
  if (fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    return null;
  }
  const lines = fc.features.filter((f: Feature) => {
    if (!f.geometry) return false;
    const t = f.geometry.type;
    if (t !== "LineString" && t !== "MultiLineString") return false;
    const kind = (f.properties as { kind?: string } | null)?.kind;
    return kind === undefined || kind === "route";
  });
  if (lines.length === 0) return null;
  return { type: "FeatureCollection", features: lines };
}
