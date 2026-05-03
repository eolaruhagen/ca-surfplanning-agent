"use client";

import type { ToolCallState } from "./hook";

const SOURCE_LABEL: Record<ToolCallState["source"], string> = {
  local: "local",
  "mcp:open-meteo": "open-meteo",
  "mcp:google-maps": "google-maps",
  "mcp:filesystem": "filesystem",
};

const SOURCE_STYLE: Record<ToolCallState["source"], React.CSSProperties> = {
  local: { background: "rgb(231,229,228)", color: "#44403c" },
  "mcp:open-meteo": { background: "#e0f2fe", color: "#0369a1" },
  "mcp:google-maps": { background: "#fef3c7", color: "#b45309" },
  "mcp:filesystem": { background: "#dcfce7", color: "#166534" },
};

function formatArgs(args: unknown): string {
  if (args == null) return "";
  if (typeof args === "string") return args;
  try {
    const s = JSON.stringify(args);
    return s.length > 50 ? s.slice(0, 47) + "…" : s;
  } catch {
    return String(args);
  }
}

export default function ToolChip({ tool }: { tool: ToolCallState }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "#f5f5f0",
        border: "1px solid rgb(231,229,228)",
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 10,
        lineHeight: 1.2,
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          ...SOURCE_STYLE[tool.source],
          fontSize: 8,
          padding: "1px 5px",
          borderRadius: 999,
          fontWeight: 700,
          textTransform: "lowercase",
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
        }}
      >
        {SOURCE_LABEL[tool.source]}
      </span>
      <code
        style={{
          fontFamily: 'ui-monospace, "SF Mono", monospace',
          fontSize: 10,
          color: "#44403c",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
          flex: 1,
        }}
      >
        {tool.name}({formatArgs(tool.args)})
      </code>
      {tool.resolved ? (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--agent-narrator)",
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 7,
            fontWeight: 700,
          }}
        >
          ✓
        </span>
      ) : (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            border: "1.4px solid currentColor",
            borderTopColor: "transparent",
            animation: "tool-spin 0.9s linear infinite",
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}
