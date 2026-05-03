"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Marker } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";

import type { Trip } from "@/lib/types";
import { useTripView } from "./hook";
import SpeechBubble from "./speech-bubble";
import DayRail from "./day-rail";
import NavControls from "./nav-controls";
import PitchToggle from "./pitch-toggle";
import SessionMarker from "./session-marker";

const CaliforniaMap = dynamic(
  () => import("@/app/components/map/CaliforniaMap"),
  { ssr: false },
);

type TripViewProps = {
  trip: Trip;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

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
  const [is3D, setIs3D] = useState(false);
  const hasFlownRef = useRef(false);

  const flyToSession = useCallback(
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

  const handleMapReady = useCallback((map: MapRef) => {
    mapRef.current = map;
  }, []);

  const handleToggle3D = useCallback(() => {
    setIs3D((v) => {
      const next3D = !v;
      const pitch = next3D ? 60 : 0;
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: mapRef.current.getCenter() as unknown as [number, number],
          zoom: mapRef.current.getZoom(),
          pitch,
          duration: 900,
          essential: true,
        });
      }
      return next3D;
    });
  }, []);

  // On first play, enable 3D and fly to current session
  const handleTogglePlay = useCallback(() => {
    if (!isPlaying && !hasFlownRef.current) {
      hasFlownRef.current = true;
      setIs3D(true);
      flyToSession(currentSession?.spot_coords, 60);
    }
    toggle();
  }, [isPlaying, currentSession, toggle, flyToSession]);

  // Fly on session advance
  const handleNext = useCallback(() => {
    next();
    const nextFlat = flatSessions[Math.min(currentIndex + 1, flatSessions.length - 1)];
    flyToSession(nextFlat?.session?.spot_coords, is3D ? 60 : 0);
  }, [next, flatSessions, currentIndex, is3D, flyToSession]);

  const handlePrev = useCallback(() => {
    prev();
    const prevFlat = flatSessions[Math.max(currentIndex - 1, 0)];
    flyToSession(prevFlat?.session?.spot_coords, is3D ? 60 : 0);
  }, [prev, flatSessions, currentIndex, is3D, flyToSession]);

  const handleJumpTo = useCallback(
    (idx: number) => {
      jumpTo(idx);
      const flat = flatSessions[idx];
      flyToSession(flat?.session?.spot_coords, is3D ? 60 : 0);
    },
    [jumpTo, flatSessions, is3D, flyToSession],
  );

  const handleJumpToDay = useCallback(
    (dayIndex: number) => {
      jumpToDay(dayIndex);
      const first = flatSessions.find((fs) => fs.dayIndex === dayIndex);
      flyToSession(first?.session?.spot_coords, is3D ? 60 : 0);
    },
    [jumpToDay, flatSessions, is3D, flyToSession],
  );

  const currentDayIndex = flatSessions[currentIndex]?.dayIndex ?? 0;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--color-background)]">
      {/* Map — full bleed */}
      <CaliforniaMap
        showSpotList={false}
        showSpotDetail={false}
        header={null}
        onMapReady={handleMapReady}
      />

      {/* Session markers on map — rendered as Mapbox Markers */}
      {/* Note: We render markers as absolute overlays since CaliforniaMap owns MapGL */}
      {/* For simplicity, we layer session info in the UI panel, not on the map */}

      {/* Top bar: header + day rail */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="px-6 pt-5 pb-4 flex flex-col gap-3">
          {/* Title */}
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

          {/* Day rail */}
          <div className="pointer-events-auto">
            <DayRail
              days={trip.days}
              currentDayIndex={currentDayIndex}
              onDaySelect={handleJumpToDay}
            />
          </div>
        </div>
      </div>

      {/* Bottom panel: speech bubble + nav */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="px-6 pb-8 flex flex-col gap-4">
          {/* Session context */}
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

          {/* Nav controls */}
          <div className="pointer-events-auto flex items-center">
            <NavControls
              currentIndex={currentIndex}
              total={flatSessions.length}
              isPlaying={isPlaying}
              onPrev={handlePrev}
              onNext={handleNext}
              onToggle={handleTogglePlay}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
