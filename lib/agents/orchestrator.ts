import { nanoid } from 'nanoid';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { kv } from '@/lib/kv';
import type { PlanRequest, SendEvent, SurfPlannerModel, Trip, TripDay } from '@/lib/types';
import { RateLimiter, type RateLimits } from '@/lib/rate-limiter';
import { loadSpots } from '@/lib/tools/spots';
import { runVisionAgent } from './vision';
import { runReconAgent } from './recon';
import { runPlannerAgent } from './planner';
import { runNarratorAgent } from './narrator';
import { summarizeForHandoff } from './handoff';

export type McpClients = {
  meteo: Client | null;
  maps: Client | null;
  fs: Client | null;
};

const TRIP_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const DEFAULT_PLANNER_MODEL: SurfPlannerModel = 'anthropic/claude-haiku-4.5';

export async function runPlanTrip(opts: {
  input: PlanRequest;
  mcpClients: McpClients;
  sendEvent: SendEvent;
  rateLimits?: RateLimits;
}): Promise<Trip> {
  const { input, mcpClients, sendEvent } = opts;
  const tripId = nanoid(8);
  const rateLimiter = new RateLimiter(opts.rateLimits);
  const model = input.model ?? DEFAULT_PLANNER_MODEL;

  // Phase 1: Vision (parallel per board)
  const boards = await runVisionAgent({
    boards: input.boards,
    sendEvent,
    model,
  });

  // Handoff vision → recon
  sendEvent({
    type: 'agent_message',
    from: 'vision',
    to: 'recon',
    content: `Identified ${boards.length} board${boards.length === 1 ? '' : 's'}: ${boards.map((b) => `${b.user_label} (${b.board_type}, ${b.length_inches}")`).join(', ')}. Ideal conditions vary — check each board's profile before matching to a session.`,
  });

  // Phase 2: Recon
  const recon = await runReconAgent({
    params: input.params,
    boards,
    meteoMcp: mcpClients.meteo,
    sendEvent,
    rateLimiter,
    model,
  });

  // Handoff recon → planner (summarized to keep planner's prompt bounded)
  const reconHandoff = summarizeForHandoff(recon.text);
  sendEvent({
    type: 'agent_message',
    from: 'recon',
    to: 'planner',
    content: reconHandoff,
    kind: 'handoff',
  });

  // Phase 3: Planning
  const planning = await runPlannerAgent({
    params: input.params,
    boards,
    reconReport: reconHandoff,
    mapsMcp: mcpClients.maps,
    meteoMcp: mcpClients.meteo,
    sendEvent,
    rateLimiter,
    model,
  });

  // Handoff planner → narrator (summarized)
  const plannerHandoff = summarizeForHandoff(planning.text);
  sendEvent({
    type: 'agent_message',
    from: 'planner',
    to: 'narrator',
    content: plannerHandoff,
    kind: 'handoff',
  });

  // Phase 4: Narration + Export
  const narration = await runNarratorAgent({
    params: input.params,
    boards,
    days: planning.days,
    fsMcp: mcpClients.fs,
    sendEvent,
    rateLimiter,
    model,
  });

  // Phase 5: Assemble + save (with real spot coords resolved from spots.json)
  const enrichedDays = await enrichSessionsWithCoords(planning.days);
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
}

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
    if (day.overnight) {
      linePoints.push(day.overnight.coords);
    }
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
