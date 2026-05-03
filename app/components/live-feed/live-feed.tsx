"use client";

import type { AgentName } from "@/lib/types";
import AgentCard from "./agent-card";
import ChatBubble from "./chat-bubble";
import type { LiveFeedState } from "./hook";
import { AGENT_COLOR, AGENT_LABEL, agentIcon } from "../agent-icons";

const AGENT_ORDER: AgentName[] = [
  "vision",
  "recon",
  "planner",
  "narrator",
];

/**
 * Render-only live feed. Consumes derived state from {@link useLiveFeed}.
 * Interleaves per-agent cards with inter-agent chat bubbles in the order
 * the events arrived (using each item's `index` as the sort key).
 */
export default function LiveFeed({ state }: { state: LiveFeedState }) {
  // Build an interleaved timeline:
  //   - one card per agent that has any state
  //   - chat bubbles inserted at their event index
  // For agents, "first-seen" index is the smallest index of any of their
  // events (currentTask / thinking / tool / observation).
  type Item =
    | { kind: "agent"; agent: AgentName; index: number }
    | { kind: "bubble"; index: number; from: AgentName; to: AgentName; content: string };

  const items: Item[] = [];

  for (const agent of AGENT_ORDER) {
    const a = state.agents[agent];
    if (a.state === "idle") continue;
    const idx = Math.min(
      ...a.activeTools.map((t) => t.index),
      ...a.observations.map((o) => o.index),
      // Fallback: order by AGENT_ORDER position if no events have indices.
      AGENT_ORDER.indexOf(agent) * 1000,
    );
    items.push({ kind: "agent", agent, index: isFinite(idx) ? idx : 0 });
  }

  for (const c of state.conversation) {
    items.push({
      kind: "bubble",
      index: c.index,
      from: c.from,
      to: c.to,
      content: c.content,
    });
  }

  items.sort((a, b) => a.index - b.index);

  return (
    <div className="h-full flex flex-col">
      <FeedHeader state={state} />
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5">
        {items.length === 0 && (
          <div className="text-meta italic">Waiting for agents to start…</div>
        )}
        {items.map((it, i) =>
          it.kind === "agent" ? (
            <AgentCard
              key={`agent-${it.agent}-${i}`}
              agent={it.agent}
              state={state.agents[it.agent]}
            />
          ) : (
            <ChatBubble
              key={`bubble-${i}`}
              from={it.from}
              to={it.to}
              content={it.content}
            />
          ),
        )}
        {state.isDone && state.finalTrip && (
          <div className="agent-card">
            <div className="agent-portrait is-finished">
              <span className="text-display text-2xl">✓</span>
            </div>
            <div className="flex-1">
              <div className="text-eyebrow text-stone-700">Trip ready</div>
              <div className="text-sm text-stone-700 leading-snug mt-1">
                {state.finalTrip.days.length} days · {state.tripDays.length}{" "}
                stops · share at <code>/t/{state.finalTrip.id}</code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedHeader({ state }: { state: LiveFeedState }) {
  return (
    <div className="px-5 pt-4 pb-2 border-b border-stone-200/70">
      <div className="flex items-center justify-between mb-2">
        <div className="text-eyebrow">Live agent feed</div>
        {state.currentPhase && (
          <div className="surface-pill text-xs px-2.5 py-1 inline-flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: phaseColor(state.currentPhase),
                animation: state.isDone
                  ? undefined
                  : "spot-pulse 1.4s var(--ease-soft) infinite",
              }}
            />
            <span className="capitalize font-medium">{state.currentPhase}</span>
          </div>
        )}
      </div>
      <div className="flex gap-1.5">
        {AGENT_ORDER.map((a) => {
          const Icon = agentIcon(a);
          const s = state.agents[a];
          const active = s.state === "active" || s.state === "thinking";
          const finished = s.state === "finished";
          return (
            <div
              key={a}
              className="w-7 h-7 rounded-full surface-pill flex items-center justify-center transition-all ease-soft"
              style={{
                color:
                  active || finished ? AGENT_COLOR[a] : "#a8a29e",
                opacity: s.state === "idle" ? 0.35 : 1,
                boxShadow: active
                  ? `0 0 0 3px ${AGENT_COLOR[a]}26`
                  : undefined,
              }}
              title={`${AGENT_LABEL[a]} — ${s.state}`}
            >
              <Icon size={16} />
            </div>
          );
        })}
      </div>
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
