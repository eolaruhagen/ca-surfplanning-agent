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

function crowdMultiplierFromFactor(crowdFactor: string): number {
  const cf = crowdFactor.toLowerCase();
  if (cf.includes('low') || cf.includes('uncrowd') || cf.includes('quiet')) return 1.0;
  if (cf.includes('very high') || cf.includes('extreme') || cf.includes('packed')) return 0.75;
  if (cf.includes('high') || cf.includes('busy')) return 0.85;
  if (cf.includes('moderate') || cf.includes('medium') || cf.includes('average')) return 0.93;
  return 0.90;
}

function timeOfDayFactor(datetime: string): { factor: number; label: string } {
  const m = datetime.match(/T(\d{2}):/);
  const hour = m ? parseInt(m[1], 10) : 8;
  if (hour >= 5 && hour <= 9) return { factor: 1.0, label: `${hour}:00 early morning (glassy)` };
  if (hour >= 10 && hour <= 12) return { factor: 0.95, label: `${hour}:00 mid-morning` };
  if (hour >= 13 && hour <= 16) return { factor: 0.88, label: `${hour}:00 afternoon (sea breeze likely)` };
  return { factor: 0.82, label: `${hour}:00 low-priority window` };
}

function waveQualitySignature(periodSec: number, windSpeedMph: number): string {
  const isClean = windSpeedMph < 8;
  if (periodSec >= 14 && isClean) return 'powerful & lined-up';
  if (periodSec >= 11 && isClean) return 'punchy & organized';
  if (periodSec >= 11) return 'punchy but textured';
  if (periodSec >= 8 && isClean) return 'moderate, fun';
  if (periodSec >= 8) return 'moderate, bumpy';
  return 'short-period, mushy';
}

export type ScoreBreakdown = {
  score: number;
  reasoning: string;
  components: {
    swell_size: number;
    swell_period: number;
    swell_direction: number;
    wind: number;
    crowd: number;
    time_of_day: number;
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

  const crowdMult = crowdMultiplierFromFactor(spot.crowd_factor);
  const { factor: todFactor, label: todLabel } = timeOfDayFactor(forecast.datetime);

  // Size acts as a multiplier — tiny or huge waves at the wrong spot kill the
  // session no matter how clean the period/direction/wind are. Crowd and ToD
  // then scale the result down for busy spots and off-peak hours.
  const otherFit = 0.15 + 0.3 * swellPeriod + 0.25 * swellDirection + 0.3 * wind;
  const composite = clamp(swellSize * otherFit * crowdMult * todFactor, 0, 1);

  const score = Math.round(composite * 100);
  const waveQuality = waveQualitySignature(forecast.swell_period_sec, forecast.wind_speed_mph);

  const bits: string[] = [];
  bits.push(
    `${forecast.combined_wave_height_ft.toFixed(1)}ft ${waveQuality} — size fit ${(swellSize * 100).toFixed(0)}% vs ideal ${spot.wave_size_feet[0]}–${spot.wave_size_feet[1]}ft`,
  );
  if (spot.ideal_swell_period_sec) {
    bits.push(
      `${forecast.swell_period_sec.toFixed(0)}s period (${(swellPeriod * 100).toFixed(0)}% fit vs ideal ${spot.ideal_swell_period_sec[0]}–${spot.ideal_swell_period_sec[1]}s)`,
    );
  }
  if (spot.ideal_swell_direction_deg) {
    bits.push(
      `swell from ${forecast.swell_direction_deg.toFixed(0)}° (${(swellDirection * 100).toFixed(0)}% directional fit)`,
    );
  }
  bits.push(
    `wind ${forecast.wind_speed_mph.toFixed(0)}mph from ${forecast.wind_direction_deg.toFixed(0)}° (${(wind * 100).toFixed(0)}% wind score)`,
  );
  bits.push(`crowd: ${spot.crowd_factor} → ${(crowdMult * 100).toFixed(0)}% multiplier`);
  bits.push(`session time: ${todLabel} → ${(todFactor * 100).toFixed(0)}% ToD factor`);
  if (spot.ideal_tide_state) {
    bits.push(`ideal tide state: ${spot.ideal_tide_state}`);
  }

  return {
    score,
    reasoning: bits.join('; '),
    components: {
      swell_size: swellSize,
      swell_period: swellPeriod,
      swell_direction: swellDirection,
      wind,
      crowd: crowdMult,
      time_of_day: todFactor,
    },
  };
}
