import { test } from "node:test";
import assert from "node:assert/strict";

import { clusterTripDays } from "./cluster-trip-days";
import type { TripDayMarker } from "@/lib/spots";

test("clusterTripDays: empty input → empty output", () => {
  assert.deepEqual(clusterTripDays([]), []);
});

test("clusterTripDays: single entry → offset [0, 0]", () => {
  const input: TripDayMarker[] = [
    { spotId: "rincon", dayIndex: 1, label: "Day 1" },
  ];
  const out = clusterTripDays(input);
  assert.equal(out.length, 1);
  assert.equal(out[0].spotId, "rincon");
  assert.equal(out[0].dayIndex, 1);
  assert.equal(out[0].label, "Day 1");
  assert.deepEqual(out[0].offset, [0, 0]);
});

test("clusterTripDays: two entries same spot → opposite non-zero offsets", () => {
  const input: TripDayMarker[] = [
    { spotId: "rincon", dayIndex: 1 },
    { spotId: "rincon", dayIndex: 2 },
  ];
  const out = clusterTripDays(input);
  assert.equal(out.length, 2);

  for (const o of out) {
    const [dx, dy] = o.offset;
    assert.ok(Math.hypot(dx, dy) > 0, "offset must be non-zero");
  }

  // Opposite directions: dx_a ≈ -dx_b, dy_a ≈ -dy_b
  const [a, b] = out;
  assert.ok(Math.abs(a.offset[0] + b.offset[0]) < 1e-6);
  assert.ok(Math.abs(a.offset[1] + b.offset[1]) < 1e-6);
});

test("clusterTripDays: three entries same spot → three even-spread non-zero offsets", () => {
  const input: TripDayMarker[] = [
    { spotId: "x", dayIndex: 1 },
    { spotId: "x", dayIndex: 2 },
    { spotId: "x", dayIndex: 3 },
  ];
  const out = clusterTripDays(input);
  assert.equal(out.length, 3);

  const radii = out.map((o) => Math.hypot(o.offset[0], o.offset[1]));
  // All on same ring radius
  for (const r of radii) {
    assert.ok(r > 0);
    assert.ok(Math.abs(r - radii[0]) < 1e-6);
  }
  // Sum of vectors ≈ 0 (evenly spread)
  const sx = out.reduce((s, o) => s + o.offset[0], 0);
  const sy = out.reduce((s, o) => s + o.offset[1], 0);
  assert.ok(Math.abs(sx) < 1e-6);
  assert.ok(Math.abs(sy) < 1e-6);
});

test("clusterTripDays: two entries different spots → both offset [0, 0]", () => {
  const input: TripDayMarker[] = [
    { spotId: "rincon", dayIndex: 1 },
    { spotId: "trestles", dayIndex: 2 },
  ];
  const out = clusterTripDays(input);
  assert.equal(out.length, 2);
  for (const o of out) {
    assert.deepEqual(o.offset, [0, 0]);
  }
});

test("clusterTripDays: sorts cluster members by dayIndex", () => {
  const input: TripDayMarker[] = [
    { spotId: "x", dayIndex: 5 },
    { spotId: "x", dayIndex: 2 },
    { spotId: "x", dayIndex: 8 },
  ];
  const out = clusterTripDays(input).filter((o) => o.spotId === "x");
  const days = out.map((o) => o.dayIndex);
  assert.deepEqual(days, [2, 5, 8]);
});

test("clusterTripDays: preserves label", () => {
  const input: TripDayMarker[] = [
    { spotId: "x", dayIndex: 1, label: "Day 1 dawn" },
    { spotId: "x", dayIndex: 2, label: "Day 2 dawn" },
  ];
  const out = clusterTripDays(input);
  const labels = out.map((o) => o.label);
  assert.ok(labels.includes("Day 1 dawn"));
  assert.ok(labels.includes("Day 2 dawn"));
});

test("clusterTripDays: first cluster member is at top (angle = -π/2)", () => {
  const input: TripDayMarker[] = [
    { spotId: "x", dayIndex: 1 },
    { spotId: "x", dayIndex: 2 },
  ];
  const out = clusterTripDays(input);
  const first = out.find((o) => o.dayIndex === 1)!;
  // angle = -π/2 → dx ≈ 0, dy ≈ -r (negative y = up in screen coords)
  assert.ok(Math.abs(first.offset[0]) < 1e-6);
  assert.ok(first.offset[1] < 0);
});
