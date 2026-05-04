/**
 * Bidirectional agent consultation. One agent (initiator) asks another
 * (consultee) a focused question mid-run; the consultee runs a tight,
 * budgeted mini-loop with a constrained, read-only tool set and returns a
 * concise answer. See AGENT-COORDINATION.md "Bidirectional consultation
 * pattern" for the locked event sequence.
 *
 * The runner is injectable for tests — tests can pass a mock that doesn't
 * touch the AI SDK.
 */

import { nanoid } from 'nanoid';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { ToolSet } from 'ai';
import type { AgentName, SendEvent } from '@/lib/types';
import { spotTools } from '@/lib/tools/spots';
import { scoreTools, buildForecastFetcher } from '@/lib/tools/score';
import { tideTools } from '@/lib/tools/tides';
import { buoyTools } from '@/lib/tools/buoys';
import { mcpToolsForAgent } from '@/lib/tools/mcp-adapter';
import type { RateLimiter } from '@/lib/rate-limiter';
import { runAgent as defaultRunAgent } from './runner';

export type ConsultationMcpClients = {
  meteoMcp?: Client | null;
};

export type TripDateContext = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

type RunAgentLike = (opts: {
  agent: AgentName;
  model?: string;
  system: string;
  prompt: string;
  tools: ToolSet;
  maxSteps: number;
  sendEvent: SendEvent;
}) => Promise<{ text: string }>;

export type RunConsultationOptions = {
  initiator: AgentName;
  consultee: 'recon' | 'narrator';
  topic: string;
  question: string;
  /** Extra context the consultee needs to answer (trip params, prior findings). */
  context?: string;
  /** Trip dates to anchor weather queries — without this, models hallucinate years. */
  tripDates?: TripDateContext;
  sendEvent: SendEvent;
  model?: string;
  mcpClients?: ConsultationMcpClients;
  rateLimiter?: RateLimiter;
  /** Optional injection for tests. Defaults to the real runAgent. */
  runner?: RunAgentLike;
  /** Optional override for tests; defaults to nanoid(8). */
  newCorrelationId?: () => string;
};

export type ConsultationResult = { answer: string };

const SYSTEM_PROMPT = (
  consultee: AgentName,
  initiator: AgentName,
  tripDates?: TripDateContext,
) => {
  const today = new Date().toISOString().slice(0, 10);
  const dateBlock = tripDates
    ? `\n\nCRITICAL DATE CONTEXT — use these EXACT values, never invent dates:\n` +
      `- Today's date: ${today}\n` +
      `- Trip start: ${tripDates.startDate}\n` +
      `- Trip end: ${tripDates.endDate}\n` +
      `When calling weather/marine tools, ALL start_date and end_date values MUST be inside ${tripDates.startDate}..${tripDates.endDate}. Never use any year other than ${tripDates.startDate.slice(0, 4)}.`
    : '';
  return `You are ${consultee}, called in for a focused consultation by ${initiator}. Answer the question concisely (≤200 words) using your tools. Do not record sessions or write files.${dateBlock}`;
};

async function buildConsulteeTools(
  consultee: 'recon' | 'narrator',
  sendEvent: SendEvent,
  mcp: ConsultationMcpClients | undefined,
  rateLimiter: RateLimiter | undefined,
): Promise<ToolSet> {
  if (consultee === 'recon') {
    const meteo = mcp?.meteoMcp ?? null;
    const meteoTools = meteo
      ? await mcpToolsForAgent(
          { client: meteo, source: 'mcp:open-meteo' },
          'recon',
          sendEvent,
          rateLimiter,
        )
      : ({} as ToolSet);
    const fetcher = buildForecastFetcher(meteo, 'recon', sendEvent);
    return {
      ...spotTools('recon', sendEvent),
      ...scoreTools('recon', sendEvent, fetcher),
      ...tideTools('recon', sendEvent),
      ...buoyTools('recon', sendEvent),
      ...meteoTools,
    };
  }
  // narrator: simpler, just spots + score (no MCP write tools)
  const fetcher = buildForecastFetcher(null, 'narrator', sendEvent);
  return {
    ...spotTools('narrator', sendEvent),
    ...scoreTools('narrator', sendEvent, fetcher),
  };
}

export async function runConsultation(
  opts: RunConsultationOptions,
): Promise<ConsultationResult> {
  const {
    initiator,
    consultee,
    topic,
    question,
    context,
    sendEvent,
    model,
    mcpClients,
    rateLimiter,
  } = opts;
  const runner = opts.runner ?? defaultRunAgent;
  const newId = opts.newCorrelationId ?? (() => nanoid(8));
  const correlation_id = newId();

  // 1. Question
  sendEvent({
    type: 'agent_message',
    from: initiator,
    to: consultee,
    content: question,
    kind: 'question',
    correlation_id,
  });

  // 2. consultation_start
  sendEvent({
    type: 'consultation_start',
    initiator,
    consultee,
    correlation_id,
    topic,
  });

  // 3. Mini-run (consultee's events fire from inside)
  const tools = await buildConsulteeTools(consultee, sendEvent, mcpClients, rateLimiter);
  const prompt = [
    `Initiator: ${initiator}`,
    `Topic: ${topic}`,
    context ? `Context:\n${context}` : null,
    ``,
    `Question:\n${question}`,
  ]
    .filter(Boolean)
    .join('\n');

  let answer: string;
  try {
    const result = await runner({
      agent: consultee,
      model,
      system: SYSTEM_PROMPT(consultee, initiator, opts.tripDates),
      prompt,
      tools,
      maxSteps: 5,
      sendEvent,
    });
    answer = result.text.trim() || '(no answer produced)';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'consultation failed';
    answer = `error: ${message}`;
  }

  // 4. consultation_end
  const summary = answer.length > 120 ? answer.slice(0, 117) + '…' : answer;
  sendEvent({
    type: 'consultation_end',
    initiator,
    consultee,
    correlation_id,
    summary,
  });

  // 5. Answer
  sendEvent({
    type: 'agent_message',
    from: consultee,
    to: initiator,
    content: answer,
    kind: 'answer',
    correlation_id,
  });

  return { answer };
}
