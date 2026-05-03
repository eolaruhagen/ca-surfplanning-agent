type IconProps = { className?: string; size?: number };

export default function PlannerIcon({ className, size = 24 }: IconProps) {
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
      {/* three connected wave lines forming a route */}
      <path d="M3 7 q3 -3 6 0 t6 0 t6 0" />
      <path d="M3 12 q3 -3 6 0 t6 0 t6 0" />
      <path d="M3 17 q3 -3 6 0 t6 0 t6 0" />
      {/* pin marker on the middle wave */}
      <path d="M15 9.6 c1.4 0 2.4 1 2.4 2.2 c0 1.6 -2.4 3.6 -2.4 3.6 s-2.4 -2 -2.4 -3.6 c0 -1.2 1 -2.2 2.4 -2.2 z" />
      <circle cx="15" cy="11.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
