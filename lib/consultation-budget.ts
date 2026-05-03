/**
 * Per-run cap on how many `consult_agent` calls one agent can make. Mirrors
 * the shape of `lib/rate-limiter.ts`: `consume()` is the atomic check + bump,
 * rejected calls don't count, and the reason string is meant to surface to
 * the caller as a tool-result so the LLM can adapt mid-loop.
 */

export type ConsultationCheck =
  | { ok: true }
  | { ok: false; reason: string };

export class ConsultationBudget {
  private consumed = 0;

  constructor(private readonly limit: number = 3) {}

  /** Atomic check + increment. Rejected calls don't increment. */
  consume(): ConsultationCheck {
    if (this.consumed >= this.limit) {
      return {
        ok: false,
        reason: `consultation budget exhausted (${this.consumed}/${this.limit}) — rely on what you already know and finalize`,
      };
    }
    this.consumed += 1;
    return { ok: true };
  }

  count(): number {
    return this.consumed;
  }

  remaining(): number {
    return Math.max(0, this.limit - this.consumed);
  }
}
