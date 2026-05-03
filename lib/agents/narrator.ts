import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { BoardProfile, SendEvent, TripDay, TripParams } from '@/lib/types';
import type { RateLimiter } from '@/lib/rate-limiter';
import { narratorToolset } from '@/lib/tools';
import { newRecordedPlan } from '@/lib/tools/record';
import { runAgent } from './runner';

const SYSTEM_PROMPT = `You are the Narrator agent on a four-agent California surf trip planning team.

The Planner agent has finalized the day-by-day itinerary (provided to you below). Your role is to:
1. Draft a human-readable markdown summary of the trip.
2. Write three artifacts to the ./exports directory using write_file (filesystem MCP):
   - trip-summary.md — the markdown summary the user can paste into Notion or email. Include: trip overview, day-by-day breakdown with each session's spot/board/time/reasoning, overnight cities, drives, and any caveats.
   - route.geojson — a GeoJSON FeatureCollection containing a LineString through the trip's day endpoints (start → day endings → final), plus Point features for each session spot with day_number and spot_name properties.
   - sessions.ics — an iCalendar file with one VEVENT per session. SUMMARY="Surf at {spot_name}" with DESCRIPTION holding the reasoning. Use today's TZID PST.

The exact JSON of the plan, plus the user's parameters and quiver, are in the user message. Use them faithfully — don't invent sessions or spots that aren't in the plan.

When you're done writing all three files, write a final 60-word response describing the artifacts you produced.`;

export async function runNarratorAgent(opts: {
  params: TripParams;
  boards: BoardProfile[];
  days: TripDay[];
  fsMcp: Client | null;
  sendEvent: SendEvent;
  rateLimiter?: RateLimiter;
  model?: string;
  maxSteps?: number;
}): Promise<{ text: string; summary_md: string; caveats: string[] }> {
  const { params, boards, days, sendEvent } = opts;

  sendEvent({ type: 'phase', phase: 'narration' });
  sendEvent({
    type: 'agent_start',
    agent: 'narrator',
    task: 'Draft trip summary and write export artifacts',
  });

  const tools = await narratorToolset({
    agent: 'narrator',
    sendEvent,
    plan: newRecordedPlan(),
    meteoMcp: null,
    mapsMcp: null,
    fsMcp: opts.fsMcp,
    rateLimiter: opts.rateLimiter,
  });

  const prompt = [
    `Trip parameters:`,
    JSON.stringify(params, null, 2),
    ``,
    `Quiver:`,
    JSON.stringify(boards, null, 2),
    ``,
    `Final day-by-day plan (Planner output):`,
    JSON.stringify(days, null, 2),
    ``,
    `Write trip-summary.md, route.geojson, and sessions.ics into the ./exports directory now.`,
  ].join('\n');

  const result = await runAgent({
    agent: 'narrator',
    model: opts.model,
    system: SYSTEM_PROMPT,
    prompt,
    tools,
    maxSteps: opts.maxSteps ?? 12,
    sendEvent,
  });

  const summary_md = extractMarkdownBlock(result.text) ?? result.text;
  const caveats = extractCaveats(result.text);

  sendEvent({
    type: 'agent_finish',
    agent: 'narrator',
    summary: 'Wrote trip-summary.md, route.geojson, sessions.ics',
  });

  return { text: result.text, summary_md, caveats };
}

function extractMarkdownBlock(text: string): string | null {
  const fenceMatch = text.match(/```(?:markdown|md)\n([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1].trim() : null;
}

function extractCaveats(text: string): string[] {
  const lines = text.split('\n');
  return lines
    .filter((l) => /^(\s*[-•]\s+|caveat:|warning:|note:)/i.test(l))
    .map((l) => l.replace(/^[\s\-•]+/, '').trim())
    .filter(Boolean)
    .slice(0, 6);
}
