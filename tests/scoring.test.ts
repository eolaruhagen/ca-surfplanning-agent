import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreSpotFit } from '../lib/scoring';
import type { Spot } from '../lib/spots';
import type { HourForecast } from '../lib/types';

const rincon: Spot = {
  id: 'rincon',
  name: 'Rincon',
  region: 'santa-barbara',
  lat: 34.37,
  lon: -119.48,
  tide_station_id: '9411340',
  primary_buoy_id: '46053',
  ideal_swell_direction_deg: [270, 310],
  ideal_swell_period_sec: [12, 18],
  ideal_wind_direction_deg: [60, 120],
  ideal_tide_state: 'low-mid',
  wave_size_feet: [3, 8],
  skill_level: 'intermediate-advanced',
  wave_character: 'right point',
  boards_recommended: ['shortboard', 'midlength'],
  crowd_factor: 'high',
  hazards: ['rocks'],
  notes: '',
  confidence: 'high',
};

const forecast = (over: Partial<HourForecast> = {}): HourForecast => ({
  spot_id: 'rincon',
  datetime: '2026-05-09T07:00',
  swell_height_ft: 5,
  swell_direction_deg: 285,
  swell_period_sec: 14,
  swell_peak_period_sec: 14,
  wind_speed_mph: 5,
  wind_direction_deg: 90,
  combined_wave_height_ft: 5.5,
  ...over,
});

describe('scoreSpotFit', () => {
  it('peak conditions score 90+', () => {
    const result = scoreSpotFit(forecast(), rincon);
    assert.ok(result.score >= 90, `expected >=90, got ${result.score}: ${result.reasoning}`);
  });

  it('blown out (heavy onshore wind) drops the score', () => {
    const onshore = scoreSpotFit(
      forecast({ wind_speed_mph: 30, wind_direction_deg: 270 }),
      rincon,
    );
    const clean = scoreSpotFit(forecast(), rincon);
    assert.ok(onshore.score < clean.score - 15, `onshore=${onshore.score} clean=${clean.score}`);
  });

  it('wrong size kills the score even with right direction', () => {
    const tiny = scoreSpotFit(forecast({ combined_wave_height_ft: 0.5, swell_height_ft: 0.4 }), rincon);
    assert.ok(tiny.score < 70, `expected <70 got ${tiny.score}`);
  });

  it('returns reasoning that mentions size, period, swell, wind', () => {
    const result = scoreSpotFit(forecast(), rincon);
    assert.match(result.reasoning, /ft fit/);
    assert.match(result.reasoning, /period/);
    assert.match(result.reasoning, /wind/);
  });

  it('handles spots with optional fields missing', () => {
    const generic: Spot = {
      ...rincon,
      ideal_swell_direction_deg: undefined,
      ideal_swell_period_sec: undefined,
      ideal_wind_direction_deg: undefined,
    };
    const result = scoreSpotFit(forecast(), generic);
    assert.ok(result.score >= 0 && result.score <= 100);
  });
});
