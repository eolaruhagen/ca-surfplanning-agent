"use client";

import CardShell from "../card-shell";

const SESSION_OPTIONS: {
  value: 1 | 2 | 3;
  label: string;
  subline: string;
}[] = [
  { value: 1, label: "1 session", subline: "Dawn only" },
  { value: 2, label: "2 sessions", subline: "Dawn + evening" },
  { value: 3, label: "3 sessions", subline: "Dawn + mid + evening" },
];

interface SessionsCardProps {
  value: 1 | 2 | 3;
  onChange: (n: 1 | 2 | 3) => void;
}

export default function SessionsCard({ value, onChange }: SessionsCardProps) {
  return (
    <CardShell cardNumber={6} title="How many sessions a day?">
      <div className="flex flex-col gap-3">
        {SESSION_OPTIONS.map(({ value: n, label, subline }) => {
          const isSelected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex items-center justify-between rounded-xl px-5 py-4 text-left transition-all duration-150 ease-soft border ${
                isSelected
                  ? "border-stone-900 bg-stone-900 text-white shadow-soft"
                  : "border-stone-200/60 bg-white/70 text-stone-800 hover:bg-white hover:border-stone-300"
              }`}
            >
              <span className="font-medium">{label}</span>
              <span className={`text-xs ${isSelected ? "text-stone-300" : "text-stone-500"}`}>
                {subline}
              </span>
            </button>
          );
        })}
      </div>
    </CardShell>
  );
}
