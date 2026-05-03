import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";

export function buildCaliforniaMask(
  californiaGeoJson: Feature | FeatureCollection,
): Feature<Polygon> {
  const world: number[][] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];

  const features: Feature[] =
    californiaGeoJson.type === "FeatureCollection"
      ? californiaGeoJson.features
      : [californiaGeoJson];

  const holes: number[][][] = [];
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "Polygon") {
      holes.push((g as Polygon).coordinates[0]);
    } else if (g.type === "MultiPolygon") {
      for (const poly of (g as MultiPolygon).coordinates) {
        holes.push(poly[0]);
      }
    }
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [world, ...holes],
    },
  };
}
