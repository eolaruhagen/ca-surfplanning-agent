type IconProps = { className?: string; size?: number };

export default function VisionIcon({ className, size = 24 }: IconProps) {
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
      {/* eye shape */}
      <ellipse cx="11" cy="11" rx="8" ry="5" />
      {/* iris as a wave-curl */}
      <path d="M8.5 11 q1.5 -2.5 3 0 q1.5 2.5 3 0" />
      <circle cx="11" cy="11" r="1.4" />
      {/* magnifier handle attached to lower-right of eye */}
      <path d="M16.4 14 l3.4 3.4" />
    </svg>
  );
}
