import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  __resetSpotCacheForTests,
  __setSpotCacheForTests,
  resolveSelectedSpot,
  loadSpotsClient,
} from './hook';
import type { Spot } from '@/lib/spots';

// ---------- fixtures ----------

const RINCON: Spot = {
  id: 'rincon',
  name: 'Rincon',
  region: 'central-coast',
  lat: 34.37,
  lon: -119.48,
  wave_size_feet: [2, 8],
  skill_level: 'intermediate-advanced',
  wave_character: 'long right point',
  boards_recommended: ['shortboard', 'fish'],
  crowd_factor: 'heavy',
  hazards: ['rocks'],
  notes: 'classic',
  confidence: 'high',
};

const MAVERICKS: Spot = {
  id: 'mavericks',
  name: 'Mavericks',
  region: 'san-francisco',
  lat: 37.49,
  lon: -122.5,
  wave_size_feet: [10, 60],
  skill_level: 'expert',
  wave_character: 'big-wave reef',
  boards_recommended: ['gun'],
  crowd_factor: 'sparse',
  hazards: ['rocks', 'sharks', 'cold'],
  notes: '',
  confidence: 'high',
};

const SPOTS: Spot[] = [RINCON, MAVERICKS];

beforeEach(() => {
  __resetSpotCacheForTests();
});

// ---------- resolveSelectedSpot ----------

describe('resolveSelectedSpot', () => {
  it('returns null when id is null', () => {
    assert.equal(resolveSelectedSpot(SPOTS, null), null);
  });

  it('returns null when spot list is empty', () => {
    assert.equal(resolveSelectedSpot([], 'rincon'), null);
  });

  it('returns null when id is unknown', () => {
    assert.equal(resolveSelectedSpot(SPOTS, 'ghost'), null);
  });

  it('returns the matching spot record', () => {
    assert.equal(resolveSelectedSpot(SPOTS, 'mavericks'), MAVERICKS);
  });
});

// ---------- loadSpotsClient (cached fetch) ----------

describe('loadSpotsClient', () => {
  it('fetches /spots.json on first call', async () => {
    const calls: string[] = [];
    const fetcher = async (url: string) => {
      calls.push(url);
      return SPOTS;
    };
    const out = await loadSpotsClient(fetcher);
    assert.deepEqual(out, SPOTS);
    assert.deepEqual(calls, ['/spots.json']);
  });

  it('caches results across calls — fetcher invoked once', async () => {
    let n = 0;
    const fetcher = async () => {
      n += 1;
      return SPOTS;
    };
    await loadSpotsClient(fetcher);
    await loadSpotsClient(fetcher);
    await loadSpotsClient(fetcher);
    assert.equal(n, 1);
  });

  it('test cache seed bypasses the fetcher entirely', async () => {
    __setSpotCacheForTests(SPOTS);
    let invoked = false;
    const fetcher = async () => {
      invoked = true;
      return [];
    };
    const out = await loadSpotsClient(fetcher);
    assert.equal(invoked, false);
    assert.deepEqual(out, SPOTS);
  });

  it('does not cache failures — next call retries', async () => {
    let attempt = 0;
    const fetcher = async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('boom');
      return SPOTS;
    };
    await assert.rejects(loadSpotsClient(fetcher));
    const out = await loadSpotsClient(fetcher);
    assert.deepEqual(out, SPOTS);
    assert.equal(attempt, 2);
  });
});
