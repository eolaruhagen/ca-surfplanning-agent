import ReactMarkdown from "react-markdown";
import type { CSSProperties } from "react";

export default function Md({ children, style }: { children: string; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: "inherit",
        fontSize: "inherit",
        color: "inherit",
        lineHeight: "inherit",
        ...style,
      }}
      className="md-prose"
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
