/**
 * Integration test against NOAA CO-OPS tide predictions API.
 * Skipped unless SURFPLANNER_INTEGRATION=1 (npm run test:integration).
 * Hits live network — not for hermetic CI.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SURFPLANNER_INTEGRATION === '1';
const skip = !enabled;
const reason = enabled ? undefined : 'set SURFPLANNER_INTEGRATION=1 to run live API tests';

const NOAA = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

describe('NOAA tide predictions API', { skip, todo: reason }, () => {
  it('returns 200 + JSON for Santa Barbara station, two-day window', async () => {
    const url = new URL(NOAA);
    url.searchParams.set('product', 'predictions');
    url.searchParams.set('application', 'ca-surf-trip-planner-test');
    url.searchParams.set('begin_date', todayCompact());
    url.searchParams.set('end_date', plusDaysCompact(2));
    url.searchParams.set('datum', 'MLLW');
    url.searchParams.set('station', '9411340');
    url.searchParams.set('time_zone', 'lst_ldt');
    url.searchParams.set('units', 'english');
    url.searchParams.set('interval', 'hilo');
    url.searchParams.set('format', 'json');

    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    assert.equal(res.status, 200, `expected 200 got ${res.status}`);
    const body = (await res.json()) as { predictions?: Array<{ t: string; v: string; type: string }>; error?: { message?: string } };
    assert.ok(!body.error, `error from NOAA: ${body.error?.message}`);
    assert.ok(Array.isArray(body.predictions), 'predictions array missing');
    assert.ok(body.predictions!.length >= 2, `expected at least 2 hi/lo events in 2-day window, got ${body.predictions!.length}`);
    const first = body.predictions![0];
    assert.ok(['H', 'L'].includes(first.type), `unexpected tide type ${first.type}`);
    assert.ok(/^\d{4}-\d{2}-\d{2}/.test(first.t), `unexpected time format ${first.t}`);
    assert.ok(Number.isFinite(Number(first.v)), `value not numeric: ${first.v}`);
  });
});

function todayCompact(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}
function plusDaysCompact(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}
function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
