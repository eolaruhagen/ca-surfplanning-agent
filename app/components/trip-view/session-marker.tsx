"use client";

type SessionMarkerProps = {
  number: number;
  isCurrent?: boolean;
  onClick?: () => void;
};

/**
 * Numbered pin for a session on the map.
 */
export default function SessionMarker({ number, isCurrent = false, onClick }: SessionMarkerProps) {
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-soft transition-all ease-soft ${
        isCurrent
          ? "bg-stone-900 text-white scale-125 shadow-soft-md"
          : "surface-glass text-stone-700 hover:scale-110"
      }`}
      aria-label={`Session ${number}`}
    >
      {number}
    </button>
  );
}
