/**
 * Vercel Workflow that orchestrates the four-agent planning pipeline.
 *
 * - The workflow function (`planTripWorkflow`) is sandboxed by the workflow
 *   runtime; it only sequences steps, no Node APIs allowed.
 * - Each step (`*Step`) runs in its own Vercel Function invocation, so each
 *   gets its own per-request clock — dodging the 60s Hobby cap.
 * - Steps publish `StreamEvent`s via `getWritable<StreamEvent>()`. The route
 *   handler in `app/api/plan/route.ts` reads `run.readable` and pipes through
 *   SSE framing.
 *
 * For local dev without `vercel dev`, the route handler can fall back to
 * `runPlanTrip` (the inline orchestrator) by setting `USE_WORKFLOWS` to
 * anything other than '1'.
 */

import { getWritable } from 'workflow';
import { nanoid } from 'nanoid';
import { kv } from '@/lib/kv';
import { RateLimiter } from '@/lib/rate-limiter';
import {
  getOpenMeteoMcp,
  getMapsMcp,
  getFilesystemMcp,
} from '@/lib/mcp-clients';
import { loadSpots } from '@/lib/tools/spots';
import { runVisionAgent } from '@/lib/agents/vision';
import { runReconAgent } from '@/lib/agents/recon';
import { runPlannerAgent } from '@/lib/agents/planner';
import { runNarratorAgent } from '@/lib/agents/narrator';
import { summarizeForHandoff } from '@/lib/agents/handoff';
import type {
  AgentName,
  BoardProfile,
  PlanRequest,
  StreamEvent,
  SurfPlannerModel,
  Trip,
  TripDay,
} from '@/lib/types';

const TRIP_TTL_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_MODEL: SurfPlannerModel = 'anthropic/claude-haiku-4.5';

function makeSendEvent(): (event: StreamEvent) => void {
  const writable = getWritable<StreamEvent>();
  const writer = writable.getWriter();
  return (event: StreamEvent) => {
    void writer.write(event);
  };
}

/**
 * Spawn an MCP child process. We *want* the step to fail loudly if the MCP
 * fails to start, since downstream agent calls will then hang waiting on a
 * tool that can never be invoked. Emitting an error event here gives the
 * client a clear signal to display and end the session.
 */
async function spawnMcp<T>(
  factory: () => Promise<T>,
  label: string,
  agent: AgentName,
  sendEvent: (e: StreamEvent) => void,
): Promise<T> {
  try {
    return await factory();
  } catch (err) {
    const message = err instanceof Error ? err.message : `${label} spawn failed`;
    sendEvent({
      type: 'error',
      agent,
      message: `${label} MCP failed to start: ${message}`,
    });
    throw err;
  }
}

/**
 * Wraps a step body so any throw — MCP spawn, listTools timeout, agent
 * timeout, post-processing crash — emits a single, agent-named `error` SSE
 * event before propagating to the workflow runtime. The client treats that
 * event as the session terminator.
 */
async function withStepFailureReporting<T>(
  agent: AgentName,
  sendEvent: (e: StreamEvent) => void,
  body: () => Promise<T>,
): Promise<T> {
  try {
    return await body();
  } catch (err) {
    const message = err instanceof Error ? err.message : `${agent} step failed`;
    sendEvent({ type: 'error', agent, message });
    throw err;
  }
}

// ---- step: vision ----------------------------------------------------------

