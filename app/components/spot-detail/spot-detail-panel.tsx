"use client";

import { useEffect, useRef } from "react";

import { skillColor, type Spot } from "@/lib/spots";

type Props = {
  spot: Spot | null;
  onClose: () => void;
};

/**
 * Left-edge slide-in panel showing the full record for a selected spot.
 * Render-only — selection state lives in `useSpotSelection` (./hook).
 *
 * Visual: glassy cream surface, ~380px wide, slides from the left when a spot
 * is set. Headers use the display serif; body sections are scannable groups
 * separated by hairline borders. Keyboard: ESC dismisses, focus moves to the
 * panel on open so screen readers / keyboard users land here immediately.
 */
export default function SpotDetailPanel({ spot, onClose }: Props) {
  const panelRef = useRef<HTMLElement | null>(null);

  // ESC dismisses while the panel is open.
  useEffect(() => {
    if (!spot) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spot, onClose]);

  // Focus the panel on open so keyboard users land inside it.
  useEffect(() => {
    if (spot && panelRef.current) {
      panelRef.current.focus();
    }
  }, [spot]);

  const open = spot !== null;

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={spot ? `spot-detail-${spot.id}-name` : undefined}
      aria-hidden={!open}
      tabIndex={-1}
      className={`absolute top-20 left-6 bottom-6 z-30 w-[380px] max-w-[calc(100vw-3rem)] outline-none transition-all duration-300 ease-soft ${
        open
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 -translate-x-6 pointer-events-none"
      }`}
    >
      {spot && (
        <div
          key={spot.id}
          className="anim-panel-in-left surface-glass-strong h-full flex flex-col overflow-hidden rounded-2xl shadow-soft-lg"
        >
          <Header spot={spot} onClose={onClose} />

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5 text-sm text-stone-700">
            <WaveAndSkill spot={spot} />
            <IdealConditions spot={spot} />
            <CrowdAndHazards spot={spot} />
            <Notes value={spot.notes} />
            <ReferenceIds spot={spot} />
          </div>
        </div>
      )}
    </aside>
  );
}

// ---------- subsections ----------

function Header({ spot, onClose }: { spot: Spot; onClose: () => void }) {
  return (
    <div className="px-5 pt-5 pb-4 border-b border-stone-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-eyebrow capitalize">
            {spot.region.replace(/-/g, " ")}
          </div>
          <h2
            id={`spot-detail-${spot.id}-name`}
            className="text-display-italic text-3xl text-stone-900 leading-tight mt-1 truncate"
          >
            {spot.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close spot detail"
          className="text-stone-400 hover:text-stone-700 text-xl leading-none -mt-1 px-1"
        >
          ×
        </button>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span
          className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
          style={{ background: skillColor(spot.skill_level) }}
        >
          {spot.skill_level.replace(/-/g, " ")}
        </span>
        <span className="text-[11px] text-stone-500">
          {spot.wave_size_feet[0]}–{spot.wave_size_feet[1]} ft
        </span>
        <span className="text-[11px] text-stone-400 ml-auto">
          confidence: {spot.confidence}
        </span>
      </div>
    </div>
  );
}

function WaveAndSkill({ spot }: { spot: Spot }) {
  return (
    <Section title="Wave & skill">
      <p className="text-display-italic text-[15px] leading-relaxed text-stone-800">
        {spot.wave_character}
      </p>
      <Row label="Skill" value={spot.skill_level.replace(/-/g, " ")} />
      <Row
        label="Size"
        value={`${spot.wave_size_feet[0]}–${spot.wave_size_feet[1]} ft`}
      />
      <div>
        <div className="text-eyebrow mb-1.5">Boards</div>
        <div className="flex flex-wrap gap-1.5">
          {spot.boards_recommended.map((b) => (
            <span
              key={b}
              className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 capitalize"
            >
              {b.replace(/-/g, " ")}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}

function IdealConditions({ spot }: { spot: Spot }) {
  const swellDir = formatRange(spot.ideal_swell_direction_deg, "°");
  const swellPer = formatRange(spot.ideal_swell_period_sec, "s");
  const windDir = formatRange(spot.ideal_wind_direction_deg, "°");
  const tide = spot.ideal_tide_state ?? "—";

  return (
    <Section title="Ideal conditions">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Row label="Swell direction" value={swellDir} />
        <Row label="Swell period" value={swellPer} />
        <Row label="Wind direction" value={windDir} />
        <Row label="Tide" value={tide} />
      </div>
    </Section>
  );
}

function CrowdAndHazards({ spot }: { spot: Spot }) {
  return (
    <Section title="Crowd & hazards">
      <Row label="Crowd" value={spot.crowd_factor.replace(/-/g, " ")} />
      <div>
        <div className="text-eyebrow mb-1.5">Hazards</div>
        {spot.hazards.length === 0 ? (
          <div className="text-[12px] text-stone-400">None reported</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {spot.hazards.map((h) => (
              <span
                key={h}
                className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100"
              >
                {h.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

function Notes({ value }: { value: string }) {
  if (!value) return null;
  return (
    <Section title="Notes">
      <blockquote className="border-l-2 border-stone-300 pl-3 text-[13px] text-stone-700 italic leading-relaxed">
        {value}
      </blockquote>
    </Section>
  );
}

function ReferenceIds({ spot }: { spot: Spot }) {
  return (
    <div className="pt-3 border-t border-stone-100 font-mono text-[10.5px] text-stone-400 space-y-0.5">
      <div>
        lat/lon: {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)}
      </div>
      {spot.tide_station_id && <div>tide station: {spot.tide_station_id}</div>}
      {spot.primary_buoy_id && <div>buoy: {spot.primary_buoy_id}</div>}
    </div>
  );
}

// ---------- primitives ----------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="text-eyebrow">{title}</div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
      <span className="text-stone-500">{label}</span>
      <span className="text-stone-800 capitalize text-right">{value}</span>
    </div>
  );
}

function formatRange(
  range: [number, number] | undefined,
  unit: string,
): string {
  if (!range) return "—";
  const [a, b] = range;
  if (a === b) return `${a}${unit}`;
  return `${a}–${b}${unit}`;
}
