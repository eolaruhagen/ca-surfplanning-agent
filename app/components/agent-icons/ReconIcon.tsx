type IconProps = { className?: string; size?: number };

/**
 * Recon — binocular-wielding figure with surf lines in the distance.
 * From the v5 mockup character SVG.
 */
export default function ReconIcon({ className, size = 64 }: IconProps) {
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
      <circle cx="34" cy="18" r="5" />
      <circle cx="31" cy="18" r="2" />
      <circle cx="37" cy="18" r="2" />
      <path d="M 33 18 L 35 18" />
      <path d="M 34 23 L 34 48" />
      <path d="M 28 30 L 34 28 L 40 30" />
      <path d="M 28 22 L 30 18" />
      <path d="M 40 22 L 38 18" />
      <path d="M 34 48 L 30 64" />
      <path d="M 34 48 L 38 64" />
      <path d="M 8 64 L 26 64 L 30 60 L 44 60 L 48 64 L 72 64" />
      <path d="M 50 28 q 4 -2 8 0 t 8 0 t 8 0" />
      <path d="M 52 32 q 4 -2 6 0 t 6 0 t 6 0" />
      <path d="M 56 38 q -2 -8 4 -14 q 6 0 4 14 q 0 16 -4 22 q -4 -6 -4 -22 z" />
    </svg>
  );
}
