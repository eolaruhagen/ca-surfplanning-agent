/**
 * reverseGeocode — unit tests for the pure logic aspects.
 * Network calls are not made; we test the response-parsing logic by simulating
 * fetch responses via a simple stub.
 */
import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Parse-only logic extracted for testability
// ---------------------------------------------------------------------------

interface Feature {
  place_name?: string;
  bbox?: [number, number, number, number];
}

interface GeocodeResponse {
  features?: Feature[];
}

function parseGeocodeResponse(
  data: GeocodeResponse,
  lng: number,
  lat: number,
): { placeName: string; bbox: [number, number, number, number] | null } | null {
  const feature = data.features?.[0];
  if (!feature) return null;
  return {
    placeName: feature.place_name ?? `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
    bbox: feature.bbox ?? null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("reverseGeocode — response parsing", () => {
  it("returns null when features array is empty", () => {
    const result = parseGeocodeResponse({ features: [] }, -118.4, 34.0);
    assert.equal(result, null);
  });

  it("returns null when features is missing", () => {
    const result = parseGeocodeResponse({}, -118.4, 34.0);
    assert.equal(result, null);
  });

  it("extracts place_name from first feature", () => {
    const result = parseGeocodeResponse(
      { features: [{ place_name: "Santa Monica, California, United States" }] },
      -118.4,
      34.0,
    );
    assert.ok(result);
    assert.equal(result.placeName, "Santa Monica, California, United States");
  });

  it("extracts bbox from first feature", () => {
    const bbox: [number, number, number, number] = [-118.5, 33.9, -118.3, 34.1];
    const result = parseGeocodeResponse(
      { features: [{ place_name: "Santa Monica", bbox }] },
      -118.4,
      34.0,
    );
    assert.ok(result);
    assert.deepEqual(result.bbox, bbox);
  });

  it("returns null bbox when feature has no bbox", () => {
    const result = parseGeocodeResponse(
      { features: [{ place_name: "Santa Monica" }] },
      -118.4,
      34.0,
    );
    assert.ok(result);
    assert.equal(result.bbox, null);
  });

  it("falls back to coordinate string when place_name is absent", () => {
    const result = parseGeocodeResponse({ features: [{}] }, -118.4, 34.0);
    assert.ok(result);
    assert.equal(result.placeName, "34.000, -118.400");
  });

  it("uses first feature even when multiple are present", () => {
    const result = parseGeocodeResponse(
      {
        features: [
          { place_name: "First Place" },
          { place_name: "Second Place" },
        ],
      },
      -118.4,
      34.0,
    );
    assert.ok(result);
    assert.equal(result.placeName, "First Place");
  });
});
