/**
 * UI consumer contract for `POST /api/plan` (SSE).
 *
 * This test documents what the UI expects from the live planning stream so the
 * backend can target a stable surface and the UI can wire `live-feed` against
 * it without surprises. Today it is a placeholder skipped via env-gated infra
 * (the runner only executes `tests/integration/*.integration.test.ts` when
 * `SURFPLANNER_INTEGRATION=1`); the body is also wrapped in
 * `it('...', { skip: true }, ...)` until `/api/plan` is live.
 *
 * What the UI relies on:
 *
 * 1. Request shape — `PlanRequest` from `lib/schemas.ts`:
 *      { params: TripParams, boards: BoardInput[1..4] }
 *    Sent as `Content-Type: application/json`.
 *
 * 2. Response — `text/event-stream`. Each event is one JSON-encoded
 *    `StreamEvent` (see `StreamEventSchema`) inside SSE framing:
 *
 *        data: {"type":"phase","phase":"recon"}\n\n
 *
 * 3. Event ordering the UI assumes:
 *      - `phase` events bracket each agent stage.
 *      - At least one `agent_start` precedes the agent's tool/thinking events.
 *      - `tool_call` events always pair with a corresponding `tool_result`.
 *      - `agent_message` carries inter-agent handoffs (rendered as the
 *        collaboration in the live-feed UI).
 *      - Stream terminates with exactly one `done` (carrying full Trip + id)
 *        OR exactly one `error`. After that the connection closes.
 *
 * 4. Trip fetched at `/api/trips/[id]` after `done` MUST equal `done.trip`.
 *
 * TODO: implement when /api/plan is live. Replace the skipped body with:
 *   - POST a minimal valid PlanRequest
 *   - read the stream chunk-by-chunk
 *   - parse each `data: ...\n\n` frame with StreamEventSchema
 *   - assert ordering invariants above
 *   - assert final `done` event Trip parses with TripSchema
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PlanRequestSchema, TripSchema, StreamEventSchema } from '../../lib/schemas';
import type { PlanRequest } from '../../lib/types';

const PLAN_URL =
  process.env.PLAN_API_URL ?? 'http://localhost:3000/api/plan';

const SAMPLE_REQUEST: PlanRequest = {
  params: {
    start_point: [-122.42, 37.77],
    end_point: [-117.16, 32.71],
    start_date: '2026-05-09',
    end_date: '2026-05-11',
    sessions_per_day: 2,
    skill_level: 'intermediate',
    wave_preference: 'mixed',
    hard_constraints: '',
  },
  boards: [
    {
      user_label: 'daily driver',
      length_inches: 72,
      // 1x1 transparent PNG
      photo_data_url:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
    },
  ],
};

describe('POST /api/plan SSE contract (UI consumer)', () => {
  it('sample request shape parses against PlanRequestSchema', () => {
    // Sanity: the fixture above is what the live-feed UI would POST. If this
    // ever fails, the schema and the UI form are out of sync — fix one.
    const parsed = PlanRequestSchema.parse(SAMPLE_REQUEST);
    assert.equal(parsed.boards.length, 1);
  });

  it(
    'streams phase → agent_start → tool_call/result → agent_message → done',
    { skip: 'TODO: implement when /api/plan is live' },
    async () => {
      const res = await fetch(PLAN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SAMPLE_REQUEST),
      });
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') ?? '', /text\/event-stream/);

      const reader = res.body?.getReader();
      assert.ok(reader, 'response body must be a readable stream');

      const decoder = new TextDecoder();
      let buffer = '';
      const events: unknown[] = [];

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          if (frame.startsWith('data:')) {
            const json = frame.slice(5).trim();
            events.push(StreamEventSchema.parse(JSON.parse(json)));
          }
        }
      }

      const last = events.at(-1) as { type: string };
      assert.ok(
        last?.type === 'done' || last?.type === 'error',
        'stream must terminate with done or error',
      );
      if (last.type === 'done') {
        TripSchema.parse((last as unknown as { trip: unknown }).trip);
      }
    },
  );
});
