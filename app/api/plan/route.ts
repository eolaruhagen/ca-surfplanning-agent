import { PlanRequestSchema, StreamEventSchema } from '@/lib/schemas';
import type { StreamEvent } from '@/lib/types';
import { runPlanTripWorkflow } from '@/lib/workflows/planTrip';
import { getOpenMeteoMcp, getMapsMcp, getFilesystemMcp } from '@/lib/mcp-clients';

export const runtime = 'nodejs';
// Hobby tier cap. Once Vercel Workflows are wired (see lib/workflows/planTrip.ts),
// each step gets its own clock and this becomes a thin orchestration shim.
export const maxDuration = 60;

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

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const send = (event: StreamEvent) => {
        if (closed) return;
        try {
          const validated = StreamEventSchema.parse(event);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(validated)}\n\n`),
          );
        } catch (err) {
          // Don't crash the stream on a bad event — just log and skip.
          console.error('drop invalid stream event', err);
        }
      };

      const meteoMcp = await safeMcp(getOpenMeteoMcp);
      const mapsMcp = await safeMcp(getMapsMcp);
      const fsMcp = await safeMcp(getFilesystemMcp);

      try {
        await runPlanTripWorkflow({
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
