type IconProps = { className?: string; size?: number };

/**
 * Narrator — figure at a microphone / speech podium with scroll and quill.
 * From the v5 mockup character SVG.
 */
export default function NarratorIcon({ className, size = 64 }: IconProps) {
  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="34" cy="16" r="5" />
      <path d="M 34 21 q -2 8 -2 14" />
      <path d="M 26 36 q -8 12 -8 24" />
      <path d="M 42 36 q 8 12 8 24" />
      <path d="M 18 60 L 50 60" />
      <path d="M 22 42 q -2 6 0 10 q 14 -1 26 0 q 2 -4 0 -10 q -14 1 -26 0 z" />
      <path d="M 26 47 q 3 -2 6 0 t 6 0 t 6 0" />
      <path d="M 36 26 L 50 30" />
      <path d="M 50 30 L 60 22 L 62 30 z" />
      <path d="M 56 26 L 50 32" />
    </svg>
  );
}
