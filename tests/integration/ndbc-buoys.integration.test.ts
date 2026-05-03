/**
 * Integration test against NDBC realtime buoy text feed.
 * Skipped unless SURFPLANNER_INTEGRATION=1.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseNdbcText } from '../../lib/tools/buoys';

const enabled = process.env.SURFPLANNER_INTEGRATION === '1';
const skip = !enabled;
const reason = enabled ? undefined : 'set SURFPLANNER_INTEGRATION=1 to run live API tests';

// 46053 is "East Santa Barbara Channel" — long-running, reliable buoy.
// 46232 is "Point Loma South" near San Diego — also reliable.
const TEST_BUOYS = ['46053', '46232'];

describe('NDBC realtime buoy feed', { skip, todo: reason }, () => {
  for (const buoyId of TEST_BUOYS) {
    it(`returns 200 + parseable text for buoy ${buoyId}`, async () => {
      const res = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${buoyId}.txt`, {
        signal: AbortSignal.timeout(15_000),
      });
      assert.equal(res.status, 200, `expected 200 got ${res.status}`);
      const text = await res.text();
      assert.ok(text.length > 200, 'response unexpectedly short');
      assert.ok(text.includes('#YY'), 'missing NDBC header');
      const parsed = parseNdbcText(buoyId, text);
      assert.ok(parsed, 'parser returned null');
      assert.equal(parsed!.buoy_id, buoyId);
      assert.match(parsed!.observed_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  }
});
