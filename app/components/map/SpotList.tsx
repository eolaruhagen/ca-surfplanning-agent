"use client";

import { skillColor, type Spot } from "@/lib/spots";

type Props = {
  spots: Spot[];
  selectedId: string | null;
  open: boolean;
  onSelect: (id: string) => void;
};

export default function SpotList({ spots, selectedId, open, onSelect }: Props) {
  return (
    <div
      className={`absolute top-20 left-6 bottom-6 z-20 w-72 transition-all duration-300 ease-soft ${
        open
          ? "opacity-100 translate-x-0"
          : "opacity-0 -translate-x-4 pointer-events-none"
      }`}
    >
      <div className="surface-glass h-full flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-stone-100">
          <div className="text-display text-base text-stone-900">Spots</div>
          <div className="text-meta mt-0.5">
            {spots.length} breaks · click to fly
          </div>
        </div>
        <div className="overflow-y-auto flex-1 py-1">
          {spots.map((s) => {
            const active = s.id === selectedId;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
                  active ? "bg-stone-100" : "hover:bg-stone-50"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: skillColor(s.skill_level) }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-stone-900 truncate">
                    {s.name}
                  </span>
                  <span className="block text-[11px] text-stone-500 capitalize truncate">
                    {s.region.replace(/-/g, " ")} · {s.skill_level}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <Legend />
      </div>
    </div>
  );
}

function Legend() {
  const items: Array<[string, string]> = [
    ["beginner", "Beginner"],
    ["intermediate", "Intermediate"],
    ["advanced", "Advanced"],
    ["expert", "Expert"],
  ];
  return (
    <div className="px-4 py-3 border-t border-stone-100 text-meta">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {items.map(([k, label]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: skillColor(k) }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
