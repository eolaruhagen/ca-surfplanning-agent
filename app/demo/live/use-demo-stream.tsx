"use client";

import { useEffect, useRef, useState } from "react";

import type { StreamEvent, Trip } from "@/lib/types";

/**
 * Canned event with an absolute offset (ms) into the loop. The hook
 * schedules each one with `setTimeout` against the loop start; restart
 * resets the timer; pause/resume freezes the schedule.
 */
export type DemoStep = {
  /** Milliseconds since loop start when this event fires. */
  atMs: number;
  event: StreamEvent;
};

// ---------- Real spot coords (sourced from public/spots.json) ----------

const COORDS = {
  oceanBeach: [-122.5108, 37.7594] as [number, number],
  steamerLane: [-122.0269, 36.9514] as [number, number],
  pleasurePoint: [-121.9706, 36.9586] as [number, number],
  rincon: [-119.4781, 34.3733] as [number, number],
};

// LineString connecting the four chosen anchor stops.
export const DEMO_ROUTE_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { kind: "route" },
      geometry: {
        type: "LineString",
        coordinates: [
          COORDS.oceanBeach,
          COORDS.steamerLane,
          COORDS.pleasurePoint,
          COORDS.rincon,
        ],
      },
    },
  ],
};

// ---------- Final Trip object the `done` event will deliver ----------

const FINAL_TRIP: Trip = {
  id: "demo-live",
  created_at: "2026-05-03T12:00:00.000Z",
  params: {
    start_point: COORDS.oceanBeach,
    end_point: COORDS.rincon,
    start_date: "2026-05-09",
    end_date: "2026-05-11",
    sessions_per_day: 2,
    skill_level: "intermediate",
    wave_preference: "mixed",
    hard_constraints: "",
  },
  quiver: [
    {
      id: "b1",
      user_label: "6'2 shortboard",
      length_inches: 74,
      board_type: "shortboard",
      shape_notes: "high-perf thruster",
      ideal_conditions: {
        wave_height_ft: [3, 8],
        wave_period_sec: [10, 16],
        wave_quality: "punchy",
        skill_required: "intermediate",
      },
      confidence: "high",
      raw_description: "demo board",
    },
  ],
  days: [
    {
      day_number: 1,
      date: "2026-05-09",
      sessions: [
        {
          time_window: "7:00 AM – 9:30 AM",
          spot_id: "ocean-beach-sf",
          spot_name: "Ocean Beach (SF)",
          spot_coords: COORDS.oceanBeach,
          board_id: "b1",
          pick_reason:
            "West swell hits hard at OB; early offshore makes the dawn window magic.",
          reasoning:
            "OB benefits from northerly winds and the early lull before the afternoon onshore. Paddle is committing but the reward is uncrowded.",
          forecast_snapshot: {},
          fit_score: 78,
        },
      ],
      overnight: { town: "Half Moon Bay", coords: [-122.43, 37.46], reasoning: "midpoint" },
      drive_to_next: { duration_minutes: 90, distance_miles: 75 },
    },
    {
      day_number: 2,
      date: "2026-05-10",
      sessions: [
        {
          time_window: "8:00 AM – 11:00 AM",
          spot_id: "steamer-lane",
          spot_name: "Steamer Lane",
          spot_coords: COORDS.steamerLane,
          board_id: "b1",
          pick_reason:
            "Lane lights up on a long-period west swell; mid-tide for the Slot.",
          reasoning:
            "Classic right-hand point. Workable on any swell with a decent W component; mid tide opens the inside.",
          forecast_snapshot: {},
          fit_score: 84,
        },
      ],
      overnight: { town: "Capitola", coords: [-121.95, 36.97], reasoning: "stay close to the cluster" },
      drive_to_next: { duration_minutes: 240, distance_miles: 230 },
    },
    {
      day_number: 3,
      date: "2026-05-11",
      sessions: [
        {
          time_window: "6:30 AM – 9:00 AM",
          spot_id: "rincon",
          spot_name: "Rincon",
          spot_coords: COORDS.rincon,
          board_id: "b1",
          pick_reason:
            "Saturday peak: 4.2ft @ 14s, light offshore — Rincon is the highlight pick of the trip.",
          reasoning:
            "Long right-hand pointbreak tuned for west swells. Forecasts show the cleanest window in the bbox here.",
          forecast_snapshot: {},
          fit_score: 92,
        },
      ],
      overnight: null,
      drive_to_next: null,
    },
  ],
  route_geojson: DEMO_ROUTE_GEOJSON,
  summary_md:
    "# Three-day NorCal → Santa Barbara surf arc\n\nA west-swell-anchored mini-trip from SF to Rincon, hitting Ocean Beach early, Steamer Lane mid-trip, and finishing on a clean Saturday at Rincon.",
  caveats: [
    "OB is heavy paddle; only attempt at low tide if confident.",
    "Rincon crowds on weekends — go early.",
  ],
};

// ---------- The 16-second canned timeline ----------

