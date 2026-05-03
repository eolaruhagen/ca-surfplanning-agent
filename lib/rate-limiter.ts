export type RateBucket = 'mcp:google-maps' | 'mcp:open-meteo' | 'mcp:filesystem' | 'total';

export type RateLimits = Partial<Record<RateBucket, number>>;

export const DEFAULT_LIMITS: RateLimits = {
  'mcp:google-maps': 25,
  'mcp:open-meteo': 80,
  'mcp:filesystem': 20,
  total: 200,
};

export type RateCheck = { ok: true } | { ok: false; reason: string };

export class RateLimiter {
  private counters = new Map<RateBucket, number>();
  constructor(private readonly limits: RateLimits = DEFAULT_LIMITS) {}

  count(bucket: RateBucket): number {
    return this.counters.get(bucket) ?? 0;
  }

  check(bucket: RateBucket): RateCheck {
    const totalLimit = this.limits.total;
    if (totalLimit != null) {
      const total = this.count('total');
      if (total >= totalLimit) {
        return {
          ok: false,
          reason: `total tool-call cap reached (${total}/${totalLimit}) — stop calling tools and finalize`,
        };
      }
    }
    const limit = this.limits[bucket];
    if (limit == null) return { ok: true };
    const current = this.count(bucket);
    if (current >= limit) {
      return {
        ok: false,
        reason: `${bucket} call cap reached (${current}/${limit}) — switch to alternative or finalize`,
      };
    }
    return { ok: true };
  }

  /**
   * Atomically check + increment. Use in tool execute() so rejected calls
   * don't count toward the bucket.
   */
  consume(bucket: RateBucket): RateCheck {
    const result = this.check(bucket);
    if (result.ok) {
      this.counters.set(bucket, this.count(bucket) + 1);
      if (bucket !== 'total') {
        this.counters.set('total', this.count('total') + 1);
      }
    }
    return result;
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.counters.entries());
  }
}
