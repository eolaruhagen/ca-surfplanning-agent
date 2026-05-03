import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runConsultation } from '../lib/agents/consultation';
import { StreamEventSchema } from '../lib/schemas';
import type { StreamEvent } from '../lib/types';

describe('runConsultation event sequence', () => {
  it('emits question → start → (consultee events) → end → answer with matching correlation_id', async () => {
    const events: StreamEvent[] = [];
    const send = (e: StreamEvent) => {
      const r = StreamEventSchema.safeParse(e);
      assert.equal(r.success, true, r.success ? '' : JSON.stringify(r.error.issues));
      events.push(e);
    };

    // Mock runner mimics the consultee mini-agent emitting a thinking event,
    // then returning final text. No AI SDK touched.
    const runnerCalls: Array<{ agent: string; maxSteps: number; system: string }> = [];
    const mockRunner = async (opts: {
      agent: 'recon' | 'narrator' | 'planner' | 'vision' | 'orchestrator';
      maxSteps: number;
      system: string;
      sendEvent: (e: StreamEvent) => void;
    }) => {
      runnerCalls.push({ agent: opts.agent, maxSteps: opts.maxSteps, system: opts.system });
      opts.sendEvent({
        type: 'agent_thinking',
        agent: opts.agent,
        text: 'thinking inside the consultation',
      });
      return { text: 'Skip Mavericks; try Steamer Lane instead.' };
    };

    const { answer } = await runConsultation({
      initiator: 'planner',
      consultee: 'recon',
      topic: 'skill safety check',
      question: 'Is Mavericks safe at intermediate?',
      sendEvent: send,
      // Use deterministic id for assertion
      newCorrelationId: () => 'c-test-1',
      runner: mockRunner,
    });

    // Answer returned
    assert.match(answer, /Skip Mavericks/);

    // Exact event order: question → start → thinking → end → answer
    const types = events.map((e) => e.type);
    assert.deepEqual(types, [
      'agent_message',
      'consultation_start',
      'agent_thinking',
      'consultation_end',
      'agent_message',
    ]);

    // First message: question with correlation_id
    const q = events[0] as Extract<StreamEvent, { type: 'agent_message' }>;
    assert.equal(q.kind, 'question');
    assert.equal(q.correlation_id, 'c-test-1');
    assert.equal(q.from, 'planner');
    assert.equal(q.to, 'recon');

    // Start
    const start = events[1] as Extract<StreamEvent, { type: 'consultation_start' }>;
    assert.equal(start.initiator, 'planner');
    assert.equal(start.consultee, 'recon');
    assert.equal(start.correlation_id, 'c-test-1');
    assert.equal(start.topic, 'skill safety check');

    // End
    const end = events[3] as Extract<StreamEvent, { type: 'consultation_end' }>;
    assert.equal(end.correlation_id, 'c-test-1');
    assert.match(end.summary, /Skip Mavericks/);

    // Last message: answer with matching correlation_id
    const a = events[4] as Extract<StreamEvent, { type: 'agent_message' }>;
    assert.equal(a.kind, 'answer');
    assert.equal(a.correlation_id, 'c-test-1');
    assert.equal(a.from, 'recon');
    assert.equal(a.to, 'planner');
    assert.match(a.content, /Skip Mavericks/);

    // Consultee runs with maxSteps=5 and a focused system prompt
    assert.equal(runnerCalls.length, 1);
    assert.equal(runnerCalls[0].maxSteps, 5);
    assert.equal(runnerCalls[0].agent, 'recon');
    assert.match(runnerCalls[0].system, /focused consultation/);
    assert.match(runnerCalls[0].system, /Do not record sessions/);
  });

  it('captures runner errors as an error-shaped answer (no throw)', async () => {
    const events: StreamEvent[] = [];
    const send = (e: StreamEvent) => events.push(e);
    const errorRunner = async () => {
      throw new Error('LLM exploded');
    };
    const { answer } = await runConsultation({
      initiator: 'planner',
      consultee: 'recon',
      topic: 'oops',
      question: 'will this throw',
      sendEvent: send,
      newCorrelationId: () => 'c-err',
      runner: errorRunner,
    });
    assert.match(answer, /error: LLM exploded/);
    // Still emits end + answer so the UI doesn't see a hanging consultation
    const types = events.map((e) => e.type);
    assert.ok(types.includes('consultation_end'));
    assert.equal(types.filter((t) => t === 'agent_message').length, 2);
  });
});
