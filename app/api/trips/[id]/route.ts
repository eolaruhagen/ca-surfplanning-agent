import { kv } from '@/lib/kv';
import { TripSchema } from '@/lib/schemas';
import type { Trip } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id || id.length > 64) {
    return new Response('invalid id', { status: 400 });
  }

  const raw = await kv.get<Trip>(`trip:${id}`);
  if (!raw) {
    return new Response(JSON.stringify({ error: 'not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = TripSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('corrupt trip in KV', id, parsed.error.issues.slice(0, 3));
    return new Response(JSON.stringify({ error: 'corrupt trip' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(parsed.data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
