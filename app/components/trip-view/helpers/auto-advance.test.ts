import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_ADVANCE_INTERVAL_MS,
  advanceTick,
  shouldDoInitialFly,
} from "./auto-advance";

describe("AUTO_ADVANCE_INTERVAL_MS", () => {
  it("matches the spec'd 4500ms cadence", () => {
    assert.equal(AUTO_ADVANCE_INTERVAL_MS, 4500);
  });
});

describe("advanceTick", () => {
  it("advances to the next index when not at the end", () => {
    assert.deepEqual(advanceTick(0, 3), { nextIndex: 1, shouldPause: false });
    assert.deepEqual(advanceTick(1, 3), { nextIndex: 2, shouldPause: false });
  });

  it("stops at the final session (no wrap)", () => {
    assert.deepEqual(advanceTick(2, 3), { nextIndex: 2, shouldPause: true });
  });

  it("handles single-session trips (immediate pause)", () => {
    assert.deepEqual(advanceTick(0, 1), { nextIndex: 0, shouldPause: true });
  });

  it("is defensive against empty trips", () => {
    assert.deepEqual(advanceTick(0, 0), { nextIndex: 0, shouldPause: true });
  });
});

describe("shouldDoInitialFly", () => {
  const coords: [number, number] = [-122, 37];

  it("returns true only when map is ready, not flown, and coords exist", () => {
    assert.equal(
      shouldDoInitialFly({
        mapReady: true,
        hasFlown: false,
        firstSessionCoords: coords,
      }),
      true,
    );
  });

  it("returns false before the map reports ready", () => {
    assert.equal(
      shouldDoInitialFly({
        mapReady: false,
        hasFlown: false,
        firstSessionCoords: coords,
      }),
      false,
    );
  });

  it("returns false after the initial fly already happened", () => {
    assert.equal(
      shouldDoInitialFly({
        mapReady: true,
        hasFlown: true,
        firstSessionCoords: coords,
      }),
      false,
    );
  });

  it("returns false when the first session has no coords", () => {
    assert.equal(
      shouldDoInitialFly({
        mapReady: true,
        hasFlown: false,
        firstSessionCoords: undefined,
      }),
      false,
    );
  });
});
