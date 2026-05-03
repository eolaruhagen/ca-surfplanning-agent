/**
 * useWhen hook — date range selection state machine tests.
 * Pure logic tests, no DOM rendering required.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Mirror the hook logic as pure functions for testability
// ---------------------------------------------------------------------------

type Phase = "idle" | "picking-end";

interface WhenState {
  leftYear: number;
  leftMonth: number;
  hoverDate: string | null;
  phase: Phase;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addMonths(year: number, month: number, delta: number): [number, number] {
  const d = new Date(year, month + delta, 1);
  return [d.getFullYear(), d.getMonth()];
}

function inRange(
  iso: string,
  startDate: string,
  endDate: string,
  phase: Phase,
  hoverDate: string | null,
): boolean {
  if (!startDate) return false;
  const d = isoToDate(iso);
  const start = isoToDate(startDate);
  if (endDate) {
    const end = isoToDate(endDate);
    return d >= start && d <= end;
  }
  if (phase === "picking-end" && hoverDate) {
    const hover = isoToDate(hoverDate);
    const lo = hover < start ? hover : start;
    const hi = hover < start ? start : hover;
    return d >= lo && d <= hi;
  }
  return d.getTime() === start.getTime();
}

// Simulate click interactions
type DatePair = { start: string; end: string };

function firstClick(iso: string): { phase: Phase; dates: DatePair } {
  return { phase: "picking-end", dates: { start: iso, end: "" } };
}

function secondClick(iso: string, startDate: string): { phase: Phase; dates: DatePair } {
  const clickedDate = isoToDate(iso);
  const startDateObj = isoToDate(startDate);
  if (clickedDate < startDateObj) {
    return { phase: "idle", dates: { start: iso, end: startDate } };
  }
  return { phase: "idle", dates: { start: startDate, end: iso } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useWhen — month navigation", () => {
  it("addMonths increments month correctly", () => {
    const [y, m] = addMonths(2026, 11, 1); // Dec → Jan
    assert.equal(y, 2027);
    assert.equal(m, 0);
  });

  it("addMonths decrements month correctly", () => {
    const [y, m] = addMonths(2026, 0, -1); // Jan → Dec prev year
    assert.equal(y, 2025);
    assert.equal(m, 11);
  });

  it("right calendar is always one month ahead of left", () => {
    const leftYear = 2026, leftMonth = 5; // June
    const [ry, rm] = addMonths(leftYear, leftMonth, 1);
    assert.equal(rm, 6); // July
    assert.equal(ry, 2026);
  });
});

describe("useWhen — date selection flow", () => {
  it("first click enters picking-end phase", () => {
    const result = firstClick("2026-07-10");
    assert.equal(result.phase, "picking-end");
    assert.equal(result.dates.start, "2026-07-10");
    assert.equal(result.dates.end, "");
  });

  it("second click after start sets end date and resets phase", () => {
    const { phase, dates } = secondClick("2026-07-15", "2026-07-10");
    assert.equal(phase, "idle");
    assert.equal(dates.start, "2026-07-10");
    assert.equal(dates.end, "2026-07-15");
  });

  it("second click before start swaps start and end", () => {
    const { phase, dates } = secondClick("2026-07-05", "2026-07-10");
    assert.equal(phase, "idle");
    assert.equal(dates.start, "2026-07-05");
    assert.equal(dates.end, "2026-07-10");
  });

  it("clicking same date twice results in single-day range", () => {
    const { dates } = secondClick("2026-07-10", "2026-07-10");
    assert.equal(dates.start, "2026-07-10");
    assert.equal(dates.end, "2026-07-10");
  });
});

describe("useWhen — inRange", () => {
  it("no start date → nothing in range", () => {
    assert.equal(inRange("2026-07-10", "", "", "idle", null), false);
  });

  it("start date set, no end → only start is in range", () => {
    assert.equal(inRange("2026-07-10", "2026-07-10", "", "idle", null), true);
    assert.equal(inRange("2026-07-11", "2026-07-10", "", "idle", null), false);
  });

  it("start and end set → range is inclusive", () => {
    assert.equal(inRange("2026-07-10", "2026-07-10", "2026-07-15", "idle", null), true);
    assert.equal(inRange("2026-07-12", "2026-07-10", "2026-07-15", "idle", null), true);
    assert.equal(inRange("2026-07-15", "2026-07-10", "2026-07-15", "idle", null), true);
    assert.equal(inRange("2026-07-09", "2026-07-10", "2026-07-15", "idle", null), false);
    assert.equal(inRange("2026-07-16", "2026-07-10", "2026-07-15", "idle", null), false);
  });

  it("hover during picking-end shows provisional range", () => {
    // Hover after start → range from start to hover
    assert.equal(inRange("2026-07-12", "2026-07-10", "", "picking-end", "2026-07-14"), true);
    assert.equal(inRange("2026-07-15", "2026-07-10", "", "picking-end", "2026-07-14"), false);
  });

  it("hover before start during picking-end reverses range", () => {
    assert.equal(inRange("2026-07-08", "2026-07-10", "", "picking-end", "2026-07-07"), true);
    assert.equal(inRange("2026-07-11", "2026-07-10", "", "picking-end", "2026-07-07"), false);
  });
});
