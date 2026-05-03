"use client";

type NavControlsProps = {
  currentIndex: number;
  total: number;
  isPlaying: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
};

export default function NavControls({
  currentIndex,
  total,
  isPlaying,
  onPrev,
  onNext,
  onToggle,
}: NavControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        disabled={currentIndex === 0}
        className="surface-pill w-8 h-8 flex items-center justify-center text-stone-600 disabled:opacity-30 hover:bg-white transition-all ease-soft"
        aria-label="Previous session"
      >
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3 L5 8 L10 13" />
        </svg>
      </button>

      <button
        onClick={onToggle}
        className="surface-pill w-8 h-8 flex items-center justify-center text-stone-700 hover:bg-white transition-all ease-soft"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg viewBox="0 0 16 16" width={14} height={14} fill="currentColor">
            <rect x="3" y="3" width="3.5" height="10" rx="1" />
            <rect x="9.5" y="3" width="3.5" height="10" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width={14} height={14} fill="currentColor">
            <path d="M4 3 L13 8 L4 13 Z" />
          </svg>
        )}
      </button>

      <button
        onClick={onNext}
        disabled={currentIndex === total - 1}
        className="surface-pill w-8 h-8 flex items-center justify-center text-stone-600 disabled:opacity-30 hover:bg-white transition-all ease-soft"
        aria-label="Next session"
      >
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3 L11 8 L6 13" />
        </svg>
      </button>

      <span className="text-meta text-stone-400 ml-1 tabular-nums">
        {total > 0 ? `${currentIndex + 1} / ${total}` : "—"}
      </span>
    </div>
  );
}
