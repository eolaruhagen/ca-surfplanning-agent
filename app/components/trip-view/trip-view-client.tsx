"use client";

import dynamic from "next/dynamic";
import type { Trip } from "@/lib/types";

const TripView = dynamic(() => import("./trip-view"), { ssr: false });

export default function TripViewClient({ trip }: { trip: Trip }) {
  return <TripView trip={trip} />;
}
