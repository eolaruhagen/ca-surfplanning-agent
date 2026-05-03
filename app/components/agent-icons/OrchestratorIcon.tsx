type IconProps = { className?: string; size?: number };

export default function OrchestratorIcon({ className, size = 24 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
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
      {/* central spiral */}
      <path d="M12 12 m-3 0 a3 3 0 1 1 6 0 a4.5 4.5 0 1 1 -7.5 -2 a6 6 0 1 1 9 4" />
      {/* branching rays */}
      <path d="M12 4 v2 M12 18 v2 M4 12 h2 M18 12 h2 M6.4 6.4 l1.4 1.4 M16.2 16.2 l1.4 1.4 M17.6 6.4 l-1.4 1.4 M7.8 16.2 l-1.4 1.4" />
      {/* central dot */}
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
