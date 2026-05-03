"use client";

import type { AgentName } from "@/lib/types";
import { AGENT_COLOR, AGENT_LABEL, agentIcon } from "../agent-icons";
import type { AgentDerivedState } from "./hook";
import ToolChip from "./tool-chip";

export default function AgentCard({
  agent,
  state,
}: {
  agent: AgentName;
  state: AgentDerivedState;
}) {
  const Icon = agentIcon(agent);
  const color = AGENT_COLOR[agent];
  const isActive = state.state === "active" || state.state === "thinking";
  const isFinished = state.state === "finished";

  // Show the most recent observation (if any) as a small footer line.
  const lastObs = state.observations[state.observations.length - 1];

  return (
    <div className="agent-card">
      <div
        className={`agent-portrait${isActive ? " is-active" : ""}${
          isFinished ? " is-finished" : ""
        }`}
        style={{ color: isActive || isFinished ? color : undefined }}
      >
        <Icon size={28} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-eyebrow" style={{ color, fontWeight: 600 }}>
            {AGENT_LABEL[agent]}
          </span>
          {state.currentTask && (
            <span className="text-meta truncate">— {state.currentTask}</span>
          )}
        </div>

        {state.thinkingText && state.state !== "finished" && (
          <div className="thinking-text">
            {state.thinkingText}
            <span className="cursor" />
          </div>
        )}

        {state.summary && (
          <div className="text-sm text-stone-700 leading-snug">
            {state.summary}
          </div>
        )}

        {state.activeTools.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {state.activeTools.map((t) => (
              <ToolChip key={t.index} tool={t} />
            ))}
          </div>
        )}

        {lastObs && state.state !== "finished" && (
          <div className="flex items-center gap-1.5 mt-1.5 text-meta">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: color }}
            />
            {lastObs.summary}
            {typeof lastObs.score === "number" && (
              <span className="text-stone-700 font-semibold">
                ({lastObs.score})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
