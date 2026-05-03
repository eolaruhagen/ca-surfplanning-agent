import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { tool, jsonSchema, type ToolSet } from 'ai';
import type { AgentName, SendEvent } from '@/lib/types';
import type { RateLimiter } from '@/lib/rate-limiter';

type McpSource = 'mcp:open-meteo' | 'mcp:google-maps' | 'mcp:filesystem';

export type McpToolBundle = {
  client: Client;
  source: McpSource;
};

type NumericEnumMap = Set<string>;

function normalizeNumericEnums(schema: unknown): {
  schema: Parameters<typeof jsonSchema>[0];
  numericEnumKeys: NumericEnumMap;
} {
  if (!schema || typeof schema !== 'object') {
    return { schema: schema as Parameters<typeof jsonSchema>[0], numericEnumKeys: new Set() };
  }

  const clone = structuredClone(schema) as Record<string, unknown>;
  const props = clone.properties as Record<string, unknown> | undefined;
  const numericEnumKeys = new Set<string>();

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Record<string, unknown>;
      const enumVals = v.enum as unknown[] | undefined;
      if (enumVals && enumVals.every((e) => typeof e === 'number')) {
        numericEnumKeys.add(key);
        v.enum = enumVals.map((e) => String(e));
        v.type = 'string';
      }
    }
  }

  return { schema: clone as Parameters<typeof jsonSchema>[0], numericEnumKeys };
}

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
    const normalized = normalizeNumericEnums(t.inputSchema);
    const inputSchema = jsonSchema(normalized.schema);
    out[name] = tool({
      description: t.description ?? `MCP tool ${name}`,
      inputSchema,
      execute: async (args) => {
        const normalizedArgs = { ...(args as Record<string, unknown>) };
        for (const key of normalized.numericEnumKeys) {
          const val = normalizedArgs[key];
          if (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) {
            normalizedArgs[key] = Number(val);
          }
        }
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
          args: normalizedArgs,
        });
        try {
          const res = await bundle.client.callTool({
            name,
            arguments: normalizedArgs,
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