export const DEMO_TIMELINE: DemoStep[] = [
  // ===== 0–1s: Vision phase =====
  { atMs: 50, event: { type: "phase", phase: "vision" } },
  {
    atMs: 100,
    event: { type: "agent_start", agent: "vision", task: "Identify boards from photos" },
  },
  {
    atMs: 400,
    event: {
      type: "agent_thinking",
      agent: "vision",
      text: "Photo 1: a 6'2 thruster shortboard. ",
    },
  },
  {
    atMs: 700,
    event: {
      type: "agent_thinking",
      agent: "vision",
      text: "Suited to chest-to-overhead punchy waves.",
    },
  },
  {
    atMs: 950,
    event: {
      type: "agent_finish",
      agent: "vision",
      summary: "Identified one 6'2 high-performance shortboard.",
    },
  },

  // ===== 1–5s: Recon phase =====
  { atMs: 1100, event: { type: "phase", phase: "recon" } },
  {
    atMs: 1150,
    event: { type: "agent_start", agent: "recon", task: "Score spots inside the trip bbox" },
  },
  {
    atMs: 1400,
    event: {
      type: "tool_call",
      agent: "recon",
      name: "list_candidate_spots",
      source: "local",
      args: { bbox: "SF→SB" },
    },
  },
  {
    atMs: 1900,
    event: {
      type: "tool_result",
      agent: "recon",
      name: "list_candidate_spots",
      summary: "18 spots within trip bounds",
    },
  },
  {
    atMs: 2100,
    event: {
      type: "agent_thinking",
      agent: "recon",
      text: "Scanning OB, the Lane, Pleasure Point, and Rincon. ",
    },
  },
  {
    atMs: 2400,
    event: {
      type: "tool_call",
      agent: "recon",
      name: "marine_weather",
      source: "mcp:open-meteo",
      args: { lat: 37.76, lon: -122.51, hours: 72 },
    },
  },
  {
    atMs: 2900,
    event: {
      type: "tool_result",
      agent: "recon",
      name: "marine_weather",
      summary: "OB: 4.5ft @ 12s, NW wind 8mph",
    },
  },
  {
    atMs: 3000,
    event: {
      type: "data_observed",
      agent: "recon",
      kind: "forecast",
      summary: "Ocean Beach 5/9 AM: 4.5ft @ 12s",
      spot_id: "ocean-beach-sf",
      score: 78,
    },
  },
  {
    atMs: 3300,
    event: {
      type: "agent_thinking",
      agent: "recon",
      text: "Saturday window at Rincon looks unusually clean — 4.2ft @ 14s, light offshore.",
    },
  },
  {
    atMs: 3700,
    event: {
      type: "data_observed",
      agent: "recon",
      kind: "forecast",
      summary: "Steamer Lane 5/10 AM: 5ft @ 13s",
      spot_id: "steamer-lane",
      score: 84,
    },
  },
  {
    atMs: 4400,
    event: {
      type: "data_observed",
      agent: "recon",
      kind: "forecast",
      summary: "Rincon 5/11 AM: 4.2ft @ 14s, peak fit",
      spot_id: "rincon",
      score: 92,
    },
  },
  {
    atMs: 4800,
    event: {
      type: "agent_finish",
      agent: "recon",
      summary: "Top picks: Rincon (92), Steamer Lane (84), OB (78).",
    },
  },
  {
    atMs: 5000,
    event: {
      type: "agent_message",
      from: "recon",
      to: "planner",
      content:
        "18 candidates scored. Anchor on Rincon Saturday morning (92). Pair with Steamer Lane mid-trip and OB to open.",
    },
  },

  // ===== 5–10s: Planning phase =====
  { atMs: 5300, event: { type: "phase", phase: "planning" } },
  {
    atMs: 5350,
    event: {
      type: "agent_start",
      agent: "planner",
      task: "Sequence the 3-day arc and route the drive",
    },
  },
  {
    atMs: 5600,
    event: {
      type: "tool_call",
      agent: "planner",
      name: "directions",
      source: "mcp:google-maps",
      args: { from: "SF", to: "Santa Cruz", mode: "driving" },
    },
  },
  {
    atMs: 6200,
    event: {
      type: "tool_result",
      agent: "planner",
      name: "directions",
      summary: "75mi · 1h30m via CA-1",
    },
  },
  {
    atMs: 6500,
    event: {
      type: "agent_thinking",
      agent: "planner",
      text: "Day 1 OB dawn → drive to HMB. Day 2 Steamer Lane → push south to Capitola. ",
    },
  },
  {
    atMs: 7100,
    event: {
      type: "tool_call",
      agent: "planner",
      name: "directions",
      source: "mcp:google-maps",
      args: { from: "Santa Cruz", to: "Carpinteria", mode: "driving" },
    },
  },
  {
    atMs: 7700,
    event: {
      type: "tool_result",
      agent: "planner",
      name: "directions",
      summary: "230mi · 4h via 101",
    },
  },
  {
    atMs: 8000,
    event: {
      type: "data_observed",
      agent: "planner",
      kind: "route",
      summary: "Route locked: SF → Santa Cruz → Rincon",
    },
  },
  {
    atMs: 8200,
    event: {
      type: "day_complete",
      day: FINAL_TRIP.days[0],
    },
  },
  {
    atMs: 8700,
    event: {
      type: "day_complete",
      day: FINAL_TRIP.days[1],
    },
  },
  {
    atMs: 9200,
    event: {
      type: "day_complete",
      day: FINAL_TRIP.days[2],
    },
  },
  {
    atMs: 9500,
    event: {
      type: "agent_thinking",
      agent: "planner",
      text: "Arc holds together: each day's swell window aligns with drive logistics.",
    },
  },
  {
    atMs: 9900,
    event: {
      type: "agent_finish",
      agent: "planner",
      summary: "Three-day arc sequenced; total drive ~5h35m across 305mi.",
    },
  },
  {
    atMs: 10100,
    event: {
      type: "agent_message",
      from: "planner",
      to: "narrator",
      content:
        "Trip is shaped: OB Friday → Steamer Saturday → Rincon Sunday. Drive splits work; please write it up.",
    },
  },

  // ===== 10–15s: Narration phase =====
  { atMs: 10400, event: { type: "phase", phase: "narration" } },
  {
    atMs: 10500,
    event: {
      type: "agent_start",
      agent: "narrator",
      task: "Write the trip summary and export artifacts",
    },
  },
  {
    atMs: 10900,
    event: {
      type: "agent_thinking",
      agent: "narrator",
      text: "A west-swell-anchored arc from the city to Santa Barbara… ",
    },
  },
  {
    atMs: 11400,
    event: {
      type: "agent_thinking",
      agent: "narrator",
      text: "Open at OB on the dawn offshore, ",
    },
  },
  {
    atMs: 11900,
    event: {
      type: "agent_thinking",
      agent: "narrator",
      text: "Saturday at the Lane on a building swell, ",
    },
  },
  {
    atMs: 12400,
    event: {
      type: "agent_thinking",
      agent: "narrator",
      text: "and finish on a clean Sunday at Rincon.",
    },
  },
  {
    atMs: 13000,
    event: {
      type: "tool_call",
      agent: "narrator",
      name: "write_file",
      source: "mcp:filesystem",
      args: { path: "exports/demo-live/trip-summary.md" },
    },
  },
  {
    atMs: 13500,
    event: {
      type: "tool_result",
      agent: "narrator",
      name: "write_file",
      summary: "exported 3 artifacts",
    },
  },
  {
    atMs: 13900,
    event: {
      type: "agent_finish",
      agent: "narrator",
      summary: "Trip summary written; exports staged at /exports/demo-live/.",
    },
  },

  // ===== 15–16s: Done =====
  {
    atMs: 15300,
    event: { type: "done", trip_id: FINAL_TRIP.id, trip: FINAL_TRIP },
  },
];

