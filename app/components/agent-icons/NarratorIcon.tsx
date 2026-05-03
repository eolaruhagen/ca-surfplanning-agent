type IconProps = { className?: string; size?: number };

export default function NarratorIcon({ className, size = 24 }: IconProps) {
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
      {/* scroll body */}
      <path d="M5 5 q2 7 0 14" />
      <path d="M5 5 h11 q2 7 0 14 h-11" />
      {/* inscribed wave line on the scroll */}
      <path d="M7 12 q2 -1.4 4 0 t4 0" />
      {/* quill */}
      <path d="M15 4 l5 -2 l-1.6 5.6 z" />
      <path d="M15 4 l3 3" />
    </svg>
  );
}
