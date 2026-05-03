"use client";

import dynamic from "next/dynamic";

const CaliforniaMap = dynamic(
  () => import("./components/map/CaliforniaMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center text-meta">
        Loading map…
      </div>
    ),
  },
);

export default function Home() {
  return (
    <div className="h-screen w-screen">
      <CaliforniaMap />
    </div>
  );
}
