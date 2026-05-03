import { nanoid } from 'nanoid';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { kv } from '@/lib/kv';
import type { PlanRequest, SendEvent, Trip, TripDay } from '@/lib/types';
import { RateLimiter, type RateLimits } from '@/lib/rate-limiter';
import { runVisionAgent } from './vision';
import { runReconAgent } from './recon';
import { runPlannerAgent } from './planner';
import { runNarratorAgent } from './narrator';

export type McpClients = {
  meteo: Client | null;
  maps: Client | null;
  fs: Client | null;
};

const TRIP_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function runPlanTrip(opts: {
  input: PlanRequest;
  mcpClients: McpClients;
  sendEvent: SendEvent;
  rateLimits?: RateLimits;
}): Promise<Trip> {
  const { input, mcpClients, sendEvent } = opts;
  const tripId = nanoid(8);
  const rateLimiter = new RateLimiter(opts.rateLimits);

  // Phase 1: Vision (parallel per board)
  const boards = await runVisionAgent({
    boards: input.boards,
    sendEvent,
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
  });

  // Handoff recon → planner
  sendEvent({
    type: 'agent_message',
    from: 'recon',
    to: 'planner',
    content: recon.text,
  });

  // Phase 3: Planning
  const planning = await runPlannerAgent({
    params: input.params,
    boards,
    reconReport: recon.text,
    mapsMcp: mcpClients.maps,
    sendEvent,
    rateLimiter,
  });

  // Handoff planner → narrator
  sendEvent({
    type: 'agent_message',
    from: 'planner',
    to: 'narrator',
    content: planning.text,
  });

  // Phase 4: Narration + Export
  const narration = await runNarratorAgent({
    params: input.params,
    boards,
    days: planning.days,
    fsMcp: mcpClients.fs,
    sendEvent,
    rateLimiter,
  });

  // Phase 5: Assemble + save
  const trip: Trip = {
    id: tripId,
    created_at: new Date().toISOString(),
    params: input.params,
    quiver: boards,
    days: planning.days,
    route_geojson: buildRouteGeoJSON(input, planning.days),
    summary_md: narration.summary_md,
    caveats: narration.caveats,
  };

  await kv.set(`trip:${tripId}`, trip, { ex: TRIP_TTL_SECONDS });

  sendEvent({ type: 'phase', phase: 'done' });
  sendEvent({ type: 'done', trip_id: tripId, trip });

  return trip;
}

function buildRouteGeoJSON(input: PlanRequest, days: TripDay[]) {
  const points: Array<[number, number]> = [input.params.start_point];
  for (const day of days) {
    if (day.overnight) {
      points.push(day.overnight.coords);
    } else if (day.sessions.length > 0) {
      // last session of last day, when no overnight is set
      points.push(input.params.end_point);
    }
  }
  if (
    points.length === 0 ||
    points[points.length - 1][0] !== input.params.end_point[0] ||
    points[points.length - 1][1] !== input.params.end_point[1]
  ) {
    points.push(input.params.end_point);
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'route' },
        geometry: { type: 'LineString', coordinates: points },
      },
      ...days.flatMap((day) =>
        day.sessions.map((s) => ({
          type: 'Feature',
          properties: {
            kind: 'session',
            day_number: day.day_number,
            spot_id: s.spot_id,
            spot_name: s.spot_name,
            time_window: s.time_window,
          },
          geometry: { type: 'Point', coordinates: [0, 0] },
        })),
      ),
    ],
  };
}
