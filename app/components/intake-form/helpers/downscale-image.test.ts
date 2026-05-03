/**
 * downscale-image helpers — pure logic tests (no DOM/canvas).
 * Tests cover the computeDimensions utility which is the core math.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeDimensions } from "./downscale-image";

describe("computeDimensions", () => {
  it("returns original dimensions when both sides are within limit", () => {
    const result = computeDimensions(800, 600, 1024);
    assert.deepEqual(result, { width: 800, height: 600 });
  });

  it("returns original dimensions when both sides equal limit", () => {
    const result = computeDimensions(1024, 1024, 1024);
    assert.deepEqual(result, { width: 1024, height: 1024 });
  });

  it("scales down landscape image proportionally", () => {
    const result = computeDimensions(2048, 1024, 1024);
    assert.equal(result.width, 1024);
    assert.equal(result.height, 512);
  });

  it("scales down portrait image proportionally", () => {
    const result = computeDimensions(1024, 2048, 1024);
    assert.equal(result.width, 512);
    assert.equal(result.height, 1024);
  });

  it("scales down square image proportionally", () => {
    const result = computeDimensions(2048, 2048, 1024);
    assert.equal(result.width, 1024);
    assert.equal(result.height, 1024);
  });

  it("handles very large images", () => {
    const result = computeDimensions(4096, 3072, 1024);
    // ratio = 1024/4096 = 0.25
    assert.equal(result.width, 1024);
    assert.equal(result.height, 768);
  });

  it("handles very wide images", () => {
    const result = computeDimensions(10000, 100, 1024);
    // ratio = 1024/10000 = 0.1024
    assert.equal(result.width, 1024);
    assert.equal(result.height, Math.round(100 * (1024 / 10000)));
  });

  it("does not upscale small images", () => {
    const result = computeDimensions(100, 100, 1024);
    assert.deepEqual(result, { width: 100, height: 100 });
  });

  it("uses default maxPx of 1024", () => {
    const result = computeDimensions(2000, 1000);
    assert.equal(result.width, 1024);
    assert.equal(result.height, 512);
  });
});
