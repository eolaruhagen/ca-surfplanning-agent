"use client";

import type { AgentName } from "@/lib/types";
import AgentCard from "./agent-card";
import InterAgentArcOverlay from "./inter-agent-arc";
import type { LiveFeedState } from "./hook";

const SPECIALIST_ORDER: AgentName[] = ["vision", "recon", "planner", "narrator"];

/**
 * Panel-of-entities stage layout.
 * Orchestrator sits at top-center (smaller card); four specialists fill a
 * 4-column grid below, with SVG arcs overlaid for fresh inter-agent messages.
 */
export default function LiveFeed({ state }: { state: LiveFeedState }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "18px 22px 20px",
        gap: 14,
        overflow: "hidden",
        background: "#fafaf7",
      }}
    >
      <StageHeader state={state} />

      {/* Orchestrator — solo, centered, narrower */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: 220 }}>
          <AgentCard
            agent="orchestrator"
            state={state.agents.orchestrator}
            isOrchestrator
          />
        </div>
      </div>

      {/* Specialists — 4-column grid with arc overlay */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          position: "relative",
          minHeight: 0,
        }}
      >
        {/* Inter-agent arc overlay — fresh messages only */}
        <InterAgentArcOverlay messages={state.recentMessages} />

        {SPECIALIST_ORDER.map((agent) => (
          <AgentCard
            key={agent}
            agent={agent}
            state={state.agents[agent]}
          />
        ))}
      </div>
    </div>
  );
}

function StageHeader({ state }: { state: LiveFeedState }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontSize: 16,
          color: "#1c1917",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>The cast — currently planning your trip</span>
        {state.currentPhase && (
          <PhaseChip phase={state.currentPhase} isDone={state.isDone} />
        )}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#78716c",
          marginTop: 2,
        }}
      >
        Each box is a mini-dashboard for one entity. Lines appear during live Q&amp;A.
      </div>
    </div>
  );
}

function PhaseChip({
  phase,
  isDone,
}: {
  phase: NonNullable<LiveFeedState["currentPhase"]>;
  isDone: boolean;
}) {
  const color = phaseColor(phase);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(231,229,228,0.7)",
        borderRadius: 999,
        padding: "6px 14px",
        fontSize: 12,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          animation: isDone ? undefined : "spot-pulse 1.4s cubic-bezier(0.32,0.72,0.3,1) infinite",
        }}
      />
      <span style={{ fontWeight: 500, textTransform: "capitalize" }}>{phase}</span>
    </div>
  );
}

function phaseColor(phase: NonNullable<LiveFeedState["currentPhase"]>): string {
  switch (phase) {
    case "vision":
      return "var(--agent-vision)";
    case "recon":
      return "var(--agent-recon)";
    case "planning":
      return "var(--agent-planner)";
    case "narration":
      return "var(--agent-narrator)";
    case "done":
      return "var(--agent-narrator)";
  }
}
