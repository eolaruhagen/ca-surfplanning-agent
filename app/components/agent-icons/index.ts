import OrchestratorIcon from "./OrchestratorIcon";
import VisionIcon from "./VisionIcon";
import ReconIcon from "./ReconIcon";
import PlannerIcon from "./PlannerIcon";
import NarratorIcon from "./NarratorIcon";

import type { AgentName } from "@/lib/types";

export {
  OrchestratorIcon,
  VisionIcon,
  ReconIcon,
  PlannerIcon,
  NarratorIcon,
};

export type AgentIconComponent = (props: {
  className?: string;
  size?: number;
}) => React.ReactElement;

const REGISTRY: Record<AgentName, AgentIconComponent> = {
  orchestrator: OrchestratorIcon,
  vision: VisionIcon,
  recon: ReconIcon,
  planner: PlannerIcon,
  narrator: NarratorIcon,
};

/** Lookup helper: returns the icon component for an agent name. */
export function agentIcon(name: AgentName): AgentIconComponent {
  return REGISTRY[name] ?? OrchestratorIcon;
}

/** Per-agent CSS color (matches `--agent-*` tokens in globals.css). */
export const AGENT_COLOR: Record<AgentName, string> = {
  orchestrator: "var(--agent-orchestrator)",
  vision:       "var(--agent-vision)",
  recon:        "var(--agent-recon)",
  planner:      "var(--agent-planner)",
  narrator:     "var(--agent-narrator)",
};

/** Display label for each agent. */
export const AGENT_LABEL: Record<AgentName, string> = {
  orchestrator: "Orchestrator",
  vision:       "Vision",
  recon:        "Recon",
  planner:      "Planner",
  narrator:     "Narrator",
};
