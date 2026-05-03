import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractRouteFeatures } from "./route-utils";

describe("extractRouteFeatures", () => {
  it("returns null for nullish / non-object input", () => {
    assert.equal(extractRouteFeatures(null), null);
    assert.equal(extractRouteFeatures(undefined), null);
    assert.equal(extractRouteFeatures(42), null);
    assert.equal(extractRouteFeatures("nope"), null);
  });

  it("returns null when the input is not a FeatureCollection", () => {
    assert.equal(
      extractRouteFeatures({ type: "Feature", geometry: null, properties: {} }),
      null,
    );
    assert.equal(extractRouteFeatures({ type: "FeatureCollection" }), null);
  });

  it("returns null when no LineString features are present", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { kind: "session" },
          geometry: { type: "Point", coordinates: [-122, 37] },
        },
      ],
    };
    assert.equal(extractRouteFeatures(fc), null);
  });

  it("keeps LineString features tagged kind='route'", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { kind: "session" },
          geometry: { type: "Point", coordinates: [-122, 37] },
        },
        {
          type: "Feature",
          properties: { kind: "route" },
          geometry: {
            type: "LineString",
            coordinates: [
              [-122, 37],
              [-118, 34],
            ],
          },
        },
      ],
    };
    const out = extractRouteFeatures(fc);
    assert.ok(out);
    assert.equal(out!.features.length, 1);
    assert.equal(out!.features[0].geometry.type, "LineString");
  });

  it("keeps untagged LineString features", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [-122, 37],
              [-118, 34],
            ],
          },
        },
      ],
    };
    const out = extractRouteFeatures(fc);
    assert.ok(out);
    assert.equal(out!.features.length, 1);
  });

  it("supports MultiLineString", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { kind: "route" },
          geometry: {
            type: "MultiLineString",
            coordinates: [
              [
                [-122, 37],
                [-121, 36.5],
              ],
              [
                [-120, 35],
                [-118, 34],
              ],
            ],
          },
        },
      ],
    };
    const out = extractRouteFeatures(fc);
    assert.ok(out);
    assert.equal(out!.features.length, 1);
    assert.equal(out!.features[0].geometry.type, "MultiLineString");
  });

  it("filters out LineStrings tagged kind != 'route'", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { kind: "boundary" },
          geometry: {
            type: "LineString",
            coordinates: [
              [-122, 37],
              [-121, 36],
            ],
          },
        },
      ],
    };
    assert.equal(extractRouteFeatures(fc), null);
  });
});
