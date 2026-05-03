"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentMessage } from "./hook";

const ARC_LIFETIME_MS = 3200;

/**
 * Column indices for the four specialist agents in their panel order.
 * Used to compute arc x-positions within the specialists grid.
 */
const SPECIALIST_COLS: Record<string, number> = {
  vision: 0,
  recon: 1,
  planner: 2,
  narrator: 3,
};

/** Fraction of the specialists container width for each column center. */
function colCenterFraction(col: number, total = 4): number {
  return (col + 0.5) / total;
}

type ArcProps = {
  message: AgentMessage;
  now: number;
};

function SingleArc({ message, now }: ArcProps) {
  const age = now - message.timestamp;
  if (age >= ARC_LIFETIME_MS) return null;

  // Only render arcs for specialist-to-specialist messages (not orchestrator).
  const fromCol = SPECIALIST_COLS[message.from];
  const toCol = SPECIALIST_COLS[message.to];
  if (fromCol === undefined || toCol === undefined) return null;
  if (fromCol === toCol) return null;

  const kind = message.kind;

  // Arc color and style by kind.
  const arcColor =
    kind === "question"
      ? "var(--agent-planner)"
      : kind === "answer"
        ? "var(--agent-recon)"
        : "var(--stone-300, #d6d3d1)";

  const arcWidth =
    kind === "question" || kind === "answer" ? 1.2 : 1;

  const arcDash =
    kind === "question" || kind === "answer" ? "4 3" : "3 3";

  // Compute arc label.
  const arcLabel =
    kind === "question"
      ? `QUESTION · ${message.correlation_id ?? ""}`
      : kind === "answer"
        ? `ANSWER · ${message.correlation_id ?? ""}`
        : null;

  // Lifecycle opacity: 0→20%: fade in, 20→70%: hold, 70→100%: fade out.
  const t = age / ARC_LIFETIME_MS;
  let opacity: number;
  if (t < 0.2) {
    opacity = t / 0.2;
  } else if (t < 0.7) {
    opacity = 1;
  } else {
    opacity = (1 - t) / 0.3;
  }

  // Peak opacity caps by kind.
  const peakOpacity = kind === "note" ? 0.35 : kind === "handoff" ? 0.45 : 0.6;
  opacity *= peakOpacity;

  // SVG viewBox is 1000×360 matching the specialists grid proportions.
  // Arc endpoints sit at y=80 (near card tops), control point above at y=-10.
  const x1 = colCenterFraction(fromCol) * 1000;
  const x2 = colCenterFraction(toCol) * 1000;
  // Arc direction: question curves above going left-to-right, answer curves slightly below.
  const cy = kind === "answer" ? 20 : -10;
  const d = `M ${x1} 80 Q ${(x1 + x2) / 2} ${cy} ${x2} 80`;

  const labelX = (x1 + x2) / 2;
  const labelY = kind === "answer" ? "12%" : "4%";

  return (
    <>
      <path
        d={d}
        stroke={arcColor}
        strokeWidth={arcWidth}
        strokeDasharray={arcDash}
        strokeLinecap="round"
        fill="none"
        style={{ opacity }}
      />
      {arcLabel && (
        <foreignObject
          x={labelX - 60}
          y={kind === "answer" ? 32 : 2}
          width={120}
          height={20}
          style={{ overflow: "visible" }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              border: `1px solid ${arcColor}`,
              padding: "2px 7px",
              borderRadius: 999,
              fontSize: 8,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              color: arcColor,
              opacity,
              whiteSpace: "nowrap" as const,
              textAlign: "center" as const,
            }}
          >
            {arcLabel}
          </div>
        </foreignObject>
      )}
    </>
  );
}

/**
 * Renders SVG arcs between agent cards when inter-agent messages are fresh.
 * Positioned absolutely over the specialists grid.
 */
export default function InterAgentArcOverlay({
  messages,
}: {
  messages: AgentMessage[];
}) {
  const [now, setNow] = useState(() => Date.now());
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(Date.now());

  const freshMessages = messages.filter(
    (m) => Date.now() - m.timestamp < ARC_LIFETIME_MS,
  );

  useEffect(() => {
    if (freshMessages.length === 0) return;

    const tick = () => {
      const n = Date.now();
      lastTickRef.current = n;
      setNow(n);
      const stillFresh = messages.some((m) => n - m.timestamp < ARC_LIFETIME_MS);
      if (stillFresh) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshMessages.length]);

  if (freshMessages.length === 0) return null;

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 8,
        overflow: "visible",
        width: "100%",
        height: "100%",
      }}
      viewBox="0 0 1000 360"
      preserveAspectRatio="none"
    >
      {messages.map((msg) => (
        <SingleArc key={msg.id} message={msg} now={now} />
      ))}
    </svg>
  );
}
