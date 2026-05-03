import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter } from '../lib/rate-limiter';

describe('RateLimiter', () => {
  it('allows calls under the bucket cap', () => {
    const rl = new RateLimiter({ 'mcp:google-maps': 3, total: 10 });
    assert.equal(rl.consume('mcp:google-maps').ok, true);
    assert.equal(rl.consume('mcp:google-maps').ok, true);
    assert.equal(rl.consume('mcp:google-maps').ok, true);
    const blocked = rl.consume('mcp:google-maps');
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.match(blocked.reason, /mcp:google-maps/);
  });

  it('rejected calls do not count toward the bucket', () => {
    const rl = new RateLimiter({ 'mcp:google-maps': 1 });
    rl.consume('mcp:google-maps');
    rl.consume('mcp:google-maps'); // rejected
    rl.consume('mcp:google-maps'); // rejected
    assert.equal(rl.count('mcp:google-maps'), 1);
  });

  it('total cap blocks across buckets', () => {
    const rl = new RateLimiter({ total: 2, 'mcp:open-meteo': 100 });
    assert.equal(rl.consume('mcp:open-meteo').ok, true);
    assert.equal(rl.consume('mcp:open-meteo').ok, true);
    const blocked = rl.consume('mcp:open-meteo');
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.match(blocked.reason, /total tool-call cap/);
  });

  it('total counter increments on every successful call', () => {
    const rl = new RateLimiter({ total: 100 });
    rl.consume('mcp:google-maps');
    rl.consume('mcp:open-meteo');
    rl.consume('mcp:filesystem');
    assert.equal(rl.count('total'), 3);
  });

  it('an unconfigured bucket has no per-bucket limit but still hits total', () => {
    const rl = new RateLimiter({ total: 2 });
    rl.consume('mcp:filesystem');
    rl.consume('mcp:filesystem');
    assert.equal(rl.consume('mcp:filesystem').ok, false);
  });
});
