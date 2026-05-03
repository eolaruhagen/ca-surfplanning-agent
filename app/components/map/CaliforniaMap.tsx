"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Map as MapGL,
  Marker,
  NavigationControl,
  Source,
  Layer,
} from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import type { Feature, FeatureCollection } from "geojson";

import {
  skillColor,
  type Spot,
  type MapOverlay,
} from "@/lib/spots";
import { buildCaliforniaMask } from "./buildMask";
import SpotList from "./SpotList";
import SpotDetail from "./SpotDetail";
import { useCaliforniaMap } from "./hook";

/**
 * Public contract for CaliforniaMap.
 *
 * The component is intentionally controlled-from-outside-when-needed:
 * pass `selectedSpotId` / `onSpotSelect` to drive selection from a parent
 * (e.g. the trip-planning agent), or omit them to let the map self-manage.
 *
 * `overlay` lets the agent paint trip days, highlight a subset, or render
 * a route polyline without re-rendering the map shell.
 */
export type CaliforniaMapProps = {
  /** Override the bundled /spots.json — useful for filtering or scoring. */
  spots?: Spot[];
  /** Controlled selection. If undefined, internal state takes over. */
  selectedSpotId?: string | null;
  /** Fires whenever the user picks a spot (list click or marker click). */
  onSpotSelect?: (spotId: string | null, spot: Spot | null) => void;
  /** Optional overlay state for highlighting / trip rendering. */
  overlay?: MapOverlay;
  /** Show or hide the left-side spot list. Defaults to true. */
  showSpotList?: boolean;
  /** Show or hide the right-side detail panel. Defaults to true. */
  showSpotDetail?: boolean;
  /** Override the page header. Pass null to hide. */
  header?: React.ReactNode;
  /** Called once when the Mapbox MapRef is ready. Use for imperative flyTo / terrain. */
  onMapReady?: (map: MapRef) => void;
};

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const INITIAL_VIEW = {
  longitude: -119.5,
  latitude: 37,
  zoom: 5.4,
};

const CA_BOUNDS: [[number, number], [number, number]] = [
  [-125.0, 32.3],
  [-113.5, 42.2],
];

