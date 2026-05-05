"use client";

import { useEffect, useMemo, useState } from "react";
import type { LineString } from "geojson";

export type RoadLeg = {
  index: number;
  geometry: LineString;
  distanceMiles?: number;
  durationMinutes?: number;
};

export type RoadDirectionsStatus = "idle" | "loading" | "ready" | "error";

export type RoadDirectionsState = {
  status: RoadDirectionsStatus;
  legs: RoadLeg[];
  error: string | null;
};

type LonLat = [number, number];

type LegPair = { index: number; from: LonLat; to: LonLat };

const METERS_PER_MILE = 1609.344;

export function buildLegPairs(waypoints: LonLat[]): LegPair[] {
  if (waypoints.length < 2) return [];
  const pairs: LegPair[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    pairs.push({ index: i, from: waypoints[i], to: waypoints[i + 1] });
  }
  return pairs;
}

export function buildDirectionsUrl(
  from: LonLat,
  to: LonLat,
  token: string,
): string {
  const coords = `${from[0]},${from[1]};${to[0]},${to[1]}`;
  const params = new URLSearchParams({
    access_token: token,
    geometries: "geojson",
    overview: "full",
  });
  return `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?${params.toString()}`;
}

type ParseResult =
  | {
      ok: true;
      data: {
        geometry: LineString;
        distanceMiles?: number;
        durationMinutes?: number;
      };
    }
  | { ok: false; error: string };

export function parseDirectionsLeg(json: unknown): ParseResult {
  if (!json || typeof json !== "object") {
    return { ok: false, error: "Empty response" };
  }
  const routes = (json as { routes?: unknown[] }).routes;
  if (!Array.isArray(routes) || routes.length === 0) {
    return { ok: false, error: "No routes in response" };
  }
  const route = routes[0] as {
    geometry?: { type?: string; coordinates?: unknown };
    legs?: Array<{ distance?: number; duration?: number }>;
  };
  const geom = route.geometry;
  if (
    !geom ||
    geom.type !== "LineString" ||
    !Array.isArray(geom.coordinates)
  ) {
    return { ok: false, error: "Missing or non-LineString geometry" };
  }
  const lineString: LineString = {
    type: "LineString",
    coordinates: geom.coordinates as number[][],
  };
  const firstLeg = route.legs?.[0];
  return {
    ok: true,
    data: {
      geometry: lineString,
      distanceMiles:
        typeof firstLeg?.distance === "number"
          ? firstLeg.distance / METERS_PER_MILE
          : undefined,
      durationMinutes:
        typeof firstLeg?.duration === "number"
          ? firstLeg.duration / 60
          : undefined,
    },
  };
}

export async function fetchRoadLegs(
  waypoints: LonLat[],
  token: string,
  signal?: AbortSignal,
): Promise<RoadDirectionsState> {
  const pairs = buildLegPairs(waypoints);
  if (pairs.length === 0) {
    return { status: "ready", legs: [], error: null };
  }
  if (!token) {
    return {
      status: "error",
      legs: [],
      error: "Missing Mapbox access token",
    };
  }
  try {
    const results = await Promise.all(
      pairs.map(async (pair) => {
        const url = buildDirectionsUrl(pair.from, pair.to, token);
        const res = await fetch(url, { signal });
        if (!res.ok) {
          throw new Error(
            `Directions API ${res.status} for leg ${pair.index}`,
          );
        }
        const json = await res.json();
        const parsed = parseDirectionsLeg(json);
        if (!parsed.ok) {
          throw new Error(
            `Leg ${pair.index} parse failed: ${parsed.error}`,
          );
        }
        return { index: pair.index, ...parsed.data } satisfies RoadLeg;
      }),
    );
    results.sort((a, b) => a.index - b.index);
    return { status: "ready", legs: results, error: null };
  } catch (err) {
    return {
      status: "error",
      legs: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// JSON-stable key so the effect re-runs only when waypoints actually change
// (parent rebuilds the array on every render even if values are identical).
function waypointsKey(wps: LonLat[]): string {
  return wps.map((w) => `${w[0]},${w[1]}`).join("|");
}

export function useRoadDirections(
  waypoints: LonLat[],
  token: string,
): RoadDirectionsState {
  const key = useMemo(() => waypointsKey(waypoints), [waypoints]);
  const [state, setState] = useState<RoadDirectionsState>({
    status: "idle",
    legs: [],
    error: null,
  });

  useEffect(() => {
    if (waypoints.length < 2) {
      setState({ status: "ready", legs: [], error: null });
      return;
    }
    const ctrl = new AbortController();
    let cancelled = false;
    setState({ status: "loading", legs: [], error: null });
    fetchRoadLegs(waypoints, token, ctrl.signal).then((next) => {
      if (cancelled) return;
      setState(next);
    });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
    // waypoints reference may change every render; key is the stable signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, token]);

  return state;
}
