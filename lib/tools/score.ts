import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { loadSpots } from './spots';
import { scoreSpotFit } from '@/lib/scoring';
import type { AgentName, HourForecast, SendEvent } from '@/lib/types';

type ForecastFetcher = (args: {
  spot_id: string;
  lat: number;
  lon: number;
  datetime: string;
}) => Promise<HourForecast>;

export function buildForecastFetcher(
  meteoClient: Client | null,
  agent: AgentName,
  sendEvent: SendEvent,
): ForecastFetcher {
  return async ({ spot_id, lat, lon, datetime }) => {
    if (!meteoClient) {
      const stub: HourForecast = {
        spot_id,
        datetime,
        swell_height_ft: 3,
        swell_direction_deg: 285,
        swell_period_sec: 12,
        swell_peak_period_sec: 12,
        wind_speed_mph: 6,
        wind_direction_deg: 90,
        combined_wave_height_ft: 3.5,
      };
      sendEvent({
        type: 'data_observed',
        agent,
        kind: 'forecast',
        summary: `(stub) ${spot_id} ${datetime} 3.5ft @ 12s`,
        spot_id,
      });
      return stub;
    }

    const day = datetime.slice(0, 10);
    const hourIdx = Number(datetime.slice(11, 13));
    const marine = await meteoClient.callTool({
      name: 'marine_weather',
      arguments: {
        latitude: lat,
        longitude: lon,
        hourly: [
          'swell_wave_height',
          'swell_wave_direction',
          'swell_wave_period',
          'swell_wave_peak_period',
          'wave_height',
        ],
        start_date: day,
        end_date: day,
        length_unit: 'imperial',
      },
    });
    const wind = await meteoClient.callTool({
      name: 'weather_forecast',
      arguments: {
        latitude: lat,
        longitude: lon,
        hourly: ['wind_speed_10m', 'wind_direction_10m'],
        start_date: day,
        end_date: day,
        wind_speed_unit: 'mph',
      },
    });

    const parsedMarine = parseMcpJson(marine);
    const parsedWind = parseMcpJson(wind);

    const m = (parsedMarine?.hourly ?? {}) as Record<string, unknown>;
    const w = (parsedWind?.hourly ?? {}) as Record<string, unknown>;

    const arr = (v: unknown): number[] => (Array.isArray(v) ? v.map(Number) : []);

    const f: HourForecast = {
      spot_id,
      datetime,
      swell_height_ft: arr(m.swell_wave_height)[hourIdx] ?? 0,
      swell_direction_deg: arr(m.swell_wave_direction)[hourIdx] ?? 0,
      swell_period_sec: arr(m.swell_wave_period)[hourIdx] ?? 0,
      swell_peak_period_sec:
        arr(m.swell_wave_peak_period)[hourIdx] ?? arr(m.swell_wave_period)[hourIdx] ?? 0,
      wind_speed_mph: arr(w.wind_speed_10m)[hourIdx] ?? 0,
      wind_direction_deg: arr(w.wind_direction_10m)[hourIdx] ?? 0,
      combined_wave_height_ft: arr(m.wave_height)[hourIdx] ?? arr(m.swell_wave_height)[hourIdx] ?? 0,
    };

    sendEvent({
      type: 'data_observed',
      agent,
      kind: 'forecast',
      summary: `${spot_id} ${datetime} ${f.combined_wave_height_ft.toFixed(1)}ft @ ${f.swell_period_sec.toFixed(0)}s`,
      spot_id,
    });

    return f;
  };
}

function parseMcpJson(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object' || !('content' in res)) return null;
  const content = (res as { content: unknown }).content;
  const c = Array.isArray(content) ? content[0] : null;
  if (!c || typeof c !== 'object' || !('text' in c)) return null;
  try {
    return JSON.parse((c as { text: string }).text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function scoreTools(
  agent: AgentName,
  sendEvent: SendEvent,
  fetcher: ForecastFetcher,
): ToolSet {
  return {
    score_spot_fit: tool({
      description:
        'Score how well a spot will work at a specific datetime (ISO with hour). Returns 0–100 fit score with reasoning. Internally fetches marine + wind forecast.',
      inputSchema: z.object({
        spot_id: z.string(),
        datetime: z.string().describe('ISO datetime, e.g. "2026-05-09T07:00"'),
      }),
      execute: async ({ spot_id, datetime }) => {
        sendEvent({
          type: 'tool_call',
          agent,
          name: 'score_spot_fit',
          source: 'local',
          args: { spot_id, datetime },
        });
        const spots = await loadSpots();
        const spot = spots.find((s) => s.id === spot_id);
        if (!spot) {
          sendEvent({
            type: 'tool_result',
            agent,
            name: 'score_spot_fit',
            summary: `not found: ${spot_id}`,
          });
          return { error: `spot not found: ${spot_id}` };
        }
        const forecast = await fetcher({ spot_id, lat: spot.lat, lon: spot.lon, datetime });
        const result = scoreSpotFit(forecast, spot);
        sendEvent({
          type: 'tool_result',
          agent,
          name: 'score_spot_fit',
          summary: `${spot.name}: ${result.score}/100`,
        });
        sendEvent({
          type: 'data_observed',
          agent,
          kind: 'spot',
          summary: `${spot.name} @ ${datetime} → ${result.score}/100`,
          spot_id,
          score: result.score,
        });
        return {
          spot_id,
          spot_name: spot.name,
          datetime,
          score: result.score,
          reasoning: result.reasoning,
          forecast_snapshot: forecast,
        };
      },
    }),
  };
}