export default function CaliforniaMap(props: CaliforniaMapProps) {
  const {
    spots: spotsProp,
    selectedSpotId,
    onSpotSelect,
    overlay,
    showSpotList = true,
    showSpotDetail = true,
    header,
    onMapReady,
  } = props;

  const [boundary, setBoundary] = useState<FeatureCollection | Feature | null>(
    null,
  );
  const [spots, setSpots] = useState<Spot[]>(spotsProp ?? []);
  const [listOpen, setListOpen] = useState(true);

  const { setMapRef: _setMapRef, effectiveSelectedId, selectedSpot, handleSelect } =
    useCaliforniaMap({ spots, selectedSpotId, onSpotSelect });

  const setMapRef = (r: MapRef | null) => {
    _setMapRef(r);
    if (r) onMapReady?.(r);
  };

  // Load static data unless caller already provided spots.
  useEffect(() => {
    if (!spotsProp) {
      fetch("/spots.json")
        .then((r) => r.json())
        .then(setSpots)
        .catch((e) => console.error("spots load failed", e));
    }
    fetch("/california.geojson")
      .then((r) => r.json())
      .then(setBoundary)
      .catch((e) => console.error("boundary load failed", e));
  }, [spotsProp]);

  useEffect(() => {
    if (spotsProp) setSpots(spotsProp);
  }, [spotsProp]);

  const mask = useMemo(
    () => (boundary ? buildCaliforniaMask(boundary) : null),
    [boundary],
  );

  const dimmed = useMemo(() => {
    const set = overlay?.highlightedSpotIds;
    if (!set || set.length === 0) return null;
    return new Set(set);
  }, [overlay?.highlightedSpotIds]);

  const pulsed = useMemo(() => {
    const set = overlay?.pulsedSpotIds;
    if (!set || set.length === 0) return null;
    return new Set(set);
  }, [overlay?.pulsedSpotIds]);

  const spotById = useMemo(() => {
    const m = new Map<string, Spot>();
    for (const s of spots) m.set(s.id, s);
    return m;
  }, [spots]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Header */}
      {header !== null && (
        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
          <div className="flex items-baseline justify-between px-6 pt-5">
            <div className="pointer-events-auto">
              {header ?? <DefaultHeader />}
            </div>
            {showSpotList && (
              <div className="pointer-events-auto flex items-center gap-2">
                <button
                  onClick={() => setListOpen((v) => !v)}
                  className="surface-pill text-xs px-3 py-1.5 text-stone-700 hover:bg-white transition-all ease-soft"
                >
                  {listOpen ? "Hide spots" : "Show spots"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showSpotList && (
        <SpotList
          spots={spots}
          selectedId={effectiveSelectedId ?? null}
          open={listOpen}
          onSelect={(id) => handleSelect(id)}
        />
      )}

      {showSpotDetail && (
        <SpotDetail
          spot={selectedSpot}
          onClose={() => handleSelect(null)}
        />
      )}

      {/* Map */}
      <MapGL
        ref={setMapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={INITIAL_VIEW}
        minZoom={5}
        maxZoom={18}
        maxBounds={CA_BOUNDS}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* Mask: dim everything outside California */}
        {mask && (
          <Source id="ca-mask" type="geojson" data={mask}>
            <Layer
              id="ca-mask-fill"
              type="fill"
              paint={{
                "fill-color": "#fafaf7",
                "fill-opacity": 0.85,
              }}
            />
          </Source>
        )}

        {/* California outline */}
        {boundary && (
          <Source
            id="ca-outline"
            type="geojson"
            data={boundary as FeatureCollection}
          >
            <Layer
              id="ca-outline-line"
              type="line"
              paint={{
                "line-color": "#1c1917",
                "line-width": 1,
                "line-opacity": 0.5,
              }}
            />
          </Source>
        )}

        {/* Optional route overlay (Google Directions polyline) */}
        {overlay?.routeGeoJSON && (
          <Source id="trip-route" type="geojson" data={overlay.routeGeoJSON}>
            <Layer
              id="trip-route-casing"
              type="line"
              paint={{
                "line-color": "#ffffff",
                "line-width": 6,
                "line-opacity": 0.9,
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
            <Layer
              id="trip-route-line"
              type="line"
              paint={{
                "line-color": "#1c1917",
                "line-width": 3,
                "line-opacity": 0.9,
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>
        )}

        {/* Spot markers */}
        {spots.map((s) => {
          const isSelected = s.id === effectiveSelectedId;
          const isDimmed = dimmed ? !dimmed.has(s.id) : false;
          const isPulsing = pulsed ? pulsed.has(s.id) : false;
          return (
            <Marker
              key={s.id}
              longitude={s.lon}
              latitude={s.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleSelect(s.id);
              }}
            >
              <div
                className={`spot-dot${isSelected ? " is-selected" : ""}${
                  isDimmed ? " is-dimmed" : ""
                }${isPulsing ? " is-pulsing" : ""}`}
                style={{ background: skillColor(s.skill_level) }}
                aria-label={s.name}
              />
            </Marker>
          );
        })}

        {/* Score badges — sibling markers, slight pixel offset via CSS */}
        {overlay?.spotScores &&
          Object.entries(overlay.spotScores).map(([spotId, score]) => {
            const spot = spotById.get(spotId);
            if (!spot) return null;
            return (
              <Marker
                key={`score-${spotId}`}
                longitude={spot.lon}
                latitude={spot.lat}
                anchor="center"
              >
                <div className="spot-score-badge" aria-hidden>
                  {score}
                </div>
              </Marker>
            );
          })}

        {/* Day-stop markers — numbered dark circles for trip itinerary */}
        {overlay?.tripDays?.map((td) => {
          const spot = spotById.get(td.spotId);
          if (!spot) return null;
          return (
            <Marker
              key={`day-${td.dayIndex}-${td.spotId}`}
              longitude={spot.lon}
              latitude={spot.lat}
              anchor="center"
            >
              <div
                className="day-stop-marker"
                title={td.label ?? `Day ${td.dayIndex}`}
              >
                {td.dayIndex}
              </div>
            </Marker>
          );
        })}
      </MapGL>
    </div>
  );
}

function DefaultHeader() {
  return (
    <h1 className="text-display text-3xl text-stone-900">
      <span className="italic">California</span>{" "}
      <span className="text-stone-400">·</span>{" "}
      <span className="text-stone-500 text-2xl">surf</span>
    </h1>
  );
}
