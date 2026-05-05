import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import {
  buildLegPairs,
  buildDirectionsUrl,
  parseDirectionsLeg,
  fetchRoadLegs,
} from "./use-road-directions";

const TOKEN = "pk.test";

describe("buildLegPairs", () => {
  it("returns [] for fewer than 2 waypoints", () => {
    assert.deepEqual(buildLegPairs([]), []);
    assert.deepEqual(buildLegPairs([[-122, 37]]), []);
  });

  it("returns N-1 pairs for N waypoints", () => {
    const wps: Array<[number, number]> = [
      [-122, 37],
      [-121, 36],
      [-120, 35],
      [-119, 34],
    ];
    const pairs = buildLegPairs(wps);
    assert.equal(pairs.length, 3);
    assert.deepEqual(pairs[0], { index: 0, from: [-122, 37], to: [-121, 36] });
    assert.deepEqual(pairs[2], { index: 2, from: [-120, 35], to: [-119, 34] });
  });

  it("handles 25+ waypoints (no cap because each call is one pair)", () => {
    const wps: Array<[number, number]> = Array.from(
      { length: 30 },
      (_, i) => [-122 + i * 0.1, 37 + i * 0.05] as [number, number],
    );
    const pairs = buildLegPairs(wps);
    assert.equal(pairs.length, 29);
  });
});

describe("buildDirectionsUrl", () => {
  it("encodes lon,lat;lon,lat with token + geojson overview", () => {
    const url = buildDirectionsUrl([-122.5, 37.76], [-119.48, 34.37], TOKEN);
    assert.match(
      url,
      /^https:\/\/api\.mapbox\.com\/directions\/v5\/mapbox\/driving\/-122\.5,37\.76;-119\.48,34\.37\?/,
    );
    assert.match(url, /access_token=pk\.test/);
    assert.match(url, /geometries=geojson/);
    assert.match(url, /overview=full/);
  });
});

describe("parseDirectionsLeg", () => {
  it("extracts geometry, distance miles, duration minutes from a successful response", () => {
    const json = {
      routes: [
        {
          geometry: {
            type: "LineString",
            coordinates: [
              [-122.5, 37.76],
              [-122.0, 37.5],
              [-119.48, 34.37],
            ],
          },
          legs: [{ distance: 16093.4, duration: 3600 }],
        },
      ],
    };
    const parsed = parseDirectionsLeg(json);
    assert.ok(parsed.ok);
    if (!parsed.ok) return;
    assert.equal(parsed.data.geometry.type, "LineString");
    assert.equal(parsed.data.geometry.coordinates.length, 3);
    assert.ok(Math.abs(parsed.data.distanceMiles! - 10) < 0.1);
    assert.equal(parsed.data.durationMinutes, 60);
  });

  it("returns ok=false on missing routes", () => {
    const parsed = parseDirectionsLeg({ routes: [] });
    assert.equal(parsed.ok, false);
  });

  it("returns ok=false on non-LineString geometry", () => {
    const parsed = parseDirectionsLeg({
      routes: [{ geometry: { type: "Point", coordinates: [0, 0] } }],
    });
    assert.equal(parsed.ok, false);
  });
});

describe("fetchRoadLegs", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restoreAll();
  });

  function makeMockResponse(coords: Array<[number, number]>) {
    return {
      ok: true,
      json: async () => ({
        routes: [
          {
            geometry: { type: "LineString", coordinates: coords },
            legs: [{ distance: 1609.34, duration: 600 }],
          },
        ],
      }),
    } as Response;
  }

  it("fires one fetch per leg (N-1 fetches for N waypoints)", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      calls.push(typeof url === "string" ? url : url.toString());
      return makeMockResponse([
        [-122, 37],
        [-121, 36],
      ]);
    }) as typeof globalThis.fetch;

    const wps: Array<[number, number]> = [
      [-122, 37],
      [-121, 36],
      [-120, 35],
      [-119, 34],
    ];
    const result = await fetchRoadLegs(wps, TOKEN);
    assert.equal(result.status, "ready");
    assert.equal(result.legs.length, 3);
    assert.equal(calls.length, 3);
    assert.match(calls[0], /-122,37;-121,36/);
    assert.match(calls[1], /-121,36;-120,35/);
    assert.match(calls[2], /-120,35;-119,34/);
  });

  it("preserves leg index ordering even if fetches resolve out of order", async () => {
    let callIdx = 0;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const myIdx = callIdx++;
      const urlStr = typeof url === "string" ? url : url.toString();
      const delay = myIdx === 0 ? 30 : 5;
      await new Promise((r) => setTimeout(r, delay));
      const match = urlStr.match(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?);(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
      assert.ok(match);
      const a: [number, number] = [Number(match[1]), Number(match[2])];
      const b: [number, number] = [Number(match[3]), Number(match[4])];
      return makeMockResponse([a, b]);
    }) as typeof globalThis.fetch;

    const wps: Array<[number, number]> = [
      [-122, 37],
      [-121, 36],
      [-120, 35],
    ];
    const result = await fetchRoadLegs(wps, TOKEN);
    assert.equal(result.status, "ready");
    assert.equal(result.legs.length, 2);
    assert.equal(result.legs[0].index, 0);
    assert.equal(result.legs[1].index, 1);
    assert.deepEqual(result.legs[0].geometry.coordinates[0], [-122, 37]);
    assert.deepEqual(result.legs[1].geometry.coordinates[0], [-121, 36]);
  });

  it("returns status='error' when fetch rejects, no crash", async () => {
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as typeof globalThis.fetch;

    const result = await fetchRoadLegs(
      [
        [-122, 37],
        [-121, 36],
      ],
      TOKEN,
    );
    assert.equal(result.status, "error");
    assert.equal(result.legs.length, 0);
    assert.match(result.error ?? "", /network down/);
  });

  it("returns status='error' when API returns non-ok response", async () => {
    globalThis.fetch = (async () =>
      ({
        ok: false,
        status: 422,
        json: async () => ({ message: "Invalid token" }),
      }) as Response) as typeof globalThis.fetch;

    const result = await fetchRoadLegs(
      [
        [-122, 37],
        [-121, 36],
      ],
      TOKEN,
    );
    assert.equal(result.status, "error");
  });

  it("returns status='ready' with empty legs for fewer than 2 waypoints", async () => {
    let called = 0;
    globalThis.fetch = (async () => {
      called++;
      return makeMockResponse([]);
    }) as typeof globalThis.fetch;

    const result = await fetchRoadLegs([[-122, 37]], TOKEN);
    assert.equal(result.status, "ready");
    assert.equal(result.legs.length, 0);
    assert.equal(called, 0);
  });

  it("returns status='error' when token is empty", async () => {
    let called = 0;
    globalThis.fetch = (async () => {
      called++;
      return makeMockResponse([]);
    }) as typeof globalThis.fetch;

    const result = await fetchRoadLegs(
      [
        [-122, 37],
        [-121, 36],
      ],
      "",
    );
    assert.equal(result.status, "error");
    assert.equal(called, 0);
  });
});
