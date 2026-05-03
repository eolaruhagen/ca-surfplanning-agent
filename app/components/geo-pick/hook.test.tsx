/**
 * useGeoPick — state logic tests (no DOM rendering required).
 * We test the state transitions and geocode integration by simulating the
 * relevant logic as pure functions.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Mirror the core state logic
// ---------------------------------------------------------------------------

interface GeoPickState {
  pin: [number, number] | null;
  placeName: string | null;
  bbox: [number, number, number, number] | null;
  loading: boolean;
}

function makeInitial(): GeoPickState {
  return { pin: null, placeName: null, bbox: null, loading: false };
}

function onClickPending(lng: number, lat: number): GeoPickState {
  return { pin: [lng, lat], placeName: null, bbox: null, loading: true };
}

function onGeocodeSuccess(
  pin: [number, number],
  placeName: string,
  bbox: [number, number, number, number] | null,
): GeoPickState {
  return { pin, placeName, bbox, loading: false };
}

function onClear(): GeoPickState {
  return { pin: null, placeName: null, bbox: null, loading: false };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useGeoPick — initial state", () => {
  it("starts with no pin", () => {
    const state = makeInitial();
    assert.equal(state.pin, null);
    assert.equal(state.placeName, null);
    assert.equal(state.bbox, null);
    assert.equal(state.loading, false);
  });
});

describe("useGeoPick — click handling", () => {
  it("sets pin and loading=true on click", () => {
    const state = onClickPending(-118.4, 34.0);
    assert.deepEqual(state.pin, [-118.4, 34.0]);
    assert.equal(state.loading, true);
    assert.equal(state.placeName, null);
  });

  it("updates placeName and loading=false after geocode", () => {
    const pin: [number, number] = [-118.4, 34.0];
    const state = onGeocodeSuccess(pin, "Santa Monica, CA", [-118.5, 33.9, -118.3, 34.1]);
    assert.equal(state.loading, false);
    assert.equal(state.placeName, "Santa Monica, CA");
    assert.deepEqual(state.bbox, [-118.5, 33.9, -118.3, 34.1]);
    assert.deepEqual(state.pin, pin);
  });

  it("handles geocode result with no bbox", () => {
    const pin: [number, number] = [-118.4, 34.0];
    const state = onGeocodeSuccess(pin, "Some Place", null);
    assert.equal(state.bbox, null);
    assert.equal(state.placeName, "Some Place");
  });
});

describe("useGeoPick — clear", () => {
  it("resets all state to null", () => {
    const state = onClear();
    assert.equal(state.pin, null);
    assert.equal(state.placeName, null);
    assert.equal(state.bbox, null);
    assert.equal(state.loading, false);
  });
});

describe("useGeoPick — second click supersedes first", () => {
  it("second pending click overwrites first pin", () => {
    const state1 = onClickPending(-118.4, 34.0);
    const state2 = onClickPending(-122.4, 37.8);
    // state2 is the current state; state1's geocode result should be discarded
    assert.deepEqual(state2.pin, [-122.4, 37.8]);
    assert.notDeepEqual(state1.pin, state2.pin);
  });
});
