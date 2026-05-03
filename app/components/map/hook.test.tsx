import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveSelection,
  findSpot,
  createSelectionHandler,
  type FlyableMap,
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
  notes: '',
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

// ---------- resolveSelection ----------

describe('resolveSelection', () => {
  it('uncontrolled when controlled is undefined; uses internal value', () => {
    const r = resolveSelection(undefined, 'rincon');
    assert.equal(r.isControlled, false);
    assert.equal(r.effectiveSelectedId, 'rincon');
  });

  it('controlled when controlled is null; effective is null', () => {
    const r = resolveSelection(null, 'rincon');
    assert.equal(r.isControlled, true);
    assert.equal(r.effectiveSelectedId, null);
  });

  it('controlled when controlled is a string; ignores internal', () => {
    const r = resolveSelection('mavericks', 'rincon');
    assert.equal(r.isControlled, true);
    assert.equal(r.effectiveSelectedId, 'mavericks');
  });
});

// ---------- findSpot ----------

describe('findSpot', () => {
  it('returns null for null id', () => {
    assert.equal(findSpot(SPOTS, null), null);
  });

  it('returns null for unknown id', () => {
    assert.equal(findSpot(SPOTS, 'nope'), null);
  });

  it('returns matching spot record', () => {
    assert.equal(findSpot(SPOTS, 'rincon'), RINCON);
  });
});

// ---------- createSelectionHandler ----------

function makeMap(initialZoom = 6): FlyableMap & {
  flyToCalls: Array<Parameters<FlyableMap['flyTo']>[0]>;
} {
  const calls: Array<Parameters<FlyableMap['flyTo']>[0]> = [];
  return {
    flyTo: (opts) => calls.push(opts),
    getZoom: () => initialZoom,
    flyToCalls: calls,
  };
}

describe('createSelectionHandler', () => {
  it('uncontrolled: calls setInternal AND onSpotSelect with the resolved spot', () => {
    const setInternalCalls: Array<string | null> = [];
    const onSelectCalls: Array<[string | null, Spot | null]> = [];
    const map = makeMap();

    const handler = createSelectionHandler({
      spots: SPOTS,
      isControlled: false,
      setInternal: (id) => setInternalCalls.push(id),
      onSpotSelect: (id, spot) => onSelectCalls.push([id, spot]),
      getMap: () => map,
    });

    handler('rincon');

    assert.deepEqual(setInternalCalls, ['rincon']);
    assert.equal(onSelectCalls.length, 1);
    assert.equal(onSelectCalls[0][0], 'rincon');
    assert.equal(onSelectCalls[0][1], RINCON);
  });

  it('controlled: does NOT call setInternal but still fires onSpotSelect', () => {
    const setInternalCalls: Array<string | null> = [];
    const onSelectCalls: Array<[string | null, Spot | null]> = [];
    const map = makeMap();

    const handler = createSelectionHandler({
      spots: SPOTS,
      isControlled: true,
      setInternal: (id) => setInternalCalls.push(id),
      onSpotSelect: (id, spot) => onSelectCalls.push([id, spot]),
      getMap: () => map,
    });

    handler('mavericks');

    assert.deepEqual(setInternalCalls, []);
    assert.equal(onSelectCalls.length, 1);
    assert.equal(onSelectCalls[0][0], 'mavericks');
    assert.equal(onSelectCalls[0][1], MAVERICKS);
  });

  it('triggers flyTo on the map ref with the spot coords and zoom >= 11', () => {
    const map = makeMap(6);

    const handler = createSelectionHandler({
      spots: SPOTS,
      isControlled: false,
      setInternal: () => {},
      onSpotSelect: () => {},
      getMap: () => map,
    });

    handler('rincon');

    assert.equal(map.flyToCalls.length, 1);
    const call = map.flyToCalls[0];
    assert.deepEqual(call.center, [RINCON.lon, RINCON.lat]);
    assert.equal(call.zoom, 11);
    assert.equal(call.duration, 900);
    assert.equal(call.essential, true);
  });

  it('preserves zoom when current zoom exceeds 11', () => {
    const map = makeMap(15);

    const handler = createSelectionHandler({
      spots: SPOTS,
      isControlled: false,
      setInternal: () => {},
      getMap: () => map,
    });

    handler('rincon');
    assert.equal(map.flyToCalls[0].zoom, 15);
  });

  it('does not flyTo when id is null (clearing selection)', () => {
    const map = makeMap();
    const onSelectCalls: Array<[string | null, Spot | null]> = [];

    const handler = createSelectionHandler({
      spots: SPOTS,
      isControlled: false,
      setInternal: () => {},
      onSpotSelect: (id, spot) => onSelectCalls.push([id, spot]),
      getMap: () => map,
    });

    handler(null);

    assert.equal(map.flyToCalls.length, 0);
    assert.equal(onSelectCalls.length, 1);
    assert.equal(onSelectCalls[0][0], null);
    assert.equal(onSelectCalls[0][1], null);
  });

  it('does not throw when map ref is null (e.g. before mount)', () => {
    const handler = createSelectionHandler({
      spots: SPOTS,
      isControlled: false,
      setInternal: () => {},
      getMap: () => null,
    });

    assert.doesNotThrow(() => handler('rincon'));
  });

  it('does not throw when onSpotSelect is omitted', () => {
    const map = makeMap();
    const handler = createSelectionHandler({
      spots: SPOTS,
      isControlled: false,
      setInternal: () => {},
      getMap: () => map,
    });
    assert.doesNotThrow(() => handler('rincon'));
  });

  it('passes (id, null) to onSpotSelect when id refers to a missing spot', () => {
    const onSelectCalls: Array<[string | null, Spot | null]> = [];
    const map = makeMap();

    const handler = createSelectionHandler({
      spots: SPOTS,
      isControlled: false,
      setInternal: () => {},
      onSpotSelect: (id, spot) => onSelectCalls.push([id, spot]),
      getMap: () => map,
    });

    handler('ghost-spot');
    assert.equal(onSelectCalls[0][0], 'ghost-spot');
    assert.equal(onSelectCalls[0][1], null);
    // No flyTo since spot wasn't found.
    assert.equal(map.flyToCalls.length, 0);
  });
});
