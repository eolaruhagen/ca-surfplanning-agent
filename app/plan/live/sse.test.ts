import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSseChunk } from "./sse";

describe("parseSseChunk", () => {
  it("parses a single SSE event", () => {
    const input = "data: {\"type\":\"phase\"}\n\n";
    const result = parseSseChunk(input);
    assert.deepEqual(result.messages, ["{\"type\":\"phase\"}"]);
    assert.equal(result.rest, "");
  });

  it("keeps trailing partial event in rest", () => {
    const input = "data: {\"type\":\"phase\"}\n";
    const result = parseSseChunk(input);
    assert.deepEqual(result.messages, []);
    assert.equal(result.rest, input);
  });

  it("parses multiple events across chunks", () => {
    const part1 = "data: {\"type\":\"phase\"}\n\n";
    const part2 = "data: {\"type\":\"done\"}\n\n";
    const r1 = parseSseChunk(part1);
    const r2 = parseSseChunk(r1.rest + part2);
    assert.deepEqual(r1.messages, ["{\"type\":\"phase\"}"]);
    assert.deepEqual(r2.messages, ["{\"type\":\"done\"}"]);
    assert.equal(r2.rest, "");
  });
});
