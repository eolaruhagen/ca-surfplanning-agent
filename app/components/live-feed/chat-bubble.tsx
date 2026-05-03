"use client";

import type { AgentName } from "@/lib/types";
import { AGENT_COLOR, AGENT_LABEL } from "../agent-icons";

export default function ChatBubble({
  from,
  to,
  content,
}: {
  from: AgentName;
  to: AgentName;
  content: string;
}) {
  return (
    <div className="chat-bubble">
      <svg
        className="absolute -top-2 left-7 pointer-events-none"
        width={80}
        height={16}
        viewBox="0 0 80 16"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M 4 14 Q 20 -4 76 8"
          fill="none"
          stroke="#a8a29e"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      </svg>
      <div className="flex items-center gap-1.5 mb-1 text-eyebrow">
        <span style={{ color: AGENT_COLOR[from], fontWeight: 600 }}>
          {AGENT_LABEL[from]}
        </span>
        <svg width={10} height={10} viewBox="0 0 12 12" aria-hidden>
          <path
            d="M2 6 h8 m-3 -3 l3 3 -3 3"
            fill="none"
            stroke="#a8a29e"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span style={{ color: AGENT_COLOR[to], fontWeight: 600 }}>
          {AGENT_LABEL[to]}
        </span>
      </div>
      <div>{content}</div>
    </div>
  );
}
