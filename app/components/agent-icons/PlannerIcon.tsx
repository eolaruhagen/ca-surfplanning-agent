type IconProps = { className?: string; size?: number };

/**
 * Planner — figure at a planning table / board with route lines.
 * From the v5 mockup character SVG.
 */
export default function PlannerIcon({ className, size = 64 }: IconProps) {
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
      <circle cx="34" cy="14" r="5" />
      <path d="M 34 19 q 4 6 0 16" />
      <path d="M 36 28 L 50 38" />
      <path d="M 50 38 L 48 44 L 46 38" />
      <path d="M 32 30 L 22 38" />
      <path d="M 12 46 L 70 46" />
      <path d="M 16 52 q 6 -3 12 0 t 12 0 t 12 0 t 12 0" />
      <path d="M 16 58 q 6 -3 12 0 t 12 0 t 12 0 t 12 0" />
      <circle cx="20" cy="55" r="1.4" />
      <circle cx="44" cy="55" r="1.4" />
      <circle cx="68" cy="55" r="1.4" />
      <path d="M 32 35 L 28 46" />
      <path d="M 36 35 L 40 46" />
      <path d="M 18 46 L 18 70" />
      <path d="M 64 46 L 64 70" />
    </svg>
  );
}
