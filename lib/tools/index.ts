import type { ToolSet } from 'ai';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { AgentName, SendEvent } from '@/lib/types';
import { spotTools } from './spots';
import { scoreTools, buildForecastFetcher } from './score';
import { recordTools, type RecordedPlan } from './record';
import { tideTools } from './tides';
import { buoyTools } from './buoys';
import { mcpToolsForAgent, type McpToolBundle } from './mcp-adapter';
import type { RateLimiter } from '@/lib/rate-limiter';

export type AgentToolContext = {
  agent: AgentName;
  sendEvent: SendEvent;
  plan: RecordedPlan;
  meteoMcp: Client | null;
  mapsMcp: Client | null;
  fsMcp: Client | null;
  rateLimiter?: RateLimiter;
};

export async function reconToolset(ctx: AgentToolContext): Promise<ToolSet> {
  const meteoTools = ctx.meteoMcp
    ? await mcpToolsForAgent(
        { client: ctx.meteoMcp, source: 'mcp:open-meteo' },
        ctx.agent,
        ctx.sendEvent,
        ctx.rateLimiter,
      )
    : ({} as ToolSet);
  const fetcher = buildForecastFetcher(ctx.meteoMcp, ctx.agent, ctx.sendEvent);
  return {
    ...spotTools(ctx.agent, ctx.sendEvent),
    ...scoreTools(ctx.agent, ctx.sendEvent, fetcher),
    ...tideTools(ctx.agent, ctx.sendEvent),
    ...buoyTools(ctx.agent, ctx.sendEvent),
    ...meteoTools,
  };
}

export async function plannerToolset(ctx: AgentToolContext): Promise<ToolSet> {
  const mapsTools = ctx.mapsMcp
    ? await mcpToolsForAgent(
        { client: ctx.mapsMcp, source: 'mcp:google-maps' },
        ctx.agent,
        ctx.sendEvent,
        ctx.rateLimiter,
      )
    : ({} as ToolSet);
  return {
    ...spotTools(ctx.agent, ctx.sendEvent),
    ...recordTools(ctx.agent, ctx.sendEvent, ctx.plan),
    ...mapsTools,
  };
}

export async function narratorToolset(ctx: AgentToolContext): Promise<ToolSet> {
  const fsTools = ctx.fsMcp
    ? await mcpToolsForAgent(
        { client: ctx.fsMcp, source: 'mcp:filesystem' },
        ctx.agent,
        ctx.sendEvent,
        ctx.rateLimiter,
      )
    : ({} as ToolSet);
  return {
    ...fsTools,
  };
}

export type { McpToolBundle };
