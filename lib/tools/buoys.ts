import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import type { AgentName, SendEvent } from '@/lib/types';

const NDBC_BASE = 'https://www.ndbc.noaa.gov/data/realtime2';

export type BuoyReading = {
  buoy_id: string;
  observed_at: string;
  wind_speed_kts: number | null;
  wind_direction_deg: number | null;
  wave_height_ft: number | null;
  dominant_period_sec: number | null;
  mean_wave_direction_deg: number | null;
  water_temp_f: number | null;
};

const M_TO_FT = 3.28084;
const MS_TO_KTS = 1.94384;

function parseValue(s: string): number | null {
  if (s === 'MM' || s === '' || s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseNdbcText(buoy_id: string, text: string): BuoyReading | null {
  const lines = text.split(/\r?\n/).filter((l) => l && !l.startsWith('#'));
  if (lines.length === 0) return null;
  const cols = lines[0].split(/\s+/);
  if (cols.length < 11) return null;
  const [yr, mo, dy, hr, mn] = cols;
  const observed_at = `${yr}-${mo.padStart(2, '0')}-${dy.padStart(2, '0')}T${hr.padStart(2, '0')}:${mn.padStart(2, '0')}:00Z`;

  const windDir = parseValue(cols[5]);
  const windSpeedMs = parseValue(cols[6]);
  const waveHeightM = parseValue(cols[8]);
  const dominantPeriod = parseValue(cols[9]);
  const meanWaveDir = parseValue(cols[11]);
  const waterTempC = parseValue(cols[14]);

  return {
    buoy_id,
    observed_at,
    wind_speed_kts: windSpeedMs == null ? null : windSpeedMs * MS_TO_KTS,
    wind_direction_deg: windDir,
    wave_height_ft: waveHeightM == null ? null : waveHeightM * M_TO_FT,
    dominant_period_sec: dominantPeriod,
    mean_wave_direction_deg: meanWaveDir,
    water_temp_f: waterTempC == null ? null : (waterTempC * 9) / 5 + 32,
  };
}

export function buoyTools(agent: AgentName, sendEvent: SendEvent): ToolSet {
  return {
    get_buoy_reading: tool({
      description:
        'Latest observed swell + wind from an offshore NDBC buoy. Returns wave height (ft), period (s), wind (kts/deg), water temp (°F).',
      inputSchema: z.object({ buoy_id: z.string() }),
      execute: async ({ buoy_id }) => {
        sendEvent({ type: 'tool_call', agent, name: 'get_buoy_reading', source: 'local', args: { buoy_id } });
        try {
          const res = await fetch(`${NDBC_BASE}/${buoy_id}.txt`);
          if (!res.ok) throw new Error(`NDBC ${res.status}`);
          const text = await res.text();
          const parsed = parseNdbcText(buoy_id, text);
          if (!parsed) throw new Error('no readings');
          sendEvent({
            type: 'tool_result',
            agent,
            name: 'get_buoy_reading',
            summary: `${buoy_id} ${parsed.wave_height_ft?.toFixed(1) ?? '?'}ft @ ${parsed.dominant_period_sec ?? '?'}s`,
          });
          sendEvent({
            type: 'data_observed',
            agent,
            kind: 'buoy',
            summary: `Buoy ${buoy_id}: ${parsed.wave_height_ft?.toFixed(1) ?? '?'}ft @ ${parsed.dominant_period_sec ?? '?'}s`,
          });
          return parsed;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'fetch failed';
          sendEvent({ type: 'tool_result', agent, name: 'get_buoy_reading', summary: `error: ${message}` });
          return { error: message };
        }
      },
    }),
  };
}
