/**
 * Integration test against Open-Meteo public APIs (used by the Open-Meteo MCP
 * server under the hood — verify the underlying HTTP surface is alive).
 * Skipped unless SURFPLANNER_INTEGRATION=1.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SURFPLANNER_INTEGRATION === '1';
const skip = !enabled;
const reason = enabled ? undefined : 'set SURFPLANNER_INTEGRATION=1 to run live API tests';

describe('Open-Meteo public APIs', { skip, todo: reason }, () => {
  it('marine API returns 200 + swell data for Rincon coords', async () => {
    const url = new URL('https://marine-api.open-meteo.com/v1/marine');
    url.searchParams.set('latitude', '34.37');
    url.searchParams.set('longitude', '-119.48');
    url.searchParams.set(
      'hourly',
      'swell_wave_height,swell_wave_direction,swell_wave_period,wave_height',
    );
    url.searchParams.set('length_unit', 'imperial');
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { hourly?: { swell_wave_height?: number[]; time?: string[] } };
    assert.ok(body.hourly?.swell_wave_height, 'no swell_wave_height in response');
    assert.ok(body.hourly!.swell_wave_height!.length > 0);
    assert.ok(body.hourly!.time && body.hourly!.time.length > 0);
  });

  it('forecast API returns 200 + wind data', async () => {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', '34.37');
    url.searchParams.set('longitude', '-119.48');
    url.searchParams.set('hourly', 'wind_speed_10m,wind_direction_10m');
    url.searchParams.set('wind_speed_unit', 'mph');
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { hourly?: { wind_speed_10m?: number[] } };
    assert.ok(body.hourly?.wind_speed_10m);
    assert.ok(body.hourly!.wind_speed_10m!.length > 0);
  });
});
