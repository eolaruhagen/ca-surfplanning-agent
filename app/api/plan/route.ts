import { PlanRequestSchema, StreamEventSchema } from '@/lib/schemas';
import type { StreamEvent } from '@/lib/types';
import { runPlanTrip } from '@/lib/agents/orchestrator';
import { planTripWorkflow } from '@/lib/workflows/planTrip';
import { getOpenMeteoMcp, getMapsMcp, getFilesystemMcp } from '@/lib/mcp-clients';

export const runtime = 'nodejs';
// Inline orchestrator path is bounded by this. Workflow path bypasses it
// because each step gets its own function invocation.
export const maxDuration = 60;

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
      const reader = (run.readable as ReadableStream<StreamEvent>).getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;
          const validated = safeValidate(value);
          if (validated) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(validated)}\n\n`));
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'workflow stream error';
        const errEvent: StreamEvent = { type: 'error', message };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errEvent)}\n\n`));
      } finally {
        try {
          controller.close();
        } catch {}
      }
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
