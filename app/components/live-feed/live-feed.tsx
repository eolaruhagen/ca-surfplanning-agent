"use client";

import type { AgentName, Phase } from "@/lib/types";
import { AGENT_COLOR, AGENT_LABEL, agentIcon } from "../agent-icons";
import type { LiveFeedState, AgentDerivedState, ToolCallState } from "./hook";
import ToolChip from "./tool-chip";

const SPECIALIST_ORDER: AgentName[] = ["vision", "recon", "planner", "narrator"];
const PHASE_OWNER: Record<Phase, AgentName> = {
  vision: "vision",
  recon: "recon",
  planning: "planner",
  narration: "narrator",
  done: "narrator",
};

/**
 * Panel-of-entities stage layout.
 * Orchestrator sits at top-center (smaller card); four specialists fill a
 * 4-column grid below, with SVG arcs overlaid for fresh inter-agent messages.
 */
export default function LiveFeed({ state }: { state: LiveFeedState }) {
  const activeAgent = resolveActiveAgent(state);
  const active = state.agents[activeAgent];

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

      <ActiveAgentPanel
        agent={activeAgent}
        state={active}
        recentMessages={state.recentMessages}
      />
    </div>
  );
}

function resolveActiveAgent(state: LiveFeedState): AgentName {
  const phase = state.currentPhase;
  if (phase) return PHASE_OWNER[phase];

  const byPriority = SPECIALIST_ORDER.find((agent) => {
    const panel = state.agents[agent].panelState;
    return panel === "action" || panel === "thinking";
  });
  if (byPriority) return byPriority;

  const anyActive = SPECIALIST_ORDER.find((agent) => state.agents[agent].state !== "idle");
  return anyActive ?? "vision";
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
        The active agent updates live; icons highlight ongoing handoffs and Q&amp;A.
      </div>
    </div>
  );
}

function ActiveAgentPanel({
  agent,
  state,
  recentMessages,
}: {
  agent: AgentName;
  state: AgentDerivedState;
  recentMessages: LiveFeedState["recentMessages"];
}) {
  const Icon = agentIcon(agent);
  const color = AGENT_COLOR[agent];
  const isConsulted = !!state.consultedBy;
  const relevantMessages = recentMessages.filter(
    (m) => m.from === agent || m.to === agent,
  );
  const latestMessages = relevantMessages.slice(-3);

  const recentAgents = new Set<AgentName>();
  for (const msg of recentMessages) {
    recentAgents.add(msg.from);
    recentAgents.add(msg.to);
  }

  const toolItems = state.activeTools.slice(-5);
  const observationItems = state.observations.filter((o) => o.agent === agent).slice(-4);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 14,
          border: "1px solid rgba(231,229,228,0.8)",
          background: "rgba(255,255,255,0.8)",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {SPECIALIST_ORDER.map((a) => {
            const IconItem = agentIcon(a);
            const isActive = a === agent;
            const isRecent = recentAgents.has(a);
            return (
              <div
                key={a}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: isActive ? `2px solid ${AGENT_COLOR[a]}` : "1px solid rgba(231,229,228,0.7)",
                  background: isActive || isRecent ? "#fff" : "rgba(255,255,255,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: isActive ? "scale(1.06)" : undefined,
                  boxShadow: isActive ? `0 6px 16px ${AGENT_COLOR[a]}22` : undefined,
                  transition: "all 200ms ease",
                }}
                title={AGENT_LABEL[a]}
              >
                <IconItem size={22} />
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: `1px solid ${color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: "#1c1917" }}>{AGENT_LABEL[agent]}</div>
              <div style={{ fontSize: 10, color: "#78716c" }}>{state.currentTask ?? "Working…"}</div>
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: state.panelState === "idle" ? "#a8a29e" : color,
            border: `1px solid ${state.panelState === "idle" ? "#e7e5e4" : color}`,
            borderRadius: 999,
            padding: "2px 8px",
          }}
        >
          {state.panelState}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          borderRadius: 16,
          border: `1px solid ${isConsulted ? "var(--agent-planner)" : "rgba(231,229,228,0.8)"}`,
          background: "rgba(255,255,255,0.92)",
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          position: "relative",
        }}
      >
        {isConsulted && state.consultedBy && (
          <div
            style={{
              position: "absolute",
              top: -10,
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--agent-planner)",
              color: "#fff",
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 6px rgba(79,70,229,0.25)",
            }}
          >
            CONSULTED · {state.consultedBy.correlation_id}
          </div>
        )}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            paddingRight: 4,
          }}
        >
          {state.thinkingText && (
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontSize: 15,
                lineHeight: 1.5,
                color: "#292524",
              }}
            >
              {state.thinkingText}
            </div>
          )}

          {state.summary && (
            <div style={{ fontSize: 12, color: "#57534e" }}>
              <strong>Summary:</strong> {state.summary}
            </div>
          )}

          {toolItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a8a29e" }}>
                Tools
              </div>
              {toolItems.map((tool) => (
                <ToolRow key={`${tool.agent}-${tool.name}-${tool.index}`} tool={tool} />
              ))}
            </div>
          )}

          {observationItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a8a29e" }}>
                Observations
              </div>
              {observationItems.map((obs) => (
                <div key={`${obs.agent}-${obs.kind}-${obs.index}`} style={{ fontSize: 12, color: "#57534e" }}>
                  <strong style={{ color: AGENT_COLOR[obs.agent] }}>{AGENT_LABEL[obs.agent]}</strong>
                  {": "}
                  {obs.summary}
                </div>
              ))}
            </div>
          )}

          {latestMessages.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a8a29e" }}>
                Inter-agent notes
              </div>
              {latestMessages.map((m) => (
                <div key={m.id} style={{ fontSize: 12, color: "#57534e" }}>
                  <strong style={{ color: AGENT_COLOR[m.from] }}>{AGENT_LABEL[m.from]}</strong>
                  {" → "}
                  <strong style={{ color: AGENT_COLOR[m.to] }}>{AGENT_LABEL[m.to]}</strong>
                  {": "}
                  {m.content}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolRow({ tool }: { tool: ToolCallState }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <ToolChip tool={tool} />
      {tool.resolved && tool.resultSummary && (
        <div style={{ fontSize: 11, color: "#78716c", paddingLeft: 4 }}>
          {tool.resultSummary}
        </div>
      )}
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
