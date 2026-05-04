import { PlanRequestSchema, StreamEventSchema } from '@/lib/schemas';
import type { StreamEvent } from '@/lib/types';
import { runPlanTrip } from '@/lib/agents/orchestrator';
import { planTripWorkflow } from '@/lib/workflows/planTrip';
import { getOpenMeteoMcp, getMapsMcp, getFilesystemMcp } from '@/lib/mcp-clients';

export const runtime = 'nodejs';
// Caps how long the SSE response can stay open. The workflow path runs
// each step in its own function invocation (up to 800s each), but THIS
// route is the function holding the SSE pipe to the browser — if it dies
// before the workflow emits `done`, the client never navigates and the
// live view freezes on the last event it saw. Sized to comfortably
// outlast a vision + recon + planner + narrator sequence (~5–7 min in
// the worst case observed in prod).
export const maxDuration = 800;

const USE_WORKFLOWS = process.env.USE_WORKFLOWS === '1';

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response('invalid JSON body', { status: 400 });
  }

  const parsed = PlanRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'invalid request', issues: parsed.error.issues.slice(0, 5) }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
  const input = parsed.data;

  if (USE_WORKFLOWS) {
    return runViaWorkflow(input);
  }
  return runInline(input);
}

async function runViaWorkflow(input: ReturnType<typeof PlanRequestSchema.parse>) {
  const { start } = await import('workflow/api');
  const run = await start(planTripWorkflow, [input]);

  const sse = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueueEvent = (e: StreamEvent) => {
        const validated = safeValidate(e);
        if (validated) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(validated)}\n\n`));
        }
      };

      // Heartbeat — SSE comment lines are ignored by browsers but keep the
      // connection alive across silent stretches (e.g. while a step thinks
      // for a minute without writing). Without this, intermediate proxies
      // can sever an idle stream and the client sees an early close.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {}
      }, 15_000);

      // Track whether a step already emitted a `done` or `error` event.
      // Workflow steps emit events via getWritable() which is async — if a
      // step rejects, the runtime can close the writable before the queued
      // event flushes through. We tail-check `run.returnValue` after the
      // reader closes so a silent rejection still surfaces to the client.
      let sawTerminator = false;

      const reader = (run.readable as ReadableStream<StreamEvent>).getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;
          if (value.type === 'done' || value.type === 'error') {
            sawTerminator = true;
          }
          enqueueEvent(value);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'workflow stream error';
        enqueueEvent({ type: 'error', message });
        sawTerminator = true;
      }

      // Safety net: if the workflow rejected and the reject reason never
      // reached the client through the writable channel, surface it now.
      if (!sawTerminator) {
        try {
          await run.returnValue;
          enqueueEvent({
            type: 'error',
            message:
              'Workflow finished without emitting a final event. The session ended unexpectedly — please retry.',
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'workflow rejected without details';
          enqueueEvent({ type: 'error', message: `workflow failed: ${message}` });
        }
      }

      clearInterval(heartbeat);
      try {
        controller.close();
      } catch {}
    },
  });

  return sseResponse(sse);
}

async function runInline(input: ReturnType<typeof PlanRequestSchema.parse>) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const send = (event: StreamEvent) => {
        if (closed) return;
        const validated = safeValidate(event);
        if (validated) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(validated)}\n\n`));
          } catch {}
        }
      };

      const meteoMcp = await safeMcp(getOpenMeteoMcp);
      const mapsMcp = await safeMcp(getMapsMcp);
      const fsMcp = await safeMcp(getFilesystemMcp);

      try {
        await runPlanTrip({
          input,
          mcpClients: { meteo: meteoMcp, maps: mapsMcp, fs: fsMcp },
          sendEvent: send,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        send({ type: 'error', message });
      } finally {
        await Promise.allSettled([
          meteoMcp?.close().catch(() => {}),
          mapsMcp?.close().catch(() => {}),
          fsMcp?.close().catch(() => {}),
        ]);
        closed = true;
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return sseResponse(stream);
}

function safeValidate(event: unknown): StreamEvent | null {
  const result = StreamEventSchema.safeParse(event);
  if (!result.success) {
    console.error('drop invalid stream event', result.error.issues.slice(0, 2));
    return null;
  }
  return result.data;
}

function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

async function safeMcp<T>(factory: () => Promise<T>): Promise<T | null> {
  try {
    return await factory();
  } catch (err) {
    console.error('MCP spawn failed:', err);
    return null;
  }
}
