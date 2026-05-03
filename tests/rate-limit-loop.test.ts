import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mcpToolsForAgent } from '../lib/tools/mcp-adapter';
import { RateLimiter } from '../lib/rate-limiter';
import type { StreamEvent } from '../lib/types';

type MockTool = { name: string; description: string; inputSchema: unknown };

/**
 * Mock MCP client that always errors. We pair it with a saturated
 * RateLimiter to verify two safety properties at once:
 *   1. When the rate limiter is exhausted, every adapter call returns an
 *      error object — never throws.
 *   2. Calling the adapter many times in a row does NOT recurse or grow
 *      the call stack; it just returns errors.
 */
class AlwaysFailClient {
  constructor(private mockTools: MockTool[]) {}
  async listTools() {
    return { tools: this.mockTools };
  }
  async callTool() {
    return { content: [{ type: 'text', text: '{"error":"rate-limited"}' }] };
  }
}

describe('rate-limit-resistant agent loop', () => {
  it('returns errors for every call when the rate limiter is saturated — no recursion, no infinite loop', async () => {
    const events: StreamEvent[] = [];
    const send = (e: StreamEvent) => events.push(e);

    // Pre-saturate: limit of 2, then consume 2 directly.
    const limiter = new RateLimiter({ 'mcp:open-meteo': 2, total: 200 });
    limiter.consume('mcp:open-meteo');
    limiter.consume('mcp:open-meteo');

    const client = new AlwaysFailClient([
      {
        name: 'marine_weather',
        description: 'fake',
        inputSchema: { type: 'object' },
      },
    ]);

    const set = await mcpToolsForAgent(
      { client: client as never, source: 'mcp:open-meteo' },
      'recon',
      send,
      limiter,
    );
    type ToolWithExecute = {
      execute: (
        args: Record<string, unknown>,
        ctx: { toolCallId: string; messages: unknown[] },
      ) => Promise<unknown>;
    };
    const runOnce = (set.marine_weather as unknown as ToolWithExecute).execute;

    // Call it 50 times in a tight loop. The limiter is saturated, so every
    // call should return an error object — and crucially, finish.
    const results: unknown[] = [];
    for (let i = 0; i < 50; i++) {
      results.push(await runOnce({}, { toolCallId: `t-${i}`, messages: [] }));
    }

    assert.equal(results.length, 50);
    for (const r of results) {
      assert.ok(r && typeof r === 'object' && 'error' in r, `expected error object, got ${JSON.stringify(r)}`);
      const reason = (r as { error: string }).error;
      assert.match(reason, /mcp:open-meteo|cap/);
    }

    // The adapter should emit a tool_result for every rejected call (no
    // tool_call event for rate-limited calls — the call was never dispatched).
    const toolResults = events.filter((e) => e.type === 'tool_result');
    assert.equal(toolResults.length, 50);
    for (const tr of toolResults) {
      if (tr.type !== 'tool_result') continue;
      assert.match(tr.summary, /rate-limited/);
    }

    // No tool_call events should have been emitted — the rate limiter blocked
    // dispatch before the underlying client was touched.
    const toolCalls = events.filter((e) => e.type === 'tool_call');
    assert.equal(toolCalls.length, 0);
  });
});
