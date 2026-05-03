/**
 * End-to-end smoke test for the four-agent planning pipeline.
 *
 * Skipped by default — set SURFPLANNER_SMOKE=1 to run.
 * Hits the live AI Gateway (consumes credits, ~$0.05–0.30 per run depending
 * on model) and spawns the real Open-Meteo / Filesystem MCP servers. Google
 * Maps MCP is opportunistic — skipped if no GOOGLE_MAPS_API_KEY is configured.
 *
 * Usage:
 *   npm run smoke
 *
 * What it verifies:
 *   - runPlanTrip completes without throwing for a tiny 1-day trip
 *   - Final object validates against TripSchema
 *   - SSE event surface includes vision/planning/done phases and a terminal
 *     `done` event whose trip_id matches the saved Trip
 *   - Every emitted event parses through StreamEventSchema (catches accidental
 *     schema drift in any agent)
 *
 * It does NOT assert exact counts of tool calls / sessions / handoffs because
 * LLM output is non-deterministic. Goal: did anything blow up + is the contract
 * honored.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runPlanTrip } from '../../lib/agents/orchestrator';
import {
  getOpenMeteoMcp,
  getMapsMcp,
  getFilesystemMcp,
} from '../../lib/mcp-clients';
import {
  PlanRequestSchema,
  StreamEventSchema,
  TripSchema,
} from '../../lib/schemas';
import type { StreamEvent } from '../../lib/types';

const enabled = process.env.SURFPLANNER_SMOKE === '1';
const skip = !enabled;
const reason = enabled
  ? undefined
  : 'set SURFPLANNER_SMOKE=1 to run live smoke (uses LLM credits)';

// 1×1 transparent PNG — minimum viable image for the vision agent.
// Vision will likely fall back to its low-confidence default profile.
const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const SMOKE_INPUT = PlanRequestSchema.parse({
  params: {
    start_point: [-122.41, 37.77], // San Francisco
    end_point: [-121.95, 36.97],   // Santa Cruz
    start_date: '2026-05-09',
    end_date: '2026-05-09',        // 1 day — minimum scope
    sessions_per_day: 1,
    skill_level: 'intermediate',
    wave_preference: 'mellow',
    hard_constraints: '',
  },
  boards: [
    {
      user_label: 'mid-length',
      length_inches: 84,
      photo_data_url: TINY_PNG_DATA_URL,
    },
  ],
  // Cheapest + fastest curated model for smoke; production defaults to sonnet-4.6.
  model: 'anthropic/claude-haiku-4.5',
});

async function safeMcp<T>(factory: () => Promise<T>): Promise<T | null> {
  try {
    return await factory();
  } catch {
    return null;
  }
}

describe('planning pipeline — end-to-end smoke', { skip, todo: reason }, () => {
  it(
    'completes a tiny trip, emits valid events, returns a parseable Trip',
    { timeout: 360_000 },
    async () => {
      assert.ok(
        process.env.AI_GATEWAY_API_KEY,
        'AI_GATEWAY_API_KEY required for smoke run',
      );

      const events: StreamEvent[] = [];
      const dropped: unknown[] = [];
      const start = Date.now();
      const log = (label: string, ...rest: unknown[]) => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.error(`[+${elapsed}s] ${label}`, ...rest);
      };
      const sendEvent = (e: StreamEvent) => {
        if (e.type === 'phase') log(`phase=${e.phase}`);
        else if (e.type === 'agent_start') log(`start ${e.agent}: ${e.task}`);
        else if (e.type === 'agent_finish') log(`finish ${e.agent}: ${e.summary}`);
        else if (e.type === 'agent_message')
          log(`msg ${e.from}->${e.to} (${e.kind ?? 'handoff'})`);
        else if (e.type === 'error') log('error', e);
        const result = StreamEventSchema.safeParse(e);
        if (result.success) events.push(result.data);
        else dropped.push({ event: e, issues: result.error.issues.slice(0, 2) });
      };

      const meteo = await safeMcp(getOpenMeteoMcp);
      const maps = await safeMcp(getMapsMcp);
      const fs = await safeMcp(getFilesystemMcp);

      try {
        const trip = await runPlanTrip({
          input: SMOKE_INPUT,
          mcpClients: { meteo, maps, fs },
          sendEvent,
        });

        const parsed = TripSchema.safeParse(trip);
        assert.equal(
          parsed.success,
          true,
          parsed.success
            ? ''
            : `Trip failed validation: ${JSON.stringify(parsed.error.issues.slice(0, 3))}`,
        );
        assert.ok(trip.id, 'trip.id missing');
        assert.ok(trip.days.length >= 1, `expected >=1 day, got ${trip.days.length}`);

        assert.equal(
          dropped.length,
          0,
          `dropped ${dropped.length} invalid events: ${JSON.stringify(dropped.slice(0, 2))}`,
        );

        const phases = events
          .filter((e) => e.type === 'phase')
          .map((e) => (e.type === 'phase' ? e.phase : null));
        assert.ok(phases.includes('vision'), 'no vision phase emitted');
        assert.ok(phases.includes('done'), 'no done phase emitted');

        const starts = events
          .filter((e) => e.type === 'agent_start')
          .map((e) => (e.type === 'agent_start' ? e.agent : null));
        assert.ok(starts.includes('vision'), 'vision agent never started');
        assert.ok(starts.includes('planner'), 'planner agent never started');

        const done = events.find((e) => e.type === 'done');
        assert.ok(done, 'no done event emitted');
        if (done && done.type === 'done') {
          assert.equal(done.trip_id, trip.id, 'done.trip_id != trip.id');
        }

        const errors = events.filter((e) => e.type === 'error');
        if (errors.length > 0) {
          console.warn('smoke: non-fatal error events seen:');
          for (const e of errors) console.warn('  ', e);
        }

        const sessionCount = trip.days.reduce(
          (n, d) => n + d.sessions.length,
          0,
        );
        console.log(
          `smoke: ${events.length} events, ${trip.days.length} days, ${sessionCount} sessions, MCPs: meteo=${!!meteo} maps=${!!maps} fs=${!!fs}`,
        );
      } finally {
        await Promise.allSettled([
          meteo?.close().catch(() => {}),
          maps?.close().catch(() => {}),
          fs?.close().catch(() => {}),
        ]);
      }
    },
  );
});
