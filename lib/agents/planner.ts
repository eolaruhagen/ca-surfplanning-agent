import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { BoardProfile, SendEvent, TripDay, TripParams } from '@/lib/types';
import type { RateLimiter } from '@/lib/rate-limiter';
import { plannerToolset } from '@/lib/tools';
import { newRecordedPlan, plannedDays, type RecordedPlan } from '@/lib/tools/record';
import { runAgent } from './runner';

const SYSTEM_PROMPT = `You are the Planner agent on a four-agent California surf trip planning team.

The Recon agent has already discovered candidate spots and scored time windows. Their final report is in the user message below. Your role is to read that report and assemble the day-by-day itinerary.

You hand off to the Narrator agent, who will write the trip summary and export artifacts. Build a plan worth narrating.

Use these tools:
- lookup_spot — get full details for a spot (hazards, recommended boards) before committing it to a session
- directions (Google Maps MCP) — driving routes between coords; returns duration + distance
- places_search (Google Maps MCP) — find towns near a coordinate for overnights (query something like "town near {lat,lon}")
- record_session — commit a session to the itinerary; call once per session in chronological order
- record_overnight — record where the user sleeps after each non-final day
- record_drive — record drive time + distance from a day's last spot to the next day's first spot

Procedure:
1. Read the Recon report. Pick the strongest sessions_per_day combinations for each trip day, biased toward the peak day(s) Recon flagged.
2. For each session, match a board from the user's quiver to the conditions (a small shortboard wants punchy waves; a longboard wants mellow rollers).
3. Call record_session for each one, in the order they happen. Use the spot_id and forecast_snapshot you saw from Recon's score_spot_fit calls. **pick_reason is mandatory and must be ≤160 characters** — write a punchy tagline the UI will show when it animates through the trip spot-by-spot (e.g. "Peak swell — 5ft @ 14s, light offshore"). reasoning is the long-form explanation that goes into the markdown summary. spot_coords ([lon, lat]) should be set when known.
4. Between consecutive days, call directions(origin=last_session_coord, destination=first_session_next_day_coord) to compute drive_to_next, then record_drive.
5. Pick an overnight town near each non-final day's end point (places_search), then record_overnight.

Constraints:
- Drive times above 3 hours within a day are unacceptable. If sequencing forces this, drop the session or pick a closer alternate.
- Don't put a beginner at expert spots. Honor the user's skill level.
- Honor any hard_constraints in the trip parameters.

When all sessions, overnights, and drives are recorded, write a 100-word final response summarizing your decisions. Do not call write_file — that's the Narrator's job.`;

export async function runPlannerAgent(opts: {
  params: TripParams;
  boards: BoardProfile[];
  reconReport: string;
  mapsMcp: Client | null;
  sendEvent: SendEvent;
  rateLimiter?: RateLimiter;
  model?: string;
  maxSteps?: number;
}): Promise<{ text: string; days: TripDay[]; plan: RecordedPlan }> {
  const { params, boards, reconReport, sendEvent } = opts;
  const plan = newRecordedPlan();

  sendEvent({ type: 'phase', phase: 'planning' });
  sendEvent({
    type: 'agent_start',
    agent: 'planner',
    task: 'Sequence days and commit sessions, overnights, drives',
  });

  const tools = await plannerToolset({
    agent: 'planner',
    sendEvent,
    plan,
    meteoMcp: null,
    mapsMcp: opts.mapsMcp,
    fsMcp: null,
    rateLimiter: opts.rateLimiter,
  });

  const prompt = [
    `Trip parameters:`,
    `- Start: lon=${params.start_point[0]}, lat=${params.start_point[1]}`,
    `- End: lon=${params.end_point[0]}, lat=${params.end_point[1]}`,
    `- Dates: ${params.start_date} through ${params.end_date}`,
    `- ${params.sessions_per_day} session(s) per day, skill ${params.skill_level}, ${params.wave_preference} preference`,
    params.hard_constraints ? `- Hard constraints: ${params.hard_constraints}` : null,
    ``,
    `Quiver:`,
    ...boards.map((b) => `- ${b.id} (${b.user_label}, ${b.length_inches}" ${b.board_type})`),
    ``,
    `--- Recon report ---`,
    reconReport,
    `--- end report ---`,
    ``,
    `Build the itinerary. Record every session, overnight, and drive.`,
  ].filter(Boolean).join('\n');

  const result = await runAgent({
    agent: 'planner',
    model: opts.model,
    system: SYSTEM_PROMPT,
    prompt,
    tools,
    maxSteps: opts.maxSteps ?? 30,
    sendEvent,
  });

  const days = plannedDays(plan);
  sendEvent({
    type: 'agent_finish',
    agent: 'planner',
    summary: `Itinerary locked: ${days.length} day${days.length === 1 ? '' : 's'}, ${days.reduce((n, d) => n + d.sessions.length, 0)} session(s)`,
  });

  return { text: result.text, days, plan };
}
