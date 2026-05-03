import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import type { AgentName, SendEvent } from '@/lib/types';

const NOAA_BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

type TidePrediction = { t: string; v: string; type: 'H' | 'L' };

export function tideTools(agent: AgentName, sendEvent: SendEvent): ToolSet {
  return {
    get_tide_predictions: tool({
      description:
        'NOAA tide hi/lo predictions for a station and date range (PT timezone, feet). Returns array of {time, height_ft, type:"H"|"L"}.',
      inputSchema: z.object({
        station_id: z.string(),
        start_date: z.string().describe('YYYY-MM-DD'),
        end_date: z.string().describe('YYYY-MM-DD'),
      }),
      execute: async ({ station_id, start_date, end_date }) => {
        sendEvent({
          type: 'tool_call',
          agent,
          name: 'get_tide_predictions',
          source: 'local',
          args: { station_id, start_date, end_date },
        });
        const url = new URL(NOAA_BASE);
        url.searchParams.set('product', 'predictions');
        url.searchParams.set('application', 'ca-surf-trip-planner');
        url.searchParams.set('begin_date', start_date.replaceAll('-', ''));
        url.searchParams.set('end_date', end_date.replaceAll('-', ''));
        url.searchParams.set('datum', 'MLLW');
        url.searchParams.set('station', station_id);
        url.searchParams.set('time_zone', 'lst_ldt');
        url.searchParams.set('units', 'english');
        url.searchParams.set('interval', 'hilo');
        url.searchParams.set('format', 'json');

        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`NOAA ${res.status}`);
          const json = (await res.json()) as { predictions?: TidePrediction[]; error?: { message?: string } };
          if (json.error) throw new Error(json.error.message ?? 'NOAA error');
          const predictions = (json.predictions ?? []).map((p) => ({
            time: p.t,
            height_ft: Number(p.v),
            type: p.type,
          }));
          sendEvent({
            type: 'tool_result',
            agent,
            name: 'get_tide_predictions',
            summary: `${predictions.length} hi/lo events`,
          });
          sendEvent({
            type: 'data_observed',
            agent,
            kind: 'tide',
            summary: `Station ${station_id}: ${predictions.length} tide events ${start_date}→${end_date}`,
          });
          return { station_id, predictions };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'fetch failed';
          sendEvent({
            type: 'tool_result',
            agent,
            name: 'get_tide_predictions',
            summary: `error: ${message}`,
          });
          return { error: message };
        }
      },
    }),
  };
}
