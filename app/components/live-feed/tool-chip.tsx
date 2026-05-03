"use client";

import type { ToolCallState } from "./hook";

const SOURCE_LABEL: Record<ToolCallState["source"], string> = {
  local: "local",
  "mcp:open-meteo": "open-meteo",
  "mcp:google-maps": "google-maps",
  "mcp:filesystem": "filesystem",
};

const SOURCE_VARIANT: Record<ToolCallState["source"], string> = {
  local: "",
  "mcp:open-meteo": "is-open-meteo",
  "mcp:google-maps": "is-google-maps",
  "mcp:filesystem": "is-filesystem",
};

function formatArgs(args: unknown): string {
  if (args == null) return "";
  if (typeof args === "string") return args;
  try {
    const s = JSON.stringify(args);
    return s.length > 60 ? s.slice(0, 57) + "…" : s;
  } catch {
    return String(args);
  }
}

export default function ToolChip({ tool }: { tool: ToolCallState }) {
  return (
    <div className={`tool-chip${tool.resolved ? " is-resolved" : ""}`}>
      <span className={`tool-chip-source ${SOURCE_VARIANT[tool.source]}`}>
        {SOURCE_LABEL[tool.source]}
      </span>
      <code>
        {tool.name}({formatArgs(tool.args)})
      </code>
      <span className="tool-chip-status" />
      {tool.resolved && tool.resultSummary && (
        <span className="text-meta truncate max-w-[180px]">
          → {tool.resultSummary}
        </span>
      )}
    </div>
  );
}
