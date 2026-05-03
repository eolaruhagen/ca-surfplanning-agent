import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConsultationBudget } from '../lib/consultation-budget';

describe('ConsultationBudget', () => {
  it('allows N consume()s under the limit', () => {
    const budget = new ConsultationBudget(3);
    assert.equal(budget.consume().ok, true);
    assert.equal(budget.consume().ok, true);
    assert.equal(budget.consume().ok, true);
  });

  it('rejects the N+1th call', () => {
    const budget = new ConsultationBudget(3);
    budget.consume();
    budget.consume();
    budget.consume();
    const res = budget.consume();
    assert.equal(res.ok, false);
    if (!res.ok) assert.match(res.reason, /budget exhausted/);
  });

  it('rejected calls do not count', () => {
    const budget = new ConsultationBudget(2);
    budget.consume();
    budget.consume();
    budget.consume(); // rejected
    budget.consume(); // rejected
    assert.equal(budget.count(), 2);
  });

  it('count() and remaining() report state correctly', () => {
    const budget = new ConsultationBudget(3);
    assert.equal(budget.count(), 0);
    assert.equal(budget.remaining(), 3);
    budget.consume();
    assert.equal(budget.count(), 1);
    assert.equal(budget.remaining(), 2);
    budget.consume();
    budget.consume();
    assert.equal(budget.remaining(), 0);
    budget.consume(); // rejected
    assert.equal(budget.remaining(), 0);
  });

  it('default limit is 3', () => {
    const budget = new ConsultationBudget();
    for (let i = 0; i < 3; i++) assert.equal(budget.consume().ok, true);
    assert.equal(budget.consume().ok, false);
  });
});
