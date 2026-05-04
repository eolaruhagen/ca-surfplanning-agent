import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recordTools, newRecordedPlan, plannedDays } from '../lib/tools/record';
import { StreamEventSchema } from '../lib/schemas';
import type { StreamEvent } from '../lib/types';

function harness() {
  const events: StreamEvent[] = [];
  const plan = newRecordedPlan();
  const send = (e: StreamEvent) => {
    StreamEventSchema.parse(e);
    events.push(e);
  };
  const tools = recordTools('planner', send, plan);
  return { events, plan, tools };
}

describe('record_session', () => {
  it('builds a TripDay incrementally and emits valid events', async () => {
    const { events, plan, tools } = harness();
    const exec = (tools.record_session as any).execute;
    await exec(
      {
        day_number: 1,
        date: '2026-05-09',
        time_window: '6:30 AM – 9:00 AM',
        spot_id: 'rincon',
        spot_name: 'Rincon',
        spot_coords: [-119.48, 34.37],
        board_id: 'board-1',
        pick_reason: 'Peak swell — 5ft @ 14s, light offshore',
        reasoning: 'peak swell window matching shortboard ideal range',
        fit_score: 87,
      },
      { toolCallId: 't1', messages: [] },
    );
    const days = plannedDays(plan);
    assert.equal(days.length, 1);
    assert.equal(days[0].sessions.length, 1);
    assert.equal(days[0].sessions[0].fit_score, 87);
    assert.equal(days[0].sessions[0].pick_reason, 'Peak swell — 5ft @ 14s, light offshore');
    assert.deepEqual(days[0].sessions[0].spot_coords, [-119.48, 34.37]);
    const callEvent = events.find((e) => e.type === 'tool_call');
    const resultEvent = events.find((e) => e.type === 'tool_result');
    assert.ok(callEvent && resultEvent);
    if (callEvent.type === 'tool_call') assert.equal(callEvent.agent, 'planner');

    // Map needs a data_observed with the spot_id so the pin lights up
    // immediately on commit, not only after record_overnight.
    const observed = events.find(
      (e) => e.type === 'data_observed' && e.kind === 'spot' && e.spot_id === 'rincon',
    );
    assert.ok(observed, 'expected data_observed event for committed spot');
    if (observed?.type === 'data_observed') {
      assert.equal(observed.score, 87);
    }
  });
});

describe('record_overnight', () => {
  it('attaches overnight to the right day and emits day_complete after a session', async () => {
    const { events, plan, tools } = harness();
    const recSession = (tools.record_session as any).execute;
    const recOver = (tools.record_overnight as any).execute;
    await recSession(
      {
        day_number: 2,
        date: '2026-05-10',
        time_window: 'AM',
        spot_id: 'steamer-lane',
        spot_name: 'Steamer Lane',
        board_id: 'b',
        pick_reason: 'Clean morning at the Lane',
        reasoning: 'r',
        fit_score: 70,
      },
      { toolCallId: 't', messages: [] },
    );
    await recOver(
      {
        day_number: 2,
        date: '2026-05-10',
        town: 'Santa Cruz',
        coords: [-122.03, 36.97],
        reasoning: 'central',
      },
      { toolCallId: 't', messages: [] },
    );
    const day = plannedDays(plan).find((d) => d.day_number === 2);
    assert.ok(day?.overnight);
    assert.equal(day!.overnight!.town, 'Santa Cruz');
    assert.ok(events.some((e) => e.type === 'day_complete' && e.day.day_number === 2));
  });
});

describe('record_drive', () => {
  it('attaches drive_to_next', async () => {
    const { plan, tools } = harness();
    const exec = (tools.record_drive as any).execute;
    await exec(
      { day_number: 1, date: '2026-05-09', duration_minutes: 95, distance_miles: 75 },
      { toolCallId: 't', messages: [] },
    );
    const day = plannedDays(plan).find((d) => d.day_number === 1);
    assert.ok(day?.drive_to_next);
    assert.equal(day!.drive_to_next!.distance_miles, 75);
  });
});
