import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { BoardProfile, SendEvent, TripDay, TripParams } from '@/lib/types';
import type { RateLimiter } from '@/lib/rate-limiter';
import { plannerToolset } from '@/lib/tools';
import { newRecordedPlan, plannedDays, type RecordedPlan } from '@/lib/tools/record';
import { ConsultationBudget } from '@/lib/consultation-budget';
import { runAgent } from './runner';

const SYSTEM_PROMPT = `You are the Planner agent on a four-agent California surf trip planning team.

The Recon agent has already discovered candidate spots and scored time windows. Their final report is in the user message below. Your role is to read that report and assemble the day-by-day itinerary.

You hand off to the Narrator agent, who will write the trip summary and export artifacts. Build a plan worth narrating.

Use these tools:
- lookup_spot — get full details for a spot (hazards, recommended boards, crowd factor) before committing it to a session
- directions (Google Maps MCP) — call this BEFORE finalizing a day's sequence to verify the drive is feasible; returns duration + distance. If driving from day N's last spot to day N+1's first spot exceeds 3 hours, you MUST adjust: pick a closer alternate, move the overnight town, or drop a session. Never record a drive you haven't verified with this tool.
- places_search (Google Maps MCP) — find overnight towns near a coordinate (e.g. "coastal town near Santa Barbara, CA"). Pick towns that position you within ~30 minutes of the next morning's first session.
- record_session — commit a session to the itinerary; call once per session in chronological order
- record_overnight — record where the user sleeps after each non-final day
- record_drive — record drive time + distance from a day's last spot to the next day's first spot; always call this after directions
- consult_agent — ask the recon agent a focused question (skill safety, condition sanity check) or the narrator for tone advice. You have a small budget per run (default 3) — use it sparingly for genuinely uncertain calls, not for routine lookups

Procedure:
1. Read the Recon report. Pick the strongest sessions_per_day combinations for each trip day, biased toward the peak day(s) Recon flagged.
2. For each session, match a board from the user's quiver to the specific conditions: a shortboard (under 6'6") wants punchy/hollow waves (period ≥12s, wind offshore); a midlength or fish wants moderate fun waves; a longboard (9'+) wants mellow, slower rollers; a gun wants large powerful surf (≥8ft). Call lookup_spot to check crowd_factor — when two spots score within 10 points of each other, prefer the less-crowded one.
3. Call record_session for each one, in the order they happen. **pick_reason is mandatory and ≤160 chars** — write a punchy tagline the UI shows during the animated walkthrough (e.g. "Peak swell — 5ft @ 14s, light offshore, low crowds"). The **reasoning field is the long-form explanation** and must cover ALL of the following: (a) exact forecast conditions at session time (wave height, period, wind speed/direction), (b) why this spot over the alternatives Recon surfaced — name at least one rejected alternative and why, (c) which board you matched and precisely why it fits these conditions, (d) crowd factor and any hazards or caveats. Write 5–8 sentences minimum — this feeds the trip narrative.
4. Between consecutive days, call directions(origin=last_session_spot_coords, destination=first_session_next_day_spot_coords) to get actual drive time. If >3 hours, revise the plan. Then call record_drive.
5. Pick an overnight town via places_search, then record_overnight. The town should sit within ~30 min of the next morning's spot.

Constraints:
- Drive times above 3 hours within a day are unacceptable — verify with directions first, then decide.
- Don't put a beginner at expert spots. Honor the user's skill level.
- Honor any hard_constraints in the trip parameters.
- Prefer lower-crowd spots when scores are within 10 points of each other.

When all sessions, overnights, and drives are recorded, write a 100-word final response summarizing your decisions. Do not call write_file — that's the Narrator's job.`;

export async function runPlannerAgent(opts: {
  params: TripParams;
  boards: BoardProfile[];
  reconReport: string;
  mapsMcp: Client | null;
  /** For consult_agent → recon: lets the consultee call open-meteo if needed. */
  meteoMcp?: Client | null;
  sendEvent: SendEvent;
  rateLimiter?: RateLimiter;
  consultationBudget?: ConsultationBudget;
  model?: string;
  maxSteps?: number;
}): Promise<{ text: string; days: TripDay[]; plan: RecordedPlan }> {
  const { params, boards, reconReport, sendEvent } = opts;
  const plan = newRecordedPlan();
  const consultationBudget = opts.consultationBudget ?? new ConsultationBudget(3);

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
    meteoMcp: opts.meteoMcp ?? null,
    mapsMcp: opts.mapsMcp,
    fsMcp: null,
    rateLimiter: opts.rateLimiter,
    consultationBudget,
    model: opts.model,
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
