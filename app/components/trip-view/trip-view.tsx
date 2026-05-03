"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Map as MapGL,
  Marker,
  NavigationControl,
  Source,
  Layer,
} from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import type { Feature, FeatureCollection } from "geojson";

import type { Trip } from "@/lib/types";
import { buildCaliforniaMask } from "@/app/components/map/buildMask";
import { extractRouteFeatures } from "./helpers/route-utils";
import { shouldDoInitialFly } from "./helpers/auto-advance";
import { useTripView } from "./hook";
import SpeechBubble from "./speech-bubble";
import DayRail from "./day-rail";
import NavControls from "./nav-controls";
import PitchToggle from "./pitch-toggle";
import SessionMarker from "./session-marker";

type TripViewProps = {
  trip: Trip;
};

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

export default function TripView({ trip }: TripViewProps) {
  const {
    flatSessions,
    currentIndex,
    currentSession,
    currentDay,
    isPlaying,
    next,
    prev,
    jumpTo,
    jumpToDay,
    toggle,
  } = useTripView(trip);

  const mapRef = useRef<MapRef | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const hasInitialFlownRef = useRef(false);

  const [boundary, setBoundary] = useState<FeatureCollection | Feature | null>(
    null,
  );

  useEffect(() => {
    fetch("/california.geojson")
      .then((r) => r.json())
      .then(setBoundary)
      .catch((e) => console.error("boundary load failed", e));
  }, []);

  const mask = useMemo(
    () => (boundary ? buildCaliforniaMask(boundary) : null),
    [boundary],
  );

  const routeFC = useMemo(
    () => extractRouteFeatures(trip.route_geojson),
    [trip.route_geojson],
  );

  const flyToCoords = useCallback(
    (coords: [number, number] | undefined, pitch: number) => {
      if (!coords || !mapRef.current) return;
      mapRef.current.flyTo({
        center: coords,
        zoom: 12,
        pitch,
        bearing: 0,
        duration: 1800,
        essential: true,
      });
    },
    [],
  );

  const handleMapLoad = useCallback(() => {
    const m = mapRef.current?.getMap();
    if (!m) {
      setMapReady(true);
      return;
    }
    try {
      if (!m.getSource("mapbox-dem")) {
        m.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }
      m.setTerrain({ source: "mapbox-dem", exaggeration: 1.4 });
      if (!m.getLayer("trip-hillshade")) {
        // Subtle topo shading so 3D pitch actually reads visually
        m.addLayer({
          id: "trip-hillshade",
          type: "hillshade",
          source: "mapbox-dem",
          paint: {
            "hillshade-illumination-direction": 335,
            "hillshade-exaggeration": 0.45,
            "hillshade-shadow-color": "rgba(28, 25, 23, 0.22)",
            "hillshade-highlight-color": "rgba(180, 165, 130, 0.18)",
            "hillshade-accent-color": "rgba(120, 113, 108, 0.12)",
          },
        });
      }
      if (!m.getLayer("sky")) {
        m.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun-intensity": 5,
          },
        });
      }
    } catch (err) {
      console.warn("terrain setup failed", err);
    }
    setMapReady(true);
  }, []);

  // Initial fly to the first session, once the map is ready
  useEffect(() => {
    const firstCoords = flatSessions[0]?.session?.spot_coords;
    if (
      !shouldDoInitialFly({
        mapReady,
        hasFlown: hasInitialFlownRef.current,
        firstSessionCoords: firstCoords,
      })
    ) {
      return;
    }
    hasInitialFlownRef.current = true;
    setIs3D(true);
    flyToCoords(firstCoords, 60);
  }, [mapReady, flatSessions, flyToCoords]);

  const handleToggle3D = useCallback(() => {
    setIs3D((v) => {
      const next3D = !v;
      const pitch = next3D ? 60 : 0;
      const m = mapRef.current;
      if (m) {
        const c = m.getCenter();
        m.flyTo({
          center: [c.lng, c.lat],
          zoom: m.getZoom(),
          pitch,
          duration: 900,
          essential: true,
        });
      }
      return next3D;
    });
  }, []);

  // Fly whenever currentIndex changes (covers user clicks AND auto-advance)
  useEffect(() => {
    if (!mapReady) return;
    const coords = flatSessions[currentIndex]?.session?.spot_coords;
    if (!coords) return;
    flyToCoords(coords, is3D ? 60 : 0);
    // is3D intentionally omitted — toggle handles its own flyTo above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, mapReady, flatSessions]);

  const currentDayIndex = flatSessions[currentIndex]?.dayIndex ?? 0;

  // Fan-cluster sessions that share a spot so the numbered pins don't overlap.
  // Mapbox `offset` is pixel-based → zoom-invariant.
  const sessionOffsets = useMemo(() => {
    const groups = new Map<string, typeof flatSessions>();
    for (const fs of flatSessions) {
      const c = fs.session.spot_coords;
      if (!c) continue;
      const key = `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
      const arr = groups.get(key) ?? [];
      arr.push(fs);
      groups.set(key, arr);
    }
    const out = new Map<number, [number, number]>();
    for (const arr of groups.values()) {
      if (arr.length === 1) {
        out.set(arr[0].globalIndex, [0, 0]);
        continue;
      }
      arr.sort((a, b) => a.globalIndex - b.globalIndex);
      const r = 16;
      arr.forEach((fs, i) => {
        const angle = (2 * Math.PI * i) / arr.length - Math.PI / 2;
        out.set(fs.globalIndex, [r * Math.cos(angle), r * Math.sin(angle)]);
      });
    }
    return out;
  }, [flatSessions]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--color-background)]">
      <MapGL
        ref={(r) => {
          mapRef.current = r;
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={INITIAL_VIEW}
        minZoom={5}
        maxZoom={18}
        maxBounds={CA_BOUNDS}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
        onLoad={handleMapLoad}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* Outside-California mask */}
        {mask && (
          <Source id="ca-mask" type="geojson" data={mask}>
            <Layer
              id="ca-mask-fill"
              type="fill"
              paint={{ "fill-color": "#fafaf7", "fill-opacity": 0.85 }}
            />
          </Source>
        )}

        {/* California outline + faint warm fill so the land has a touch of color */}
        {boundary && (
          <Source
            id="ca-outline"
            type="geojson"
            data={boundary as FeatureCollection}
          >
            <Layer
              id="ca-fill-tint"
              type="fill"
              paint={{
                "fill-color": "#f0e9d8",
                "fill-opacity": 0.18,
              }}
            />
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

        {/* Trip driving route — casing + stroke */}
        {routeFC && (
          <Source id="trip-route" type="geojson" data={routeFC}>
            <Layer
              id="trip-route-casing"
              type="line"
              paint={{
                "line-color": "#ffffff",
                "line-width": 6,
                "line-opacity": 0.95,
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

        {/* Numbered session pins */}
        {flatSessions.map((fs) => {
          const coords = fs.session.spot_coords;
          if (!coords) return null;
          const isCurrent = fs.globalIndex === currentIndex;
          return (
            <Marker
              key={`session-${fs.globalIndex}`}
              longitude={coords[0]}
              latitude={coords[1]}
              anchor="center"
              offset={sessionOffsets.get(fs.globalIndex) ?? [0, 0]}
            >
              <div className={`session-pin${isCurrent ? " is-current" : ""}`}>
                <SessionMarker
                  number={fs.globalIndex + 1}
                  isCurrent={isCurrent}
                  onClick={() => jumpTo(fs.globalIndex)}
                />
              </div>
            </Marker>
          );
        })}
      </MapGL>

      {/* Top bar: header + day rail */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="px-6 pt-5 pb-4 flex flex-col gap-3">
          <div className="pointer-events-auto flex items-center justify-between">
            <h1 className="text-display text-2xl text-stone-900">
              <span className="italic">Surf</span>{" "}
              <span className="text-stone-400">·</span>{" "}
              <span className="text-stone-500 text-xl">trip</span>
            </h1>
            <div className="flex items-center gap-2">
              <PitchToggle is3D={is3D} onToggle={handleToggle3D} />
            </div>
          </div>

          <div className="pointer-events-auto">
            <DayRail
              days={trip.days}
              currentDayIndex={currentDayIndex}
              onDaySelect={jumpToDay}
            />
          </div>
        </div>
      </div>

      {/* Bottom panel: speech bubble + nav */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="px-6 pb-8 flex flex-col gap-4">
          {currentSession && (
            <div className="pointer-events-auto">
              <div className="mb-1">
                <span className="text-eyebrow text-stone-400">
                  {currentDay?.date ?? ""} · {currentSession.time_window}
                </span>
                <span className="ml-2 text-meta text-stone-600 font-medium">
                  {currentSession.spot_name}
                </span>
              </div>
              <SpeechBubble text={currentSession.pick_reason} />
            </div>
          )}

          <div className="pointer-events-auto flex items-center">
            <NavControls
              currentIndex={currentIndex}
              total={flatSessions.length}
              isPlaying={isPlaying}
              onPrev={prev}
              onNext={next}
              onToggle={toggle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
