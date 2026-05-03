"use client";

import type { AgentName } from "@/lib/types";
import { AGENT_COLOR, AGENT_LABEL, agentIcon } from "../agent-icons";
import type { AgentDerivedState } from "./hook";
import ToolChip from "./tool-chip";

const AGENT_PLACEHOLDER: Partial<Record<AgentName, string>> = {
  orchestrator: "setup complete · awaiting outcome",
  vision: "awaiting photo input",
  recon: "awaiting spot data handoff",
  planner: "awaiting recon scores",
  narrator: "awaiting handoff from planner",
};

export default function AgentCard({
  agent,
  state,
  isOrchestrator,
}: {
  agent: AgentName;
  state: AgentDerivedState;
  isOrchestrator?: boolean;
}) {
  const Icon = agentIcon(agent);
  const color = AGENT_COLOR[agent];
  const panelState = state.panelState;
  const isConsulted = !!state.consultedBy;

  // Show the most recent observation (if any).
  const lastObs = state.observations[state.observations.length - 1];

  // Show the most recent unresolved or recently resolved tool.
  const activeTool =
    state.activeTools.findLast((t) => !t.resolved) ??
    (panelState === "action" ? state.activeTools[state.activeTools.length - 1] : undefined);

  const containerStyle: React.CSSProperties = {
    color:
      panelState === "thinking" || panelState === "action" || panelState === "done"
        ? color
        : undefined,
    borderColor:
      panelState === "thinking" || panelState === "action"
        ? color
        : undefined,
    boxShadow:
      panelState === "action"
        ? `0 6px 18px ${color}24`
        : panelState === "thinking"
          ? "0 6px 18px rgba(0,0,0,0.05)"
          : undefined,
    opacity: panelState === "idle" ? 0.55 : 1,
    background:
      panelState === "thinking" || panelState === "action" || panelState === "done"
        ? "rgba(255,255,255,0.92)"
        : "rgba(255,255,255,0.7)",
  };

  const characterAnimation =
    panelState === "idle" || panelState === "queued"
      ? "idle-float 4s ease-in-out infinite"
      : panelState === "thinking"
        ? "breathe 2.6s ease-in-out infinite"
        : panelState === "action"
          ? "breathe 1.4s ease-in-out infinite"
          : undefined;

  const characterSize = isOrchestrator ? 60 : 64;

  return (
    <div
      style={{
        position: "relative",
        border: "1px solid rgba(231,229,228,0.7)",
        borderRadius: 14,
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "all 360ms cubic-bezier(0.32,0.72,0.3,1)",
        minWidth: 0,
        overflow: "visible",
        ...containerStyle,
      }}
    >
      {/* Consultation dashed frame */}
      {isConsulted && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 14,
            border: "1.4px dashed var(--agent-planner)",
            opacity: 0.45,
            pointerEvents: "none",
          }}
        />
      )}
      {/* Consultation ribbon */}
      {isConsulted && state.consultedBy && (
        <div
          style={{
            position: "absolute",
            top: -9,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--agent-planner)",
            color: "#fff",
            fontSize: 8,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 999,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 6px rgba(79,70,229,0.25)",
            zIndex: 12,
          }}
        >
          CONSULTED &middot; {state.consultedBy.correlation_id}
        </div>
      )}

      {/* Head: name + state pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            color:
              panelState === "thinking" || panelState === "action" || panelState === "done"
                ? "currentColor"
                : "#78716c",
          }}
        >
          {AGENT_LABEL[agent]}
        </span>
        <span
          style={{
            fontWeight: 700,
            padding: "1px 6px",
            borderRadius: 999,
            border: "1px solid currentColor",
            fontSize: 8,
            letterSpacing: "0.1em",
            background: "rgba(255,255,255,0.6)",
            color: panelState === "idle" || panelState === "queued" ? "#a8a29e" : "currentColor",
          }}
        >
          {panelState}
        </span>
      </div>

      {/* Character */}
      <div
        style={{
          position: "relative",
          alignSelf: "center",
          width: characterSize,
          height: characterSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: characterAnimation,
        }}
      >
        {/* Halo ring */}
        <div
          style={{
            position: "absolute",
            inset: panelState === "action" ? -6 : -3,
            borderRadius: "50%",
            border: "1px solid currentColor",
            opacity:
              panelState === "thinking"
                ? 0.2
                : panelState === "action"
                  ? 0.32
                  : 0,
            pointerEvents: "none",
            transition: "all 360ms cubic-bezier(0.32,0.72,0.3,1)",
            animation:
              panelState === "thinking"
                ? "halo-pulse 2.6s cubic-bezier(0.32,0.72,0.3,1) infinite"
                : panelState === "action"
                  ? "halo-pulse-action 1.6s cubic-bezier(0.32,0.72,0.3,1) infinite"
                  : undefined,
          }}
        />
        <Icon size={characterSize} />
      </div>

      {/* Activity area */}
      <div
        style={{
          flex: 1,
          minHeight: 88,
          borderTop: "1px dashed rgba(231,229,228,0.8)",
          paddingTop: 10,
          fontSize: 11,
          lineHeight: 1.4,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {(panelState === "idle" || panelState === "queued") && (
          <div
            style={{
              color: "#a8a29e",
              fontStyle: "italic",
              fontSize: 11,
              textAlign: "center",
              paddingTop: 12,
            }}
          >
            <span style={{ display: "block", fontSize: 24, lineHeight: 1, color: "#d6d3d1", marginBottom: 4 }}>
              &middot;
            </span>
            {AGENT_PLACEHOLDER[agent] ?? "awaiting handoff"}
          </div>
        )}

        {(panelState === "thinking" || panelState === "action") && state.thinkingText && (
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              fontSize: 12,
              lineHeight: 1.45,
              color: "#44403c",
            }}
          >
            {state.thinkingText}
            <span
              style={{
                display: "inline-block",
                width: 5,
                height: 12,
                verticalAlign: -2,
                background: "currentColor",
                animation: "cursor-blink 1s steps(2) infinite",
                opacity: 0.6,
                marginLeft: 2,
              }}
            />
          </div>
        )}

        {panelState === "action" && activeTool && (
          <ToolChip tool={activeTool} />
        )}

        {(panelState === "action" || panelState === "thinking") && lastObs && (
          <ObsChip obs={lastObs} color={color} />
        )}

        {panelState === "done" && (
          <div
            style={{
              fontSize: 11,
              color: "#44403c",
              lineHeight: 1.4,
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
            }}
          >
            <span style={{ color: "var(--agent-narrator)", fontWeight: 700 }}>✓</span>
            <span>{state.summary}</span>
          </div>
        )}

        {panelState === "done" && lastObs && (
          <ObsChip obs={lastObs} color={color} />
        )}
      </div>
    </div>
  );
}

function ObsChip({
  obs,
  color,
}: {
  obs: { summary: string; score?: number };
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(255,255,255,0.6)",
        border: "1px solid rgba(231,229,228,0.6)",
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 10,
        color: "#44403c",
      }}
    >
      <span
        style={{
          fontSize: 8,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#a8a29e",
          fontWeight: 700,
        }}
      >
        Obs
      </span>
      <span style={{ fontWeight: 600, color: "#1c1917", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {obs.summary}
      </span>
      {typeof obs.score === "number" && (
        <span
          style={{
            marginLeft: "auto",
            fontWeight: 700,
            padding: "1px 6px",
            background: "#f5f5f0",
            borderRadius: 4,
            fontSize: 10,
          }}
        >
          {obs.score}
        </span>
      )}
    </div>
  );
}
