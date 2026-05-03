type IconProps = { className?: string; size?: number };

/**
 * Vision — figure with binocular / camera eye. From the v5 mockup character SVG.
 */
export default function VisionIcon({ className, size = 64 }: IconProps) {
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
      <circle cx="38" cy="20" r="5" />
      <path d="M 38 25 q 4 8 -2 18" />
      <path d="M 36 43 q -4 6 -6 18" />
      <path d="M 38 43 q 4 6 8 18" />
      <path d="M 40 28 L 50 22" />
      <circle cx="56" cy="20" r="6" />
      <path d="M 60 24 L 64 28" />
      <path d="M 36 32 L 22 42" />
      <path d="M 14 56 q -4 -10 4 -16 q 12 -2 20 6 q -8 8 -20 14 q -8 -1 -4 -4 z" />
    </svg>
  );
}
