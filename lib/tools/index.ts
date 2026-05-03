import type { ToolSet } from 'ai';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { AgentName, SendEvent } from '@/lib/types';
import { spotTools } from './spots';
import { scoreTools, buildForecastFetcher } from './score';
import { recordTools, type RecordedPlan } from './record';
import { tideTools } from './tides';
import { buoyTools } from './buoys';
import { mcpToolsForAgent, type McpToolBundle } from './mcp-adapter';
import { consultTools } from './consult';
import type { RateLimiter } from '@/lib/rate-limiter';
import type { ConsultationBudget } from '@/lib/consultation-budget';

export type AgentToolContext = {
  agent: AgentName;
  sendEvent: SendEvent;
  plan: RecordedPlan;
  meteoMcp: Client | null;
  mapsMcp: Client | null;
  fsMcp: Client | null;
  rateLimiter?: RateLimiter;
  /** Per-run cap on outbound `consult_agent` calls — passed to the planner. */
  consultationBudget?: ConsultationBudget;
  /** Model used by spawned consultee mini-runs. */
  model?: string;
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
  const consult = ctx.consultationBudget
    ? consultTools({
        initiator: ctx.agent,
        budget: ctx.consultationBudget,
        sendEvent: ctx.sendEvent,
        mcpClients: { meteoMcp: ctx.meteoMcp },
        rateLimiter: ctx.rateLimiter,
        model: ctx.model,
      })
    : ({} as ToolSet);
  return {
    ...spotTools(ctx.agent, ctx.sendEvent),
    ...recordTools(ctx.agent, ctx.sendEvent, ctx.plan),
    ...mapsTools,
    ...consult,
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
