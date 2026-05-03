"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  AgentName,
  Phase,
  StreamEvent,
  Trip,
  TripDay,
} from "@/lib/types";
import type { TripDayMarker } from "@/lib/spots";

/**
 * In-flight or resolved tool call. The hook pairs `tool_call` events with
 * matching `tool_result` events (by agent + name) and exposes them as a
 * single chip the UI can render.
 */
export type ToolCallState = {
  agent: AgentName;
  name: string;
  source: "local" | "mcp:open-meteo" | "mcp:google-maps" | "mcp:filesystem";
  args: unknown;
  /** ISO offset/sequence so renders can keep order stable. */
  index: number;
  /** Set when the matching tool_result has been received. */
  resultSummary?: string;
  resolved: boolean;
};

export type DataObservation = {
  agent: AgentName;
  kind: "spot" | "forecast" | "route" | "tide" | "buoy" | "place";
  summary: string;
  spot_id?: string;
  score?: number;
  index: number;
};

export type AgentMessage = {
  from: AgentName;
  to: AgentName;
  content: string;
  index: number;
};

export type AgentLifecycleState = "idle" | "active" | "thinking" | "finished";

export type AgentDerivedState = {
  state: AgentLifecycleState;
  currentTask?: string;
  /** Accumulates from `agent_thinking` events. */
  thinkingText?: string;
  /** Set on `agent_finish`. */
  summary?: string;
  /** Tool calls seen for this agent (in-flight + resolved). */
  activeTools: ToolCallState[];
  /** Data observations attributed to this agent. */
  observations: DataObservation[];
};

export type LiveFeedState = {
  currentPhase: Phase | null;
  agents: Record<AgentName, AgentDerivedState>;
  conversation: AgentMessage[];
  observations: DataObservation[];
  routeGeoJSON: GeoJSON.FeatureCollection | GeoJSON.Feature | null;
  highlightedSpotIds: string[];
  spotScores: Record<string, number>;
  pulsedSpotIds: string[];
  tripDays: TripDayMarker[];
  finalTrip: Trip | null;
  /** True after a `done` event has been seen. */
  isDone: boolean;
};

const ALL_AGENTS: AgentName[] = [
  "orchestrator",
  "vision",
  "recon",
  "planner",
  "narrator",
];

function emptyAgents(): Record<AgentName, AgentDerivedState> {
  const m = {} as Record<AgentName, AgentDerivedState>;
  for (const a of ALL_AGENTS) {
    m[a] = {
      state: "idle",
      activeTools: [],
      observations: [],
    };
  }
  return m;
}

/**
 * Pure reducer over the canonical SSE event stream. Splitting this out from
 * React lets the hook stay a thin `useState` + `useMemo` wrapper, and lets
 * unit tests assert exact derived state from a fixture event array.
 */
