import path from 'path';
import { mkdirSync } from 'fs';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { BoardProfile, SendEvent, TripDay, TripParams } from '@/lib/types';
import type { RateLimiter } from '@/lib/rate-limiter';
import { narratorToolset } from '@/lib/tools';
import { newRecordedPlan } from '@/lib/tools/record';
import { runAgent } from './runner';

const EXPORTS_DIR = path.resolve(process.cwd(), 'exports');

function buildSystemPrompt(exportsDir: string): string {
  return `You are the Narrator agent on a four-agent California surf trip planning team.

The Planner agent has finalized the day-by-day itinerary (provided to you below). Your role is to:
1. Draft a detailed, human-readable markdown summary of the trip.
2. Write three artifacts using write_file (filesystem MCP). The filesystem root is: ${exportsDir}
   IMPORTANT: Pass the full absolute path to write_file, e.g. "${exportsDir}/trip-summary.md"

Files to write:
- ${exportsDir}/trip-summary.md — a rich markdown summary. Include: trip headline, dates, quiver overview, day-by-day breakdown (each session gets its own section with spot name, time window, board choice with rationale, full reasoning from the plan, forecast conditions, and overnight/drive info), plus a final "Conditions & Caveats" section. Be thorough — this is the artifact the user keeps.
- ${exportsDir}/route.geojson — a GeoJSON FeatureCollection with a LineString through the day endpoints (start → overnight coords → end), plus Point features for each session spot with properties: day_number, spot_id, spot_name, time_window.
- ${exportsDir}/sessions.ics — an iCalendar file with one VEVENT per session. SUMMARY="Surf at {spot_name}", DESCRIPTION holds the full reasoning, DTSTART/DTEND use the date and time_window. TZID:America/Los_Angeles.

The exact JSON of the plan, plus the user's parameters and quiver, are in the user message. Use them faithfully — don't invent sessions or spots that aren't in the plan.

When you're done writing all three files, write a final 60-word response listing each artifact and a one-sentence description of what it contains.`;
}

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

  // Ensure the exports directory exists before the filesystem MCP tries to write to it
  mkdirSync(EXPORTS_DIR, { recursive: true });

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
    `Write all three files now using the absolute paths specified in your system prompt. Exports directory: ${EXPORTS_DIR}`,
  ].join('\n');

  const result = await runAgent({
    agent: 'narrator',
    model: opts.model,
    system: buildSystemPrompt(EXPORTS_DIR),
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
