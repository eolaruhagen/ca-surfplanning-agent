import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mcpToolsForAgent } from '../lib/tools/mcp-adapter';
import { StreamEventSchema } from '../lib/schemas';
import type { StreamEvent } from '../lib/types';

type MockTool = { name: string; description: string; inputSchema: unknown };

class MockClient {
  constructor(
    private mockTools: MockTool[],
    private handler: (name: string, args: Record<string, unknown>) => unknown,
  ) {}
  async listTools() {
    return { tools: this.mockTools };
  }
  async callTool({ name, arguments: args }: { name: string; arguments?: Record<string, unknown> }) {
    const result = this.handler(name, args ?? {});
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
}

describe('mcpToolsForAgent', () => {
  it('emits tool_call + tool_result with agent + source attribution', async () => {
    const events: StreamEvent[] = [];
    const send = (e: StreamEvent) => {
      StreamEventSchema.parse(e);
      events.push(e);
    };
    const client = new MockClient(
      [
        {
          name: 'marine_weather',
          description: 'fake marine forecast',
          inputSchema: {
            type: 'object',
            properties: { latitude: { type: 'number' }, longitude: { type: 'number' } },
            required: ['latitude', 'longitude'],
          },
        },
      ],
      (name, args) => ({ name, args, hourly: { swell_wave_height: [3.2] } }),
    );
    const set = await mcpToolsForAgent(
      { client: client as never, source: 'mcp:open-meteo' },
      'recon',
      send,
    );
    assert.ok(set.marine_weather);
    const exec = (set.marine_weather as any).execute;
    const result = await exec({ latitude: 34.37, longitude: -119.48 }, { toolCallId: 't', messages: [] });
    assert.equal((result as { hourly: { swell_wave_height: number[] } }).hourly.swell_wave_height[0], 3.2);

    const callEvent = events.find((e) => e.type === 'tool_call');
    const resultEvent = events.find((e) => e.type === 'tool_result');
    assert.ok(callEvent && callEvent.type === 'tool_call');
    assert.equal(callEvent.agent, 'recon');
    assert.equal(callEvent.source, 'mcp:open-meteo');
    assert.equal(callEvent.name, 'marine_weather');
    assert.ok(resultEvent && resultEvent.type === 'tool_result');
    assert.equal(resultEvent.agent, 'recon');
  });

  it('captures errors as tool_result with error summary, no throw', async () => {
    const events: StreamEvent[] = [];
    const send = (e: StreamEvent) => {
      StreamEventSchema.parse(e);
      events.push(e);
    };
    const client = new MockClient(
      [{ name: 'flaky', description: 'always fails', inputSchema: { type: 'object' } }],
      () => {
        throw new Error('upstream broke');
      },
    );
    const set = await mcpToolsForAgent(
      { client: client as never, source: 'mcp:google-maps' },
      'planner',
      send,
    );
    const exec = (set.flaky as any).execute;
    const result = await exec({}, { toolCallId: 't', messages: [] });
    assert.deepEqual(result, { error: 'upstream broke' });
    const errorResult = events.find((e) => e.type === 'tool_result');
    assert.ok(errorResult && errorResult.type === 'tool_result');
    assert.match(errorResult.summary, /error: upstream broke/);
  });
});
