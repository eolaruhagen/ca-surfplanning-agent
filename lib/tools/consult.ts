/**
 * consult_agent — exposed to the planner (and later the narrator) so it can
 * ask a focused question to another agent on the team mid-run. Wraps
 * runConsultation, gates calls behind a per-run ConsultationBudget, and
 * returns a structured `{ answer }` (or `{ error }` if budget is exhausted).
 */

import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import type { AgentName, SendEvent } from '@/lib/types';
import type { ConsultationBudget } from '@/lib/consultation-budget';
import type { RateLimiter } from '@/lib/rate-limiter';
import {
  runConsultation,
  type ConsultationMcpClients,
} from '@/lib/agents/consultation';

export type ConsultToolContext = {
  initiator: AgentName;
  budget: ConsultationBudget;
  sendEvent: SendEvent;
  mcpClients?: ConsultationMcpClients;
  rateLimiter?: RateLimiter;
  model?: string;
};

export function consultTools(ctx: ConsultToolContext): ToolSet {
  return {
    consult_agent: tool({
      description:
        "Ask a focused question to another agent on the team. Use when you need to verify something is safe (recon: spot/condition check) or want a second opinion. Costs one of your N consultations per run — use sparingly. Returns the consultee's answer.",
      inputSchema: z.object({
        consultee: z.enum(['recon', 'narrator']),
        topic: z
          .string()
          .max(80)
          .describe('Short topic, e.g. "skill safety check"'),
        question: z
          .string()
          .min(1)
          .max(500)
          .describe('Specific question with context the consultee needs'),
      }),
      execute: async ({ consultee, topic, question }) => {
        const check = ctx.budget.consume();
        if (!check.ok) {
          ctx.sendEvent({
            type: 'tool_result',
            agent: ctx.initiator,
            name: 'consult_agent',
            summary: `error: ${check.reason}`,
          });
          return { error: check.reason };
        }
        ctx.sendEvent({
          type: 'tool_call',
          agent: ctx.initiator,
          name: 'consult_agent',
          source: 'local',
          args: { consultee, topic, question },
        });
        try {
          const { answer } = await runConsultation({
            initiator: ctx.initiator,
            consultee,
            topic,
            question,
            sendEvent: ctx.sendEvent,
            model: ctx.model,
            mcpClients: ctx.mcpClients,
            rateLimiter: ctx.rateLimiter,
          });
          ctx.sendEvent({
            type: 'tool_result',
            agent: ctx.initiator,
            name: 'consult_agent',
            summary: `${consultee} answered (${answer.length} chars)`,
          });
          return { answer };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'consultation failed';
          ctx.sendEvent({
            type: 'tool_result',
            agent: ctx.initiator,
            name: 'consult_agent',
            summary: `error: ${message}`,
          });
          return { error: message };
        }
      },
    }),
  };
}
