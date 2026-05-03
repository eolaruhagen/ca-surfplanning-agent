import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDeg,
  directionInRange,
  angularDelta,
  directionDistance,
  haversineMiles,
} from '../lib/direction-utils';

describe('normalizeDeg', () => {
  it('wraps negative', () => assert.equal(normalizeDeg(-10), 350));
  it('wraps over 360', () => assert.equal(normalizeDeg(370), 10));
  it('passes through in-range', () => assert.equal(normalizeDeg(180), 180));
});

describe('directionInRange', () => {
  it('handles non-wrapping range', () => {
    assert.equal(directionInRange(100, 90, 110), true);
    assert.equal(directionInRange(89, 90, 110), false);
  });
  it('handles wrap-around (north range 350→20)', () => {
    assert.equal(directionInRange(355, 350, 20), true);
    assert.equal(directionInRange(10, 350, 20), true);
    assert.equal(directionInRange(180, 350, 20), false);
  });
  it('inclusive at endpoints', () => {
    assert.equal(directionInRange(90, 90, 110), true);
    assert.equal(directionInRange(110, 90, 110), true);
  });
});

describe('angularDelta', () => {
  it('shortest path across north', () => assert.equal(angularDelta(350, 10), 20));
  it('not greater than 180', () => assert.equal(angularDelta(0, 180), 180));
  it('zero for equal', () => assert.equal(angularDelta(45, 45), 0));
});

describe('directionDistance', () => {
  it('zero when in range', () => assert.equal(directionDistance(100, [90, 110]), 0));
  it('distance to nearer endpoint', () => {
    assert.equal(directionDistance(80, [90, 110]), 10);
    assert.equal(directionDistance(120, [90, 110]), 10);
  });
  it('handles wrap-around range', () => {
    assert.equal(directionDistance(355, [350, 20]), 0);
    assert.equal(directionDistance(180, [350, 20]), 160);
  });
});

describe('haversineMiles', () => {
  it('zero for same point', () => {
    assert.equal(haversineMiles([-122, 37], [-122, 37]), 0);
  });
  it('approximates SF→LA distance', () => {
    const d = haversineMiles([-122.41, 37.77], [-118.24, 34.05]);
    assert.ok(d > 330 && d < 360, `got ${d}`);
  });
});
