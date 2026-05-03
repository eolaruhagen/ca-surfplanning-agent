import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseNdbcText } from '../lib/tools/buoys';

const sampleNdbc = `#YY  MM DD hh mm WDIR WSPD GST  WVHT   DPD   APD MWD   PRES  ATMP  WTMP  DEWP  VIS PTDY  TIDE
#yr  mo dy hr mn degT m/s  m/s     m   sec   sec degT   hPa  degC  degC  degC   mi  hPa    ft
2026 05 03 17 30 280  6.0  7.5   2.4  12.0   8.5 285 1015.0  18.0  14.5  10.0   MM   MM    MM
2026 05 03 17 00 275  5.5  7.0   2.3  11.5   8.4 280 1015.1  18.1  14.4  10.1   MM   MM    MM`;

describe('parseNdbcText', () => {
  it('parses the most-recent reading from header-prefixed text', () => {
    const r = parseNdbcText('46053', sampleNdbc);
    assert.ok(r);
    assert.equal(r!.observed_at, '2026-05-03T17:30:00Z');
    assert.equal(r!.wind_direction_deg, 280);
    assert.ok(Math.abs(r!.wind_speed_kts! - 11.66) < 0.1, `got ${r!.wind_speed_kts}`);
    assert.ok(Math.abs(r!.wave_height_ft! - 7.87) < 0.1, `got ${r!.wave_height_ft}`);
    assert.equal(r!.dominant_period_sec, 12);
    assert.equal(r!.mean_wave_direction_deg, 285);
    assert.ok(Math.abs(r!.water_temp_f! - 58.1) < 0.5, `got ${r!.water_temp_f}`);
  });

  it('returns null on empty body', () => {
    assert.equal(parseNdbcText('46053', '#header only\n#second header'), null);
  });

  it('handles MM (missing) values', () => {
    const text = `#YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
2026 05 03 17 30 280  6.0  7.5  MM  MM  MM 285 1015.0 18.0 MM 10.0 MM MM MM`;
    const r = parseNdbcText('46053', text);
    assert.ok(r);
    assert.equal(r!.wave_height_ft, null);
    assert.equal(r!.dominant_period_sec, null);
    assert.equal(r!.water_temp_f, null);
    assert.equal(r!.wind_direction_deg, 280);
  });
});
