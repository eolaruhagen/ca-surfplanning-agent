"use client";

import { useState, useCallback, useRef } from "react";
import type { MapMouseEvent } from "react-map-gl/mapbox";
import { reverseGeocode } from "./helpers/reverse-geocode";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export interface GeoPickState {
  pin: [number, number] | null;
  placeName: string | null;
  bbox: [number, number, number, number] | null;
  loading: boolean;
}

export interface UseGeoPickReturn {
  state: GeoPickState;
  handleMapClick: (e: MapMouseEvent) => void;
  clear: () => void;
}

/**
 * useGeoPick — manages a single map pin with reverse geocoding.
 * Calls `onPick` whenever a new point is selected.
 */
export function useGeoPick(
  onPick: (point: [number, number] | null) => void,
): UseGeoPickReturn {
  const [state, setState] = useState<GeoPickState>({
    pin: null,
    placeName: null,
    bbox: null,
    loading: false,
  });

  // Prevent stale closes in concurrent geocode calls
  const requestIdRef = useRef(0);

  const handleMapClick = useCallback(
    async (e: MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      const point: [number, number] = [lng, lat];
      const reqId = ++requestIdRef.current;

      setState({ pin: point, placeName: null, bbox: null, loading: true });
      onPick(point);

      const result = await reverseGeocode(lng, lat, MAPBOX_TOKEN);
      if (requestIdRef.current !== reqId) return; // superseded

      setState({
        pin: point,
        placeName: result?.placeName ?? null,
        bbox: result?.bbox ?? null,
        loading: false,
      });
    },
    [onPick],
  );

  const clear = useCallback(() => {
    requestIdRef.current++;
    setState({ pin: null, placeName: null, bbox: null, loading: false });
    onPick(null);
  }, [onPick]);

  return { state, handleMapClick, clear };
}