export const DEMO_LOOP_MS = 16_000;

/** Pure helper: which steps fire within `[fromMs, toMs)`. Used by tests. */
export function stepsBetween(fromMs: number, toMs: number): DemoStep[] {
  return DEMO_TIMELINE.filter((s) => s.atMs >= fromMs && s.atMs < toMs);
}

// ---------- React hook ----------

export type UseDemoStreamResult = {
  events: StreamEvent[];
  paused: boolean;
  /** Reset → empty events; restart timeline from t=0. */
  restart: () => void;
  togglePause: () => void;
  /** Wall-clock ms since loop start (frozen while paused). */
  elapsedMs: number;
};

export function useDemoStream(opts?: {
  /** Auto-loop at the end (true). When false the timeline runs once. */
  loop?: boolean;
}): UseDemoStreamResult {
  const loop = opts?.loop ?? true;

  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Refs let the long-lived interval read the latest pause/loop state without
  // re-tearing the timer on every render.
  const pausedRef = useRef(paused);
  const startMsRef = useRef<number>(performance.now());
  const fixtureIndexRef = useRef(0);
  const loopRef = useRef(loop);

  pausedRef.current = paused;
  loopRef.current = loop;

  useEffect(() => {
    let raf = 0;
    let lastTick = performance.now();

    const tick = (now: number) => {
      const dt = now - lastTick;
      lastTick = now;

      if (!pausedRef.current) {
        setElapsedMs((prev) => {
          const next = prev + dt;

          // Emit any steps whose atMs has passed.
          while (
            fixtureIndexRef.current < DEMO_TIMELINE.length &&
            DEMO_TIMELINE[fixtureIndexRef.current].atMs <= next
          ) {
            const step = DEMO_TIMELINE[fixtureIndexRef.current];
            fixtureIndexRef.current += 1;
            setEvents((es) => [...es, step.event]);
          }

          // Loop wrap-around.
          if (next >= DEMO_LOOP_MS) {
            if (loopRef.current) {
              fixtureIndexRef.current = 0;
              setEvents([]);
              startMsRef.current = now;
              return 0;
            }
            return DEMO_LOOP_MS;
          }
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return {
    events,
    paused,
    elapsedMs,
    restart: () => {
      fixtureIndexRef.current = 0;
      setEvents([]);
      setElapsedMs(0);
      startMsRef.current = performance.now();
    },
    togglePause: () => setPaused((p) => !p),
  };
}
