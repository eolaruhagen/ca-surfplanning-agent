/**
 * Inter-agent handoff text summarization. Some agent reports (recon's spot
 * dossier, planner's per-day rationale) can blow past a downstream agent's
 * prompt budget. This keeps a head + tail slice of the original — first 60%
 * and last 35% — joined by an explicit truncation marker, so the next agent
 * sees the report's framing and conclusions without the full middle.
 */

const TRUNCATION_MARKER = '\n\n…[truncated middle]…\n\n';

export function summarizeForHandoff(text: string, maxChars: number = 4000): string {
  if (text.length <= maxChars) return text;

  const markerLen = TRUNCATION_MARKER.length;
  // Reserve room for the marker; if cap is unreasonably small, fall back to
  // simple head truncation rather than producing a meaningless artifact.
  if (maxChars <= markerLen + 4) {
    return text.slice(0, maxChars);
  }

  const budget = maxChars - markerLen;
  const headLen = Math.floor(budget * 0.6);
  const tailLen = budget - headLen;
  const head = text.slice(0, headLen);
  const tail = text.slice(text.length - tailLen);
  const out = head + TRUNCATION_MARKER + tail;

  // Defensive cap: should equal maxChars exactly given the math above, but
  // if a caller passes a weird unicode-heavy string we still respect the cap.
  return out.length <= maxChars ? out : out.slice(0, maxChars);
}
