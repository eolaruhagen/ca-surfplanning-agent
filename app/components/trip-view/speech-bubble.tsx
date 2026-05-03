"use client";

import NarratorIcon from "@/app/components/agent-icons/NarratorIcon";

type SpeechBubbleProps = {
  text: string;
  visible?: boolean;
};

/**
 * Narrator portrait with animated speak-lines and pick_reason speech bubble.
 */
export default function SpeechBubble({ text, visible = true }: SpeechBubbleProps) {
  if (!visible) return null;
  return (
    <div className="flex items-end gap-3 anim-pop-in">
      {/* Portrait + speak-lines */}
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 rounded-full surface-glass flex items-center justify-center text-stone-700 shadow-soft">
          <NarratorIcon size={36} />
        </div>
        {/* Animated speak-lines: 3 arcs */}
        <svg
          viewBox="0 0 40 40"
          width={40}
          height={40}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          className="absolute -right-8 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
          aria-hidden
        >
          <path
            d="M4 20 Q12 12 12 20 Q12 28 4 20"
            strokeWidth={1.2}
            className="speak-arc-1"
          />
          <path
            d="M14 20 Q26 8 26 20 Q26 32 14 20"
            strokeWidth={1.0}
            className="speak-arc-2"
          />
          <path
            d="M26 20 Q40 4 40 20 Q40 36 26 20"
            strokeWidth={0.8}
            className="speak-arc-3"
          />
        </svg>
      </div>

      {/* Bubble */}
      <div className="relative max-w-xs surface-glass rounded-2xl rounded-bl-sm px-4 py-3 shadow-soft-md">
        <p className="text-display-italic text-stone-800 text-sm leading-snug">{text}</p>
      </div>
    </div>
  );
}
