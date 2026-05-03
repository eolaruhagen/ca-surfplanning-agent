"use client";

import CardShell from "../card-shell";
import GeoPickMap from "@/app/components/geo-pick/geo-pick-map";

interface FromCardProps {
  point: [number, number] | null;
  onPick: (point: [number, number] | null) => void;
}

export default function FromCard({ point, onPick }: FromCardProps) {
  return (
    <CardShell cardNumber={2} title="Where are you starting from?">
      <p className="text-meta text-stone-500">
        Click anywhere on the map to drop a pin. We&rsquo;ll figure out the city.
      </p>
      <div className="h-80 rounded-lg overflow-hidden border border-stone-200/70">
        <GeoPickMap variant="start" point={point} onPick={onPick} />
      </div>
    </CardShell>
  );
}
