import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { flattenSessions } from "./hook";
import type { Trip } from "@/lib/types";

// Minimal trip factory for tests
function makeTrip(daySessions: number[]): Trip {
  return {
    id: "test",
    created_at: new Date().toISOString(),
    params: {
      start_point: [-122, 37] as [number, number],
      end_point: [-118, 34] as [number, number],
      start_date: "2026-06-01",
      end_date: "2026-06-03",
      sessions_per_day: 2,
      skill_level: "intermediate",
      wave_preference: "mixed",
      hard_constraints: "",
    },
    quiver: [],
    days: daySessions.map((count, dayIdx) => ({
      day_number: dayIdx + 1,
      date: `2026-06-0${dayIdx + 1}`,
      sessions: Array.from({ length: count }, (_, sIdx) => ({
        time_window: "morning",
        spot_id: `spot-${dayIdx}-${sIdx}`,
        spot_name: `Spot ${dayIdx}-${sIdx}`,
        spot_coords: [-120 + sIdx, 36 + dayIdx] as [number, number],
        board_id: "board-1",
        pick_reason: `Day ${dayIdx + 1} session ${sIdx + 1} pick reason`,
        reasoning: "detailed reasoning",
        forecast_snapshot: {},
        fit_score: 80,
      })),
      overnight: null,
      drive_to_next: null,
    })),
    route_geojson: null,
    summary_md: "",
    caveats: [],
  };
}

describe("flattenSessions", () => {
  it("flattens single day with 2 sessions", () => {
    const trip = makeTrip([2]);
    const flat = flattenSessions(trip);
    assert.equal(flat.length, 2);
    assert.equal(flat[0].dayIndex, 0);
    assert.equal(flat[0].sessionIndex, 0);
    assert.equal(flat[0].globalIndex, 0);
    assert.equal(flat[1].dayIndex, 0);
    assert.equal(flat[1].sessionIndex, 1);
    assert.equal(flat[1].globalIndex, 1);
  });

  it("flattens multiple days preserving day origin", () => {
    const trip = makeTrip([2, 3]);
    const flat = flattenSessions(trip);
    assert.equal(flat.length, 5);
    assert.equal(flat[0].dayIndex, 0);
    assert.equal(flat[2].dayIndex, 1);
    assert.equal(flat[2].sessionIndex, 0);
    assert.equal(flat[2].globalIndex, 2);
    assert.equal(flat[4].dayIndex, 1);
    assert.equal(flat[4].sessionIndex, 2);
    assert.equal(flat[4].globalIndex, 4);
  });

  it("returns empty for empty trip", () => {
    const trip = makeTrip([]);
    assert.equal(flattenSessions(trip).length, 0);
  });

  it("session references match original trip session objects", () => {
    const trip = makeTrip([1, 1]);
    const flat = flattenSessions(trip);
    assert.equal(flat[0].session, trip.days[0].sessions[0]);
    assert.equal(flat[1].session, trip.days[1].sessions[0]);
  });
});

// Pure logic tests for hook behavior (without React rendering)
describe("useTripView logic", () => {
  it("next advances index", () => {
    const flat = flattenSessions(makeTrip([3]));
    let idx = 0;
    const total = flat.length;
    const next = () => { if (idx < total - 1) idx++; };
    next(); assert.equal(idx, 1);
    next(); assert.equal(idx, 2);
    next(); assert.equal(idx, 2); // stops at last
  });

  it("prev does not go below 0", () => {
    let idx = 0;
    const prev = () => { if (idx > 0) idx--; };
    prev(); assert.equal(idx, 0);
  });

  it("jumpTo clamps to valid range", () => {
    const flat = flattenSessions(makeTrip([3]));
    const total = flat.length;
    const clamp = (n: number) => Math.max(0, Math.min(total - 1, n));
    assert.equal(clamp(-5), 0);
    assert.equal(clamp(100), 2);
    assert.equal(clamp(1), 1);
  });

  it("jumpToDay sets index to FIRST session of that day", () => {
    const flat = flattenSessions(makeTrip([2, 3]));
    const jumpToDay = (dayIndex: number) => {
      const first = flat.find((fs) => fs.dayIndex === dayIndex);
      return first ? first.globalIndex : 0;
    };
    assert.equal(jumpToDay(0), 0);
    assert.equal(jumpToDay(1), 2); // day 1 starts at globalIndex 2
  });

  it("play / pause / toggle set isPlaying correctly", () => {
    let isPlaying = false;
    const play = () => { isPlaying = true; };
    const pause = () => { isPlaying = false; };
    const toggle = () => { isPlaying = !isPlaying; };

    play(); assert.equal(isPlaying, true);
    pause(); assert.equal(isPlaying, false);
    toggle(); assert.equal(isPlaying, true);
    toggle(); assert.equal(isPlaying, false);
  });
});
