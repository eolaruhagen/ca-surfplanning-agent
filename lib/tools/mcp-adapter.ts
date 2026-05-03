import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { tool, jsonSchema, type ToolSet } from 'ai';
import type { AgentName, SendEvent } from '@/lib/types';
import type { RateLimiter } from '@/lib/rate-limiter';

type McpSource = 'mcp:open-meteo' | 'mcp:google-maps' | 'mcp:filesystem';

export type McpToolBundle = {
  client: Client;
  source: McpSource;
};

function summarize(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.length > 120 ? value.slice(0, 120) + '…' : value;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).slice(0, 5);
    return keys.length ? `{${keys.join(', ')}}` : '{}';
  }
  return String(value);
}

export async function mcpToolsForAgent(
  bundle: McpToolBundle,
  agent: AgentName,
  sendEvent: SendEvent,
  rateLimiter?: RateLimiter,
): Promise<ToolSet> {
  const { tools: mcpTools } = await bundle.client.listTools();
  const out: ToolSet = {};

  for (const t of mcpTools) {
    const name = t.name;
    out[name] = tool({
      description: t.description ?? `MCP tool ${name}`,
      inputSchema: jsonSchema(t.inputSchema as Parameters<typeof jsonSchema>[0]),
      execute: async (args) => {
        if (rateLimiter) {
          const check = rateLimiter.consume(bundle.source);
          if (!check.ok) {
            sendEvent({
              type: 'tool_result',
              agent,
              name,
              summary: `rate-limited: ${check.reason}`,
            });
            return { error: check.reason };
          }
        }
        sendEvent({
          type: 'tool_call',
          agent,
          name,
          source: bundle.source,
          args,
        });
        try {
          const res = await bundle.client.callTool({
            name,
            arguments: args as Record<string, unknown>,
          });
          const first = Array.isArray(res.content) ? res.content[0] : null;
          const raw = first && 'text' in first ? (first as { text: string }).text : '';
          let parsed: unknown = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {}
          sendEvent({
            type: 'tool_result',
            agent,
            name,
            summary: summarize(parsed),
          });
          return parsed;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown MCP error';
          sendEvent({ type: 'tool_result', agent, name, summary: `error: ${message}` });
          return { error: message };
        }
      },
    });
  }

  return out;
}
