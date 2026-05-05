"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { PlanRequest } from "@/lib/types";
import { PlanRequestSchema } from "@/lib/schemas";
import type { MapOverlay } from "@/lib/spots";
import LiveFeed from "@/app/components/live-feed/live-feed";
import { useLiveFeed } from "@/app/components/live-feed/hook";
import SpotDetailPanel from "@/app/components/spot-detail/spot-detail-panel";
import { useSpotSelection } from "@/app/components/spot-detail/hook";
import { usePlanStream } from "./use-plan-stream";

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

export default function PlanLivePage() {
  const router = useRouter();
  const [request, setRequest] = useState<PlanRequest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("planRequest");
      if (!raw) {
        setLoadError("Missing plan request. Please restart the planner.");
        return;
      }
      const parsed = PlanRequestSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        setLoadError("Stored plan request is invalid. Please restart the planner.");
        return;
      }
      setRequest(parsed.data as PlanRequest);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load plan request.");
    }
  }, []);

  const { events, error, status } = usePlanStream(request);
  const state = useLiveFeed(events, { pulseTtlMs: 2000 });
  const { selectedSpot, selectSpot, clearSelection } = useSpotSelection();

  useEffect(() => {
    const last = events[events.length - 1];
    if (last?.type === "done") {
      router.push(`/t/${last.trip_id}`);
    }
  }, [events, router]);

  const overlay: MapOverlay = {
    highlightedSpotIds: state.highlightedSpotIds,
    pulsedSpotIds: state.pulsedSpotIds,
    spotScores: state.spotScores,
    tripDays: state.tripDays,
    routeGeoJSON: state.routeGeoJSON,
  };

  const header = useMemo(() => {
    if (!request) return null;
    const { start_date, end_date } = request.params;
    return (
      <div className="text-display text-2xl text-stone-900 leading-tight">
        <span className="italic">Planning live</span>{" "}
        <span className="text-stone-400">·</span>{" "}
        <span className="text-stone-500 text-lg">
          {start_date} → {end_date}
        </span>
      </div>
    );
  }, [request]);

  if (loadError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-cream">
        <div className="surface-glass max-w-md p-8 text-center flex flex-col gap-3">
          <p className="text-display text-2xl text-stone-900">
            <span className="italic">Unable to start live planning</span>
          </p>
          <p className="text-meta text-stone-500">{loadError}</p>
          <Link
            href="/plan"
            className="surface-pill text-xs px-3 py-1.5 text-stone-700 hover:bg-white transition-all ease-soft"
          >
            Back to planner
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden grid grid-cols-[1.2fr_1fr] bg-cream">
      {/* Left — map painted by live overlay. */}
      <div className="relative">
        <SpotDetailPanel spot={selectedSpot} onClose={clearSelection} />
        <CaliforniaMap
          overlay={overlay}
          showSpotList={false}
          showSpotDetail={false}
          onSpotClick={selectSpot}
          header={header}
        />
      </div>

      {/* Right — live feed panel + status. */}
      <div className="border-l border-stone-200/70 bg-cream flex flex-col min-h-0">
        <LiveFeed state={state} />
        {status === "connecting" && (
          <div className="border-t border-stone-200/70 px-5 py-3 text-xs text-stone-500">
            Connecting to planning stream…
          </div>
        )}
        {status === "error" && error && (
          <div className="border-t-2 border-red-300 bg-red-50 px-5 py-4 text-sm text-red-800">
            <div className="font-semibold mb-1">Planning session ended with an error</div>
            <div className="text-red-700 break-words">{error}</div>
            <div className="mt-3 text-xs text-red-600">
              The session has been terminated. You can refresh and try again.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
