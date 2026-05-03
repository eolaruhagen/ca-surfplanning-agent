/**
 * Pure helpers driving the trip-view's auto-advance loop. Extracted from
 * the hook + component so they can be unit-tested without React + timers.
 *
 * Auto-advance cadence: ~4500ms per session. The interval lives in
 * `useTripView` (hook.tsx) so play/pause state is colocated with the
 * rest of the walkthrough state; this file just owns the math.
 */

/** ms between auto-advance ticks while `isPlaying` is true. */
export const AUTO_ADVANCE_INTERVAL_MS = 4500;

/**
 * Result of one auto-advance tick.
 *
 * - `nextIndex`: the index after this tick (==== current at end-of-trip).
 * - `shouldPause`: caller should flip `isPlaying` to false. Triggered when
 *   the tick fires on the last session — the walkthrough stops gracefully
 *   rather than wrapping or repeatedly re-firing.
 */
export type AdvanceResult = {
  nextIndex: number;
  shouldPause: boolean;
};

/**
 * Compute the next index for an auto-advance tick.
 *
 * `total === 0` is a defensive no-op (empty trips shouldn't reach here but
 * we don't want to divide-by-zero or hand back NaN).
 */
export function advanceTick(
  currentIndex: number,
  total: number,
): AdvanceResult {
  if (total <= 0) return { nextIndex: 0, shouldPause: true };
  if (currentIndex < total - 1) {
    return { nextIndex: currentIndex + 1, shouldPause: false };
  }
  // At final session — stop the timer instead of looping.
  return { nextIndex: currentIndex, shouldPause: true };
}

/**
 * Should the trip-view perform its one-time initial fly to the first
 * session? True only the first time the map reports ready AND a first
 * session with coords exists. The caller is expected to set the guard
 * ref to true after acting on a `true` return.
 */
export function shouldDoInitialFly(args: {
  mapReady: boolean;
  hasFlown: boolean;
  firstSessionCoords: [number, number] | undefined;
}): boolean {
  return Boolean(
    args.mapReady && !args.hasFlown && args.firstSessionCoords,
  );
}
