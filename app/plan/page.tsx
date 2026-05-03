"use client";

import dynamic from "next/dynamic";

// The deck includes <GeoPickMap> which uses Mapbox GL — needs window.
const Deck = dynamic(() => import("@/app/components/intake-form/deck"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen w-full flex items-center justify-center text-meta">
      Loading…
    </div>
  ),
});

export default function PlanPage() {
  return <Deck />;
}
