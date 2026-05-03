import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import {
  SpotSchema,
  PlanRequestSchema,
  StreamEventSchema,
  TripSchema,
  TripParamsSchema,
} from '../lib/schemas';

describe('SpotSchema', () => {
  it('parses every spot in public/spots.json', () => {
    const raw = JSON.parse(readFileSync('public/spots.json', 'utf8'));
    const result = z.array(SpotSchema).safeParse(raw);
    assert.equal(result.success, true, result.success ? '' : JSON.stringify(result.error.issues.slice(0, 3)));
    assert.equal(result.success && result.data.length, 51);
  });
});

describe('PlanRequestSchema', () => {
  it('accepts a well-formed request', () => {
    const ok = PlanRequestSchema.parse({
      params: {
        start_point: [-122.41, 37.77],
        end_point: [-117.16, 32.72],
        start_date: '2026-05-09',
        end_date: '2026-05-13',
        sessions_per_day: 2,
        skill_level: 'intermediate',
        wave_preference: 'mixed',
        hard_constraints: '',
      },
      boards: [
        { user_label: 'shortboard', length_inches: 70, photo_data_url: 'data:image/jpeg;base64,xxx' },
      ],
    });
    assert.equal(ok.boards.length, 1);
  });

  it('rejects too many boards', () => {
    const result = PlanRequestSchema.safeParse({
      params: {
        start_point: [0, 0],
        end_point: [0, 0],
        start_date: '2026-05-09',
        end_date: '2026-05-09',
        sessions_per_day: 1,
        skill_level: 'beginner',
        wave_preference: 'mellow',
        hard_constraints: '',
      },
      boards: Array.from({ length: 5 }, () => ({
        user_label: 'b',
        length_inches: 60,
        photo_data_url: 'x',
      })),
    });
    assert.equal(result.success, false);
  });
});

describe('StreamEventSchema', () => {
  it('parses every documented event variant', () => {
    const samples = [
      { type: 'phase', phase: 'recon' },
      { type: 'agent_start', agent: 'recon', task: 'discover spots' },
      { type: 'agent_finish', agent: 'recon', summary: 'done' },
      { type: 'agent_message', from: 'recon', to: 'planner', content: 'handoff' },
      { type: 'agent_thinking', agent: 'planner', text: 'considering...' },
      { type: 'tool_call', agent: 'recon', name: 'list_candidate_spots', source: 'local', args: {} },
      { type: 'tool_result', agent: 'recon', name: 'list_candidate_spots', summary: '5 spots' },
      { type: 'data_observed', agent: 'recon', kind: 'forecast', summary: 'rincon 4ft' },
      { type: 'error', agent: 'recon', message: 'oh no' },
      { type: 'error', message: 'no agent attribution' },
    ];
    for (const s of samples) {
      const r = StreamEventSchema.safeParse(s);
      assert.equal(r.success, true, `failed: ${JSON.stringify(s)} - ${!r.success ? JSON.stringify(r.error.issues) : ''}`);
    }
  });

  it('rejects unknown agent name', () => {
    const r = StreamEventSchema.safeParse({
      type: 'agent_start',
      agent: 'goblin',
      task: 'mischief',
    });
    assert.equal(r.success, false);
  });

  it('rejects unknown source on tool_call', () => {
    const r = StreamEventSchema.safeParse({
      type: 'tool_call',
      agent: 'recon',
      name: 'foo',
      source: 'mcp:weather',
      args: {},
    });
    assert.equal(r.success, false);
  });
});

describe('TripSchema', () => {
  it('round-trips a minimal valid trip', () => {
    const params = TripParamsSchema.parse({
      start_point: [0, 0],
      end_point: [0, 0],
      start_date: '2026-05-09',
      end_date: '2026-05-09',
      sessions_per_day: 1,
      skill_level: 'beginner',
      wave_preference: 'mellow',
      hard_constraints: '',
    });
    const trip = TripSchema.parse({
      id: 'abc',
      created_at: new Date().toISOString(),
      params,
      quiver: [],
      days: [],
      route_geojson: { type: 'FeatureCollection', features: [] },
      summary_md: '# Trip',
      caveats: [],
    });
    assert.equal(trip.id, 'abc');
  });
});
