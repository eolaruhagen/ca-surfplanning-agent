"use client";

import { skillColor, type Spot } from "@/lib/spots";

type Props = {
  spot: Spot | null;
  onClose: () => void;
};

export default function SpotDetail({ spot, onClose }: Props) {
  return (
    <div
      className={`absolute top-20 right-6 bottom-6 z-20 w-80 transition-all duration-300 ease-soft ${
        spot
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-6 pointer-events-none"
      }`}
    >
      {spot && (
        <div
          key={spot.id}
          className="anim-panel-in-right surface-glass-strong h-full flex flex-col overflow-hidden"
        >
          <div className="px-5 pt-5 pb-4 border-b border-stone-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-eyebrow capitalize">
                  {spot.region.replace(/-/g, " ")}
                </div>
                <h2 className="text-display text-3xl text-stone-900 leading-tight mt-1">
                  {spot.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none -mt-1"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span
                className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                style={{ background: skillColor(spot.skill_level) }}
              >
                {spot.skill_level}
              </span>
              <span className="text-[11px] text-stone-500">
                {spot.wave_size_feet[0]}–{spot.wave_size_feet[1]} ft
              </span>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 text-sm text-stone-700">
            <p className="text-display-italic text-[15px] leading-relaxed text-stone-800">
              {spot.wave_character}
            </p>

            <Field label="Notes" value={spot.notes} />

            <div className="grid grid-cols-2 gap-3">
              <MiniField label="Crowd" value={spot.crowd_factor} />
              <MiniField
                label="Boards"
                value={spot.boards_recommended.join(", ")}
              />
            </div>

            <div>
              <div className="text-eyebrow mb-1.5">Hazards</div>
              <div className="flex flex-wrap gap-1.5">
                {spot.hazards.map((h) => (
                  <span
                    key={h}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600"
                  >
                    {h.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-stone-400 pt-2 border-t border-stone-100">
              {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)} · confidence:{" "}
              {spot.confidence}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-eyebrow mb-1">{label}</div>
      <div className="text-[13px] text-stone-700 leading-relaxed">{value}</div>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-eyebrow mb-0.5">{label}</div>
      <div className="text-[12px] text-stone-700 capitalize leading-snug">
        {value}
      </div>
    </div>
  );
}
