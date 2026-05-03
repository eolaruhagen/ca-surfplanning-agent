"use client";

type PitchToggleProps = {
  is3D: boolean;
  onToggle: () => void;
};

export default function PitchToggle({ is3D, onToggle }: PitchToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="surface-pill px-3 py-1.5 text-xs text-stone-600 hover:bg-white transition-all ease-soft flex items-center gap-1.5"
      aria-label={is3D ? "Switch to 2D view" : "Switch to 3D view"}
    >
      <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        {is3D ? (
          <>
            <rect x="2" y="5" width="12" height="8" rx="1" />
            <path d="M2 5 L8 2 L14 5" />
          </>
        ) : (
          <>
            <rect x="2" y="3" width="12" height="10" rx="1" />
            <path d="M2 7 L14 7" strokeOpacity={0.4} />
          </>
        )}
      </svg>
      {is3D ? "3D" : "2D"}
    </button>
  );
}
