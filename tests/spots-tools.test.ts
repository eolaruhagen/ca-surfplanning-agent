import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spotTools, loadSpots } from '../lib/tools/spots';
import { StreamEventSchema } from '../lib/schemas';
import type { StreamEvent } from '../lib/types';

function harness() {
  const events: StreamEvent[] = [];
  const send = (e: StreamEvent) => {
    StreamEventSchema.parse(e);
    events.push(e);
  };
  return { events, tools: spotTools('recon', send) };
}

describe('loadSpots', () => {
  it('parses all 51 spots in public/spots.json', async () => {
    const spots = await loadSpots();
    assert.equal(spots.length, 51);
    assert.ok(spots.every((s) => typeof s.id === 'string' && typeof s.name === 'string'));
  });
});

describe('list_candidate_spots', () => {
  it('filters by region', async () => {
    const { tools } = harness();
    const exec = (tools.list_candidate_spots as any).execute;
    const result = (await exec(
      { region: 'san-francisco', limit: 25 },
      { toolCallId: 't', messages: [] },
    )) as Array<{ region: string }>;
    assert.ok(result.length > 0);
    assert.ok(result.every((s) => s.region === 'san-francisco'));
  });

  it('filters by radius around a coordinate', async () => {
    const { tools } = harness();
    const exec = (tools.list_candidate_spots as any).execute;
    const result = (await exec(
      { near_lat: 34.37, near_lon: -119.48, max_distance_miles: 30 },
      { toolCallId: 't', messages: [] },
    )) as Array<{ name: string }>;
    assert.ok(result.length > 0);
    assert.ok(result.length < 25);
  });
});

describe('lookup_spot', () => {
  it('returns full record for a known id', async () => {
    const { tools } = harness();
    const exec = (tools.lookup_spot as any).execute;
    const result = (await exec({ id: 'mavericks' }, { toolCallId: 't', messages: [] })) as {
      name: string;
    };
    assert.equal(result.name, 'Mavericks');
  });

  it('returns error object for unknown id', async () => {
    const { tools } = harness();
    const exec = (tools.lookup_spot as any).execute;
    const result = (await exec({ id: 'nonexistent' }, { toolCallId: 't', messages: [] })) as {
      error?: string;
    };
    assert.ok(result.error);
  });
});