async function visionStep(input: PlanRequest): Promise<BoardProfile[]> {
  'use step';
  const sendEvent = makeSendEvent();
  return withStepFailureReporting('vision', sendEvent, async () => {
    const model = input.model ?? DEFAULT_MODEL;
    const boards = await runVisionAgent({ boards: input.boards, sendEvent, model });
    sendEvent({
      type: 'agent_message',
      from: 'vision',
      to: 'recon',
      content: `Identified ${boards.length} board${boards.length === 1 ? '' : 's'}: ${boards
        .map((b) => `${b.user_label} (${b.board_type}, ${b.length_inches}")`)
        .join(', ')}.`,
    });
    return boards;
  });
}

// ---- step: recon -----------------------------------------------------------

async function reconStep(input: PlanRequest, boards: BoardProfile[]): Promise<{ text: string }> {
  'use step';
  const sendEvent = makeSendEvent();
  return withStepFailureReporting('recon', sendEvent, async () => {
    const meteoMcp = await spawnMcp(getOpenMeteoMcp, 'Open-Meteo', 'recon', sendEvent);
    const rateLimiter = new RateLimiter();
    const model = input.model ?? DEFAULT_MODEL;
    try {
      const result = await runReconAgent({
        params: input.params,
        boards,
        meteoMcp,
        sendEvent,
        rateLimiter,
        model,
      });
      const handoff = summarizeForHandoff(result.text);
      sendEvent({
        type: 'agent_message',
        from: 'recon',
        to: 'planner',
        content: handoff,
        kind: 'handoff',
      });
      return { text: handoff };
    } finally {
      await meteoMcp?.close().catch(() => {});
    }
  });
}

// ---- step: planner ---------------------------------------------------------

async function plannerStep(
  input: PlanRequest,
  boards: BoardProfile[],
  reconReport: string,
): Promise<{ text: string; days: TripDay[] }> {
  'use step';
  const sendEvent = makeSendEvent();
  return withStepFailureReporting('planner', sendEvent, async () => {
    const mapsMcp = await spawnMcp(getMapsMcp, 'Google Maps', 'planner', sendEvent);
    const meteoMcp = await spawnMcp(getOpenMeteoMcp, 'Open-Meteo', 'planner', sendEvent);
    const rateLimiter = new RateLimiter();
    const model = input.model ?? DEFAULT_MODEL;
    try {
      const result = await runPlannerAgent({
        params: input.params,
        boards,
        reconReport,
        mapsMcp,
        meteoMcp,
        sendEvent,
        rateLimiter,
        model,
      });
      const handoff = summarizeForHandoff(result.text);
      sendEvent({
        type: 'agent_message',
        from: 'planner',
        to: 'narrator',
        content: handoff,
        kind: 'handoff',
      });
      return { text: handoff, days: result.days };
    } finally {
      await mapsMcp?.close().catch(() => {});
      await meteoMcp?.close().catch(() => {});
    }
  });
}

// ---- step: narrate + save --------------------------------------------------

async function narrateAndSaveStep(
  input: PlanRequest,
  boards: BoardProfile[],
  days: TripDay[],
): Promise<Trip> {
  'use step';
  const sendEvent = makeSendEvent();
  return withStepFailureReporting('narrator', sendEvent, async () => {
    const fsMcp = await spawnMcp(getFilesystemMcp, 'Filesystem', 'narrator', sendEvent);
    const rateLimiter = new RateLimiter();
    const model = input.model ?? DEFAULT_MODEL;
    try {
      const narration = await runNarratorAgent({
        params: input.params,
        boards,
        days,
        fsMcp,
        sendEvent,
        rateLimiter,
        model,
      });

      const enrichedDays = await enrichSessionsWithCoords(days);
      const tripId = nanoid(8);
      const trip: Trip = {
        id: tripId,
        created_at: new Date().toISOString(),
        params: input.params,
        quiver: boards,
        days: enrichedDays,
        route_geojson: await buildRouteGeoJSON(input, enrichedDays),
        summary_md: narration.summary_md,
        caveats: narration.caveats,
      };
      await kv.set(`trip:${tripId}`, trip, { ex: TRIP_TTL_SECONDS });

      sendEvent({ type: 'phase', phase: 'done' });
      sendEvent({ type: 'done', trip_id: tripId, trip });
      return trip;
    } finally {
      await fsMcp?.close().catch(() => {});
    }
  });
}

// ---- workflow --------------------------------------------------------------

export async function planTripWorkflow(input: PlanRequest): Promise<{ trip_id: string }> {
  'use workflow';
  const boards = await visionStep(input);
  const recon = await reconStep(input, boards);
  const planning = await plannerStep(input, boards, recon.text);
  const trip = await narrateAndSaveStep(input, boards, planning.days);
  return { trip_id: trip.id };
}

// ---- helpers (called only from steps) -------------------------------------

async function enrichSessionsWithCoords(days: TripDay[]): Promise<TripDay[]> {
  const spots = await loadSpots();
  const byId = new Map(spots.map((s) => [s.id, s] as const));
  return days.map((day) => ({
    ...day,
    sessions: day.sessions.map((s) => {
      if (s.spot_coords) return s;
      const spot = byId.get(s.spot_id);
      return spot ? { ...s, spot_coords: [spot.lon, spot.lat] as [number, number] } : s;
    }),
  }));
}

async function buildRouteGeoJSON(input: PlanRequest, days: TripDay[]) {
  const spots = await loadSpots();
  const byId = new Map(spots.map((s) => [s.id, s] as const));
  const linePoints: Array<[number, number]> = [input.params.start_point];
  for (const day of days) {
    if (day.overnight) linePoints.push(day.overnight.coords);
  }
  const last = linePoints[linePoints.length - 1];
  if (last[0] !== input.params.end_point[0] || last[1] !== input.params.end_point[1]) {
    linePoints.push(input.params.end_point);
  }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'route' },
        geometry: { type: 'LineString', coordinates: linePoints },
      },
      ...days.flatMap((day) =>
        day.sessions.map((s) => {
          const spot = byId.get(s.spot_id);
          const coords =
            s.spot_coords ?? (spot ? ([spot.lon, spot.lat] as [number, number]) : ([0, 0] as [number, number]));
          return {
            type: 'Feature',
            properties: {
              kind: 'session',
              day_number: day.day_number,
              spot_id: s.spot_id,
              spot_name: s.spot_name,
              time_window: s.time_window,
              pick_reason: s.pick_reason,
              fit_score: s.fit_score,
              board_id: s.board_id,
            },
            geometry: { type: 'Point', coordinates: coords },
          };
        }),
      ),
    ],
  };
}
