type IconProps = { className?: string; size?: number };

/**
 * Orchestrator — conductor figure: head, vertical body, arms reaching out to
 * two "agents", legs, crown of dots. From the v5 mockup character SVG.
 */
export default function OrchestratorIcon({ className, size = 64 }: IconProps) {
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
      <circle cx="40" cy="14" r="5" />
      <path d="M 40 19 L 40 50" />
      <path d="M 32 50 q 8 4 16 0" />
      <path d="M 40 50 L 36 70" />
      <path d="M 40 50 L 44 70" />
      <path d="M 40 24 L 26 18 L 14 26" />
      <path d="M 40 24 L 56 16 L 70 22 q -3 4 -8 4 q -5 0 -8 -2" />
      <circle cx="40" cy="4" r="1" />
      <circle cx="32" cy="6" r="0.8" />
      <circle cx="48" cy="6" r="0.8" />
    </svg>
  );
}
