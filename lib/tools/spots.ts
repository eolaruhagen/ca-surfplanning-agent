import { readFile } from 'node:fs/promises';
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { SpotSchema } from '@/lib/schemas';
import type { Spot } from '@/lib/spots';
import type { AgentName, SendEvent } from '@/lib/types';
import { haversineMiles } from '@/lib/direction-utils';

let cached: Spot[] | null = null;

export async function loadSpots(): Promise<Spot[]> {
  if (cached) return cached;
  const path = `${process.cwd()}/public/spots.json`;
  const raw = JSON.parse(await readFile(path, 'utf8'));
  cached = z.array(SpotSchema).parse(raw) as unknown as Spot[];
  return cached;
}

export function spotTools(agent: AgentName, sendEvent: SendEvent): ToolSet {
  return {
    list_candidate_spots: tool({
      description:
        'List California surf spots within a region or near a coordinate. Returns id, name, region, lat, lon, skill_level, wave_size_feet, confidence.',
      inputSchema: z.object({
        region: z.string().optional().describe('Region key (e.g., "san-diego", "central-coast")'),
        near_lat: z.number().optional(),
        near_lon: z.number().optional(),
        max_distance_miles: z.number().optional().default(50),
        skill_level_max: z.string().optional().describe('Filter to spots at or below this skill level'),
        limit: z.number().int().min(1).max(50).optional().default(25),
      }),
      execute: async (args) => {
        sendEvent({ type: 'tool_call', agent, name: 'list_candidate_spots', source: 'local', args });
        const spots = await loadSpots();
        let filtered = spots;
        if (args.region) {
          filtered = filtered.filter((s) => s.region === args.region);
        }
        if (typeof args.near_lat === 'number' && typeof args.near_lon === 'number') {
          const max = args.max_distance_miles ?? 50;
          filtered = filtered.filter(
            (s) => haversineMiles([args.near_lon!, args.near_lat!], [s.lon, s.lat]) <= max,
          );
        }
        const summary = filtered.slice(0, args.limit ?? 25).map((s) => ({
          id: s.id,
          name: s.name,
          region: s.region,
          lat: s.lat,
          lon: s.lon,
          skill_level: s.skill_level,
          wave_size_feet: s.wave_size_feet,
          confidence: s.confidence,
        }));
        sendEvent({
          type: 'tool_result',
          agent,
          name: 'list_candidate_spots',
          summary: `${summary.length} spots`,
        });
        return summary;
      },
    }),

    lookup_spot: tool({
      description: 'Full record for one spot by id, including ideal swell/wind/tide and hazard notes.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        sendEvent({ type: 'tool_call', agent, name: 'lookup_spot', source: 'local', args: { id } });
        const spots = await loadSpots();
        const found = spots.find((s) => s.id === id);
        if (!found) {
          sendEvent({ type: 'tool_result', agent, name: 'lookup_spot', summary: `not found: ${id}` });
          return { error: `spot not found: ${id}` };
        }
        sendEvent({ type: 'tool_result', agent, name: 'lookup_spot', summary: found.name });
        return found;
      },
    }),
  };
}
