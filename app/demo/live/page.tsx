"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import LiveFeed from "@/app/components/live-feed/live-feed";
import { useLiveFeed } from "@/app/components/live-feed/hook";
import { DEMO_LOOP_MS, DEMO_ROUTE_GEOJSON, useDemoStream } from "./use-demo-stream";
import type { MapOverlay } from "@/lib/spots";

// Mapbox needs `window`, so the map is loaded client-side only.
const CaliforniaMap = dynamic(
  () => import("@/app/components/map/CaliforniaMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center text-meta">
        Loading map…
      </div>
    ),
  },
);

export default function DemoLivePage() {
  const { events, paused, elapsedMs, restart, togglePause } = useDemoStream({
    loop: true,
  });

  // Once the timeline has started laying down the route, surface the polyline
  // immediately so the map shows the drive-arc as soon as planning begins
  // (instead of waiting for the `done` event at t=15.3s).
  const routeOverride = useMemo(() => {
    const seen = events.find(
      (e) => e.type === "data_observed" && e.kind === "route",
    );
    return seen ? DEMO_ROUTE_GEOJSON : null;
  }, [events]);

  const state = useLiveFeed(events, {
    pulseTtlMs: 2000,
    routeGeoJSONOverride: routeOverride,
  });

  const overlay: MapOverlay = {
    highlightedSpotIds: state.highlightedSpotIds,
    pulsedSpotIds: state.pulsedSpotIds,
    spotScores: state.spotScores,
    tripDays: state.tripDays,
    routeGeoJSON: state.routeGeoJSON,
  };

  const progressPct = Math.min(100, (elapsedMs / DEMO_LOOP_MS) * 100);

  return (
    <div className="h-screen w-screen overflow-hidden grid grid-cols-[1.2fr_1fr] bg-cream">
      {/* Left — the real map, painted by the same overlay it would receive in prod. */}
      <div className="relative">
        <CaliforniaMap
          overlay={overlay}
          showSpotList={false}
          showSpotDetail={false}
          header={
            <div className="text-display text-2xl text-stone-900 leading-tight">
              <span className="italic">Live demo</span>{" "}
              <span className="text-stone-400">·</span>{" "}
              <span className="text-stone-500 text-lg">
                SF → Santa Barbara · 3 days
              </span>
            </div>
          }
        />
      </div>

      {/* Right — live feed panel + transport controls. */}
      <div className="border-l border-stone-200/70 bg-cream flex flex-col min-h-0">
        <LiveFeed state={state} />

        <div className="border-t border-stone-200/70 px-5 py-3 flex items-center gap-3">
          <button
            onClick={restart}
            className="surface-pill text-xs px-3 py-1.5 text-stone-700 hover:bg-white transition-all ease-soft"
          >
            ↺ Restart
          </button>
          <button
            onClick={togglePause}
            className="surface-pill text-xs px-3 py-1.5 text-stone-700 hover:bg-white transition-all ease-soft"
          >
            {paused ? "▶ Resume" : "❚❚ Pause"}
          </button>
          <div className="flex-1 h-1 rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full bg-stone-700 transition-all ease-soft"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-meta tabular-nums">
            {(elapsedMs / 1000).toFixed(1)}s / {(DEMO_LOOP_MS / 1000).toFixed(0)}s
          </div>
        </div>
      </div>
    </div>
  );
}
