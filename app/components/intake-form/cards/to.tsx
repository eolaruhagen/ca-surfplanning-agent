"use client";

import CardShell from "../card-shell";
import GeoPickMap from "@/app/components/geo-pick/geo-pick-map";

interface ToCardProps {
  point: [number, number] | null;
  startPoint: [number, number] | null;
  onPick: (point: [number, number] | null) => void;
  onSameAsStart: () => void;
}

export default function ToCard({ point, startPoint, onPick, onSameAsStart }: ToCardProps) {
  const sameAsStart =
    !!point && !!startPoint && point[0] === startPoint[0] && point[1] === startPoint[1];

  return (
    <CardShell cardNumber={3} title="Where are you ending up?">
      <div className="flex items-center justify-between text-meta text-stone-500">
        <span>Drop a red pin for your trip&rsquo;s end.</span>
        {startPoint && (
          <button
            type="button"
            onClick={onSameAsStart}
            className={`surface-pill text-xs px-3 py-1.5 transition-all ease-soft ${
              sameAsStart ? "text-stone-900 bg-white" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            {sameAsStart ? "✓ Round trip" : "Same as start"}
          </button>
        )}
      </div>
      <div className="h-80 rounded-lg overflow-hidden border border-stone-200/70">
        <GeoPickMap variant="end" point={point} onPick={onPick} />
      </div>
    </CardShell>
  );
}