export function deriveLiveFeedState(events: readonly StreamEvent[]): LiveFeedState {
  const state: LiveFeedState = {
    currentPhase: null,
    agents: emptyAgents(),
    conversation: [],
    observations: [],
    routeGeoJSON: null,
    highlightedSpotIds: [],
    spotScores: {},
    pulsedSpotIds: [],
    tripDays: [],
    finalTrip: null,
    isDone: false,
  };

  const highlightSet = new Set<string>();
  // Track day_complete entries by day_number to dedupe & resolve coords later.
  const dayMarkers: TripDayMarker[] = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    switch (ev.type) {
      case "phase": {
        state.currentPhase = ev.phase;
        break;
      }
      case "agent_start": {
        const a = state.agents[ev.agent];
        a.state = "active";
        a.currentTask = ev.task;
        break;
      }
      case "agent_thinking": {
        const a = state.agents[ev.agent];
        a.state = a.state === "finished" ? "finished" : "thinking";
        a.thinkingText = (a.thinkingText ?? "") + ev.text;
        break;
      }
      case "agent_finish": {
        const a = state.agents[ev.agent];
        a.state = "finished";
        a.summary = ev.summary;
        break;
      }
      case "agent_message": {
        state.conversation.push({
          from: ev.from,
          to: ev.to,
          content: ev.content,
          index: i,
        });
        break;
      }
      case "tool_call": {
        const a = state.agents[ev.agent];
        a.activeTools.push({
          agent: ev.agent,
          name: ev.name,
          source: ev.source,
          args: ev.args,
          index: i,
          resolved: false,
        });
        break;
      }
      case "tool_result": {
        const a = state.agents[ev.agent];
        // Resolve the most recent unresolved tool call with matching name.
        for (let j = a.activeTools.length - 1; j >= 0; j--) {
          const t = a.activeTools[j];
          if (!t.resolved && t.name === ev.name) {
            t.resolved = true;
            t.resultSummary = ev.summary;
            break;
          }
        }
        break;
      }
      case "data_observed": {
        const obs: DataObservation = {
          agent: ev.agent,
          kind: ev.kind,
          summary: ev.summary,
          spot_id: ev.spot_id,
          score: ev.score,
          index: i,
        };
        state.observations.push(obs);
        state.agents[ev.agent].observations.push(obs);
        if (ev.spot_id) {
          if (!highlightSet.has(ev.spot_id)) {
            highlightSet.add(ev.spot_id);
            state.highlightedSpotIds.push(ev.spot_id);
          }
          if (typeof ev.score === "number") {
            state.spotScores[ev.spot_id] = ev.score;
          }
          // Mark as freshly pulsed; consumer trims after a TTL via the hook.
          state.pulsedSpotIds.push(ev.spot_id);
        }
        if (ev.kind === "route") {
          // The fixture stuffs a GeoJSON FeatureCollection into `summary`'s
          // sibling channel via a follow-up `data_observed` of kind:'route'
          // with the geometry encoded in args. To keep the schema strict,
          // the demo emits the GeoJSON via a `done` event's trip.route_geojson
          // OR pre-stages it via a side-channel — see consumers.
        }
        break;
      }
      case "day_complete": {
        const day = ev.day;
        // Use the first session's spot as the day's anchor pin.
        const firstSession = day.sessions[0];
        if (firstSession) {
          dayMarkers.push({
            spotId: firstSession.spot_id,
            dayIndex: day.day_number,
            label: `Day ${day.day_number} · ${firstSession.spot_name}`,
          });
        }
        break;
      }
      case "done": {
        state.finalTrip = ev.trip;
        state.currentPhase = "done";
        state.isDone = true;
        const rg = ev.trip.route_geojson as
          | GeoJSON.FeatureCollection
          | GeoJSON.Feature
          | null
          | undefined;
        if (rg) state.routeGeoJSON = rg;
        // Backfill day markers from the final trip if none yet.
        if (dayMarkers.length === 0) {
          for (const d of ev.trip.days as TripDay[]) {
            const s = d.sessions[0];
            if (s) {
              dayMarkers.push({
                spotId: s.spot_id,
                dayIndex: d.day_number,
                label: `Day ${d.day_number} · ${s.spot_name}`,
              });
            }
          }
        }
        // Mark every agent as finished if they were still active.
        for (const a of ALL_AGENTS) {
          if (state.agents[a].state !== "idle") {
            state.agents[a].state = "finished";
          }
        }
        break;
      }
      case "vision_progress":
      case "error":
        // Not modeled in the demo derivation yet.
        break;
    }
  }

  state.tripDays = dayMarkers;
  return state;
}

/**
 * React hook wrapper. Computes `deriveLiveFeedState` from `events`, and trims
 * `pulsedSpotIds` after `pulseTtlMs` so the pulse animation auto-clears.
 *
 * `routeGeoJSON` may also be provided directly by the caller (for demos that
 * pre-build a polyline) — when set, it overrides whatever the reducer found.
 */
export function useLiveFeed(
  events: readonly StreamEvent[],
  options?: {
    pulseTtlMs?: number;
    routeGeoJSONOverride?:
      | GeoJSON.FeatureCollection
      | GeoJSON.Feature
      | null;
  },
): LiveFeedState {
  const ttl = options?.pulseTtlMs ?? 2000;

  const derived = useMemo(() => deriveLiveFeedState(events), [events]);

  const [pulseClearedBefore, setPulseClearedBefore] = useState(0);

  // When new pulses come in, schedule a clear. We track a low-water-mark
  // (`pulseClearedBefore`) and filter the derived list — works for both
  // accumulating fixtures and live SSE.
  useEffect(() => {
    if (derived.observations.length === 0) return;
    const lastObsIndex = derived.observations[derived.observations.length - 1]
      .index;
    const t = setTimeout(() => {
      setPulseClearedBefore((prev) => Math.max(prev, lastObsIndex + 1));
    }, ttl);
    return () => clearTimeout(t);
  }, [derived.observations, ttl]);

  // Final state: mask out cleared pulses + apply route override.
  const masked = useMemo<LiveFeedState>(() => {
    const livePulses = derived.observations
      .filter((o) => o.index >= pulseClearedBefore && o.spot_id)
      .map((o) => o.spot_id as string);
    return {
      ...derived,
      pulsedSpotIds: livePulses,
      routeGeoJSON: options?.routeGeoJSONOverride ?? derived.routeGeoJSON,
    };
  }, [derived, pulseClearedBefore, options?.routeGeoJSONOverride]);

  return masked;
}
