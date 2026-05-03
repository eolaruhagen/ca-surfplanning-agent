import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamEventSchema, ConsultationKindSchema } from '../lib/schemas';

describe('ConsultationKindSchema', () => {
  it('accepts the four kinds', () => {
    for (const k of ['handoff', 'question', 'answer', 'note']) {
      assert.equal(ConsultationKindSchema.safeParse(k).success, true);
    }
  });

  it('rejects unknown kinds', () => {
    assert.equal(ConsultationKindSchema.safeParse('shrug').success, false);
  });
});

describe('StreamEventSchema (consultation additions)', () => {
  it('parses agent_message without kind/correlation_id (back-compat)', () => {
    const r = StreamEventSchema.safeParse({
      type: 'agent_message',
      from: 'recon',
      to: 'planner',
      content: 'handoff text',
    });
    assert.equal(r.success, true);
  });

  it('parses agent_message with kind and correlation_id', () => {
    const r = StreamEventSchema.safeParse({
      type: 'agent_message',
      from: 'planner',
      to: 'recon',
      content: 'is mavericks safe?',
      kind: 'question',
      correlation_id: 'c1',
    });
    assert.equal(r.success, true);
  });

  it('rejects agent_message with unknown kind', () => {
    const r = StreamEventSchema.safeParse({
      type: 'agent_message',
      from: 'planner',
      to: 'recon',
      content: 'x',
      kind: 'shouting',
    });
    assert.equal(r.success, false);
  });

  it('parses consultation_start', () => {
    const r = StreamEventSchema.safeParse({
      type: 'consultation_start',
      initiator: 'planner',
      consultee: 'recon',
      correlation_id: 'c1',
      topic: 'skill safety check',
    });
    assert.equal(r.success, true);
  });

  it('parses consultation_end', () => {
    const r = StreamEventSchema.safeParse({
      type: 'consultation_end',
      initiator: 'planner',
      consultee: 'recon',
      correlation_id: 'c1',
      summary: 'advised against; alternate suggested',
    });
    assert.equal(r.success, true);
  });

  it('rejects consultation_start with unknown agent', () => {
    const r = StreamEventSchema.safeParse({
      type: 'consultation_start',
      initiator: 'goblin',
      consultee: 'recon',
      correlation_id: 'c1',
      topic: 'x',
    });
    assert.equal(r.success, false);
  });

  it('rejects consultation_end missing required fields', () => {
    const r = StreamEventSchema.safeParse({
      type: 'consultation_end',
      initiator: 'planner',
      consultee: 'recon',
      // missing correlation_id and summary
    });
    assert.equal(r.success, false);
  });
});
