type IconProps = { className?: string; size?: number };

export default function ReconIcon({ className, size = 24 }: IconProps) {
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
      {/* binoculars */}
      <circle cx="8" cy="9" r="2.6" />
      <circle cx="15" cy="9" r="2.6" />
      <path d="M10.6 9 h1.8" />
      {/* figure / bluff */}
      <path d="M8 11.6 v3.4 M15 11.6 v3.4" />
      <path d="M3 20 q4 -3 9 -3 t9 3" />
      {/* distant wave lines */}
      <path d="M3 6 q2 -1.2 4 0 t4 0" opacity="0.7" />
    </svg>
  );
}
