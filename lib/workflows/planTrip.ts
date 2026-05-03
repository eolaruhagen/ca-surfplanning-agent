/**
 * Vercel Workflow scaffold for the planning pipeline.
 *
 * Today this is a thin re-export of the plain orchestrator. The orchestrator
 * already runs the four agents sequentially and emits SSE-shaped events.
 *
 * To convert to a real Vercel Workflow once Workflows are enabled on the project:
 *  1. Wrap next.config.ts with `withWorkflow` from `workflow/next`.
 *  2. Add `'use workflow'` to runPlanTripWorkflow below.
 *  3. Add `'use step'` to each agent step (vision/recon/planner/narrator/save)
 *     and split the orchestrator into those step calls.
 *
 * Each step then runs in its own Vercel Function invocation, dodging the 60s
 * Hobby-tier per-function cap.
 */

import type { PlanRequest, SendEvent, Trip } from '@/lib/types';
import type { McpClients } from '@/lib/agents/orchestrator';
import { runPlanTrip } from '@/lib/agents/orchestrator';

export async function runPlanTripWorkflow(opts: {
  input: PlanRequest;
  mcpClients: McpClients;
  sendEvent: SendEvent;
}): Promise<Trip> {
  return runPlanTrip(opts);
}
