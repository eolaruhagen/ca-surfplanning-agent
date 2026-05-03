"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Map as MapGL,
  Marker,
  NavigationControl,
  Source,
  Layer,
} from "react-map-gl/mapbox";
import type { FeatureCollection, Feature } from "geojson";
import { useGeoPick } from "./hook";
import { buildCaliforniaMask } from "../map/buildMask";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const INITIAL_VIEW = {
  longitude: -119.5,
  latitude: 37,
  zoom: 5.4,
};

const CA_BOUNDS: [[number, number], [number, number]] = [
  [-125.0, 32.3],
  [-113.5, 42.2],
];

export type GeoPickVariant = "start" | "end";

interface GeoPickMapProps {
  variant: GeoPickVariant;
  /** Currently selected point (controlled from parent) */
  point: [number, number] | null;
  /** Called when user clicks a point on the map */
  onPick: (point: [number, number] | null) => void;
}

/**
 * GeoPickMap — a standalone MapGL instance for picking a single point.
 * Renders a colored pin, a reverse-geocoded label, and an animated bbox overlay.
 *
 * Does NOT modify CaliforniaMap — it uses the same underlying MapGL directly.
 */
export default function GeoPickMap({ variant, point, onPick }: GeoPickMapProps) {
  const { state, handleMapClick, clear } = useGeoPick(onPick);
  const [boundary, setBoundary] = useState<FeatureCollection | Feature | null>(null);

  // Load CA boundary for mask + outline
  useEffect(() => {
    fetch("/california.geojson")
      .then((r) => r.json())
      .then(setBoundary)
      .catch(() => {/* no-op */});
  }, []);

  const mask = useMemo(
    () => (boundary ? buildCaliforniaMask(boundary) : null),
    [boundary],
  );

  // Build a GeoJSON polygon from bbox [w,s,e,n] for the animated overlay
  const bboxGeoJSON = useMemo(() => {
    if (!state.bbox) return null;
    const [w, s, e, n] = state.bbox;
    return {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [w, s],
            [e, s],
            [e, n],
            [w, n],
            [w, s],
          ],
        ],
      },
      properties: {},
    };
  }, [state.bbox]);

  const pinColor = variant === "start" ? "#16a34a" : "#dc2626"; // green : red

  return (
    <div className="relative w-full h-full">
      {/* Place name label */}
      {(state.placeName || state.loading) && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 surface-pill px-4 py-2 text-sm text-stone-800 anim-fade-in max-w-xs text-center">
          {state.loading ? (
            <span className="text-stone-400">Locating…</span>
          ) : (
            <>
              <span>{state.placeName}</span>
              <button
                type="button"
                onClick={clear}
                className="ml-2 text-stone-400 hover:text-stone-700 text-xs"
              >
                ✕
              </button>
            </>
          )}
        </div>
      )}

      <MapGL
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={INITIAL_VIEW}
        minZoom={5}
        maxZoom={18}
        maxBounds={CA_BOUNDS}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
        onClick={handleMapClick}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* CA mask */}
        {mask && (
          <Source id="geo-ca-mask" type="geojson" data={mask}>
            <Layer
              id="geo-ca-mask-fill"
              type="fill"
              paint={{ "fill-color": "#fafaf7", "fill-opacity": 0.85 }}
            />
          </Source>
        )}

        {/* CA outline */}
        {boundary && (
          <Source id="geo-ca-outline" type="geojson" data={boundary as FeatureCollection}>
            <Layer
              id="geo-ca-outline-line"
              type="line"
              paint={{ "line-color": "#1c1917", "line-width": 1, "line-opacity": 0.5 }}
            />
          </Source>
        )}

        {/* Bbox fill + line overlay */}
        {bboxGeoJSON && (
          <Source id="geo-bbox" type="geojson" data={bboxGeoJSON}>
            <Layer
              id="geo-bbox-fill"
              type="fill"
              paint={{
                "fill-color": pinColor,
                "fill-opacity": 0.06,
              }}
            />
            <Layer
              id="geo-bbox-line"
              type="line"
              paint={{
                "line-color": pinColor,
                "line-width": 1.5,
                "line-opacity": 0.6,
                "line-dasharray": [4, 3],
              }}
            />
          </Source>
        )}

        {/* Pin marker */}
        {state.pin && (
          <Marker
            longitude={state.pin[0]}
            latitude={state.pin[1]}
            anchor="bottom"
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50% 50% 50% 0",
                background: pinColor,
                transform: "rotate(-45deg)",
                border: "2px solid white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            />
          </Marker>
        )}
      </MapGL>
    </div>
  );
}
