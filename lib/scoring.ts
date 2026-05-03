import type { Spot } from './spots';
import type { HourForecast } from './types';
import { directionDistance } from './direction-utils';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const inRange = (v: number, [a, b]: [number, number]) => v >= a && v <= b;

function rangeFitScore(value: number, range: [number, number]): number {
  if (inRange(value, range)) return 1;
  const center = (range[0] + range[1]) / 2;
  const halfWidth = (range[1] - range[0]) / 2 || 1;
  const distance = Math.abs(value - center) - halfWidth;
  return clamp(1 - distance / (halfWidth * 2), 0, 1);
}

function compassFitScore(deg: number, range: [number, number]): number {
  const dist = directionDistance(deg, range);
  if (dist === 0) return 1;
  return clamp(1 - dist / 60, 0, 1);
}

export type ScoreBreakdown = {
  score: number;
  reasoning: string;
  components: {
    swell_size: number;
    swell_period: number;
    swell_direction: number;
    wind: number;
  };
};

export function scoreSpotFit(forecast: HourForecast, spot: Spot): ScoreBreakdown {
  const swellSize = rangeFitScore(forecast.combined_wave_height_ft, spot.wave_size_feet);

  const swellPeriod = spot.ideal_swell_period_sec
    ? rangeFitScore(forecast.swell_period_sec, spot.ideal_swell_period_sec)
    : 0.7;

  const swellDirection = spot.ideal_swell_direction_deg
    ? compassFitScore(forecast.swell_direction_deg, spot.ideal_swell_direction_deg)
    : 0.7;

  const windDir = spot.ideal_wind_direction_deg
    ? compassFitScore(forecast.wind_direction_deg, spot.ideal_wind_direction_deg)
    : 0.7;
  const windSpeedPenalty = clamp(1 - Math.max(0, forecast.wind_speed_mph - 15) / 15, 0, 1);
  const wind = windDir * windSpeedPenalty;

  // Size acts as a multiplier — tiny or huge waves at the wrong spot kill the
  // session no matter how clean the period/direction/wind are.
  const otherFit =
    0.15 + 0.3 * swellPeriod + 0.25 * swellDirection + 0.3 * wind;
  const composite = swellSize * otherFit;

  const score = Math.round(composite * 100);

  const bits: string[] = [];
  bits.push(
    `${forecast.combined_wave_height_ft.toFixed(1)}ft fit ${(swellSize * 100).toFixed(0)}% vs ideal ${spot.wave_size_feet[0]}–${spot.wave_size_feet[1]}ft`,
  );
  if (spot.ideal_swell_period_sec) {
    bits.push(
      `${forecast.swell_period_sec.toFixed(0)}s period (${(swellPeriod * 100).toFixed(0)}%)`,
    );
  }
  if (spot.ideal_swell_direction_deg) {
    bits.push(
      `swell @${forecast.swell_direction_deg.toFixed(0)}° (${(swellDirection * 100).toFixed(0)}%)`,
    );
  }
  bits.push(
    `wind ${forecast.wind_speed_mph.toFixed(0)}mph @${forecast.wind_direction_deg.toFixed(0)}° (${(wind * 100).toFixed(0)}%)`,
  );

  return {
    score,
    reasoning: bits.join('; '),
    components: {
      swell_size: swellSize,
      swell_period: swellPeriod,
      swell_direction: swellDirection,
      wind,
    },
  };
}
