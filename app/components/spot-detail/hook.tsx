"use client";

import { useCallback, useEffect, useState } from "react";

import type { Spot } from "@/lib/spots";

/**
 * Pure resolver: id -> Spot lookup. Split out so it can be unit-tested without
 * React. Returns null for missing ids, empty lists, or null input.
 */
export function resolveSelectedSpot(
  spots: Spot[],
  id: string | null,
): Spot | null {
  if (!id) return null;
  return spots.find((s) => s.id === id) ?? null;
}

// Module-scoped cache so concurrent consumers (e.g. multiple SpotDetailPanel
// mounts across pages) hit the network at most once per app session.
let spotCache: Spot[] | null = null;
let spotPromise: Promise<Spot[]> | null = null;

export type SpotsFetcher = (url: string) => Promise<Spot[]>;

const defaultFetcher: SpotsFetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load spots: ${res.status}`);
  return (await res.json()) as Spot[];
};

/**
 * Client-side spots loader with module cache. Failures are NOT cached so a
 * transient network blip doesn't poison the rest of the session.
 */
export async function loadSpotsClient(
  fetcher: SpotsFetcher = defaultFetcher,
): Promise<Spot[]> {
  if (spotCache) return spotCache;
  if (spotPromise) return spotPromise;
  spotPromise = (async () => {
    try {
      const data = await fetcher("/spots.json");
      spotCache = data;
      return data;
    } finally {
      spotPromise = null;
    }
  })();
  return spotPromise;
}

export function __resetSpotCacheForTests(): void {
  spotCache = null;
  spotPromise = null;
}

export function __setSpotCacheForTests(spots: Spot[]): void {
  spotCache = spots;
  spotPromise = null;
}

export type UseSpotSelectionReturn = {
  selectedSpot: Spot | null;
  selectSpot: (id: string) => void;
  clearSelection: () => void;
};

/**
 * Owns the "which spot is open in the detail panel" state and lazily loads
 * the spot dataset client-side. Safe to mount in multiple places — the cache
 * and selection state are isolated per consumer, but the network call is shared.
 */
export function useSpotSelection(): UseSpotSelectionReturn {
  const [spots, setSpots] = useState<Spot[]>(() => spotCache ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // Cache hit was already consumed by the useState initializer; nothing to do.
    if (spotCache) return;
    let cancelled = false;
    loadSpotsClient()
      .then((data) => {
        if (!cancelled) setSpots(data);
      })
      .catch((err) => {
        // Surface in dev; don't crash the panel — selection just stays empty.
        console.error("spot-detail: failed to load spots", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectSpot = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
  }, []);

  return {
    selectedSpot: resolveSelectedSpot(spots, selectedId),
    selectSpot,
    clearSelection,
  };
}
