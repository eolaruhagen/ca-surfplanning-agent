"use client";

import { useCallback, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/mapbox";

import type { Spot } from "@/lib/spots";

/**
 * Inputs for {@link useCaliforniaMap}.
 *
 * The hook owns all selection + camera-fly behavior. CaliforniaMap.tsx is a
 * render-only consumer of the returned values. See `hook.test.tsx` for the
 * behavioral contract; everything testable about the map's interactive state
 * lives here, not in the component.
 */
export type UseCaliforniaMapProps = {
  /** Spots that drive `findSpot` lookups. */
  spots: Spot[];
  /** Controlled selection. If `undefined`, the hook self-manages selection. */
  selectedSpotId?: string | null;
  /** Fires after every selection change (including programmatic clears). */
  onSpotSelect?: (spotId: string | null, spot: Spot | null) => void;
};

export type UseCaliforniaMapReturn = {
  /** Attach to `<MapGL ref={...}>` so the hook can drive `flyTo`. */
  setMapRef: (r: MapRef | null) => void;
  /** True when the parent passed `selectedSpotId` (even `null`). */
  isControlled: boolean;
  /** The currently-selected id, controlled or internal. */
  effectiveSelectedId: string | null;
  /** The Spot record for `effectiveSelectedId`, or null. */
  selectedSpot: Spot | null;
  /** User-facing selection handler (list click, marker click). */
  handleSelect: (id: string | null) => void;
};

/**
 * Resolves which selection id is "live": controlled wins if defined.
 * Pure: split out so it can be unit-tested without React.
 */
export function resolveSelection(
  controlled: string | null | undefined,
  internal: string | null,
): { isControlled: boolean; effectiveSelectedId: string | null } {
  const isControlled = controlled !== undefined;
  return {
    isControlled,
    effectiveSelectedId: isControlled ? (controlled ?? null) : internal,
  };
}

/** Pure spot lookup. Returns `null` for missing or null id. */
export function findSpot(spots: Spot[], id: string | null): Spot | null {
  if (!id) return null;
  return spots.find((s) => s.id === id) ?? null;
}

/**
 * Minimal subset of MapRef the hook actually calls. Lets tests pass a stub
 * without instantiating Mapbox.
 */
export type FlyableMap = {
  flyTo: (opts: {
    center: [number, number];
    zoom: number;
    duration?: number;
    essential?: boolean;
  }) => void;
  getZoom?: () => number;
};

/**
 * Pure factory that produces the selection handler. Extracted so tests can
 * assert behavior (setInternal called or not, onSpotSelect args, flyTo args)
 * without rendering React.
 */
export function createSelectionHandler(opts: {
  spots: Spot[];
  isControlled: boolean;
  setInternal: (id: string | null) => void;
  onSpotSelect?: (spotId: string | null, spot: Spot | null) => void;
  getMap: () => FlyableMap | null;
}): (id: string | null) => void {
  const { spots, isControlled, setInternal, onSpotSelect, getMap } = opts;
  return (id: string | null) => {
    const spot = findSpot(spots, id);
    if (!isControlled) setInternal(id);
    onSpotSelect?.(id, spot);

    const map = getMap();
    if (spot && map) {
      const currentZoom = map.getZoom?.() ?? 6;
      map.flyTo({
        center: [spot.lon, spot.lat],
        zoom: Math.max(currentZoom, 11),
        duration: 900,
        essential: true,
      });
    }
  };
}

export function useCaliforniaMap(
  props: UseCaliforniaMapProps,
): UseCaliforniaMapReturn {
  const { spots, selectedSpotId, onSpotSelect } = props;

  const mapRef = useRef<MapRef | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null,
  );

  const { isControlled, effectiveSelectedId } = resolveSelection(
    selectedSpotId,
    internalSelectedId,
  );

  const selectedSpot = findSpot(spots, effectiveSelectedId);

  const handleSelect = useCallback(
    (id: string | null) => {
      const handler = createSelectionHandler({
        spots,
        isControlled,
        setInternal: setInternalSelectedId,
        onSpotSelect,
        getMap: () => mapRef.current,
      });
      handler(id);
    },
    [spots, isControlled, onSpotSelect],
  );

  const setMapRef = useCallback((r: MapRef | null) => {
    mapRef.current = r;
  }, []);

  return {
    setMapRef,
    isControlled,
    effectiveSelectedId,
    selectedSpot,
    handleSelect,
  };
}
