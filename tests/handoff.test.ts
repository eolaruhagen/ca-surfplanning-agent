import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeForHandoff } from '../lib/agents/handoff';

describe('summarizeForHandoff', () => {
  it('returns input as-is when under cap', () => {
    const text = 'short report';
    assert.equal(summarizeForHandoff(text, 4000), text);
  });

  it('returns input as-is at the exact cap boundary', () => {
    const text = 'a'.repeat(4000);
    assert.equal(summarizeForHandoff(text, 4000), text);
  });

  it('truncates with head + tail when over cap', () => {
    const text = 'A'.repeat(5000) + 'B'.repeat(5000);
    const out = summarizeForHandoff(text, 4000);
    assert.ok(out.length <= 4000, `length was ${out.length}`);
    assert.match(out, /…\[truncated middle\]…/);
    // Head should be A's, tail should be B's
    assert.ok(out.startsWith('A'), 'head should preserve start');
    assert.ok(out.endsWith('B'), 'tail should preserve end');
  });

  it('preserves a leading distinctive prefix and a trailing distinctive suffix', () => {
    const head = 'PEAK_DAY:';
    const tail = ':END_OF_REPORT';
    const middle = 'x'.repeat(20000);
    const text = head + middle + tail;
    const out = summarizeForHandoff(text, 1000);
    assert.ok(out.startsWith(head));
    assert.ok(out.endsWith(tail));
    assert.match(out, /…\[truncated middle\]…/);
  });

  it('returns empty string unchanged', () => {
    assert.equal(summarizeForHandoff('', 4000), '');
  });

  it('preserves unicode characters in head and tail', () => {
    const head = '🌊 surf report — ';
    const tail = ' — fin 🤙';
    const text = head + 'mid'.repeat(5000) + tail;
    const out = summarizeForHandoff(text, 200);
    assert.ok(out.startsWith('🌊 surf report'));
    assert.ok(out.endsWith('fin 🤙'));
  });

  it('uses default cap of 4000 when none passed', () => {
    const text = 'z'.repeat(5000);
    const out = summarizeForHandoff(text);
    assert.ok(out.length <= 4000);
  });
});
