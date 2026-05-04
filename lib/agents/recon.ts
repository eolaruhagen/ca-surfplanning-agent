import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { BoardProfile, SendEvent, TripParams } from '@/lib/types';
import type { RateLimiter } from '@/lib/rate-limiter';
import { reconToolset } from '@/lib/tools';
import { newRecordedPlan } from '@/lib/tools/record';
import { runAgent } from './runner';

function buildSystemPrompt(params: TripParams): string {
  const today = new Date().toISOString().slice(0, 10);
  return `You are the Recon agent on a four-agent California surf trip planning team.

CRITICAL DATE CONTEXT — use these EXACT values, never invent dates:
- Today's date: ${today}
- Trip start: ${params.start_date}
- Trip end: ${params.end_date}
ALL start_date/end_date values you pass to weather_forecast, marine_weather, score_spot_fit, etc. MUST be inside ${params.start_date}..${params.end_date}. Never use any year other than ${params.start_date.slice(0, 4)}.
` + SYSTEM_PROMPT_BODY;
}

const SYSTEM_PROMPT_BODY = `

Your role is to discover candidate surf spots inside the trip's geographic bounds and identify which spot+time combinations look strongest given the swell, wind, and tide forecasts.

You hand off to the Planner agent. The Planner will read your final summary plus the score data you produced via tools, and assemble the day-by-day itinerary. Be specific so the Planner can sequence days with confidence.

Use the tools systematically:
1. list_candidate_spots — enumerate spots within the trip route, optionally filtered by skill level
2. lookup_spot — when you need full details (ideal conditions, hazards) for a candidate
3. score_spot_fit — for each promising spot, score it at 1–3 representative times per day across the trip days. Mornings (around 7–8 AM) are usually best for offshore winds.
4. get_buoy_reading — if useful, sanity-check forecast against observed swell at a regional buoy
5. get_tide_predictions — when a spot has a strong tide preference

Be efficient. Don't score every spot at every hour — pick the best handful and explore them at the most promising times. Aim for about 8–15 score_spot_fit calls total across the run.

When done, write a final response (under 200 words) summarizing:
- Total spots considered
- Peak day(s) and what makes them peak
- Top 6–10 spot+time candidates with scores
- Any conditions caveats the planner should know

Do not call record_session or record_overnight — those are the Planner's tools.`;

export async function runReconAgent(opts: {
  params: TripParams;
  boards: BoardProfile[];
  meteoMcp: Client | null;
  sendEvent: SendEvent;
  rateLimiter?: RateLimiter;
  model?: string;
  maxSteps?: number;
}): Promise<{ text: string }> {
  const { params, boards, sendEvent } = opts;

  sendEvent({ type: 'phase', phase: 'recon' });
  sendEvent({
    type: 'agent_start',
    agent: 'recon',
    task: 'Discover candidate spots and score peak time windows',
  });

  const tools = await reconToolset({
    agent: 'recon',
    sendEvent,
    plan: newRecordedPlan(),
    meteoMcp: opts.meteoMcp,
    mapsMcp: null,
    fsMcp: null,
    rateLimiter: opts.rateLimiter,
  });

  const prompt = [
    `Trip parameters:`,
    `- Start: lon=${params.start_point[0]}, lat=${params.start_point[1]}`,
    `- End: lon=${params.end_point[0]}, lat=${params.end_point[1]}`,
    `- Dates: ${params.start_date} through ${params.end_date}`,
    `- ${params.sessions_per_day} session(s) per day`,
    `- Skill level: ${params.skill_level}`,
    `- Wave preference: ${params.wave_preference}`,
    params.hard_constraints ? `- Hard constraints: ${params.hard_constraints}` : null,
    ``,
    `User's quiver:`,
    ...boards.map((b) => `- ${b.user_label} (${b.length_inches}" ${b.board_type}, ideal ${b.ideal_conditions.wave_height_ft[0]}–${b.ideal_conditions.wave_height_ft[1]}ft ${b.ideal_conditions.wave_quality})`),
    ``,
    `Find the spots and time windows the Planner should build the trip around.`,
  ].filter(Boolean).join('\n');

  const result = await runAgent({
    agent: 'recon',
    model: opts.model,
    system: buildSystemPrompt(params),
    prompt,
    tools,
    maxSteps: opts.maxSteps ?? 18,
    sendEvent,
  });

  sendEvent({
    type: 'agent_finish',
    agent: 'recon',
    summary: 'Recon complete; report ready for planner',
  });

  return result;
}
