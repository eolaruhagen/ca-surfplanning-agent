"use client";

import { useCallback } from "react";
import CardShell from "../card-shell";

const HELPER_CHIPS = [
  "Max drive: 2h",
  "Avoid crowded spots",
  "Have 4/3 wetsuit",
  "Average paddle fitness",
  "Vibe: chill",
  "Vibe: chase the swell",
];

interface AnythingElseCardProps {
  value: string;
  onChange: (text: string) => void;
}

export default function AnythingElseCard({ value, onChange }: AnythingElseCardProps) {
  const appendChip = useCallback(
    (chip: string) => {
      // Dedup: don't add if already present
      if (value.includes(chip)) return;
      const newVal = value ? `${value.trim()}. ${chip}` : chip;
      onChange(newVal.slice(0, 500));
    },
    [value, onChange],
  );

  const remaining = 500 - value.length;

  return (
    <CardShell cardNumber={8} title="Anything else?">
      <p className="text-meta text-stone-500">
        Hard constraints, gear notes, vibes — all fair game. Optional.
      </p>

      {/* Chip rail */}
      <div className="flex flex-wrap gap-2">
        {HELPER_CHIPS.map((chip) => {
          const already = value.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => appendChip(chip)}
              className={`surface-pill px-3 py-1.5 text-xs transition-all duration-100 ease-soft ${
                already
                  ? "bg-stone-900 text-white border-stone-900"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* Textarea */}
      <div className="flex flex-col gap-1">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 500))}
          placeholder={"e.g. \"No driving after dark. Prefer left-handers. Have a 5'10 fish.\""}
          rows={4}
          className="w-full rounded-xl border border-stone-200/60 bg-white/70 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-400 resize-none transition-colors duration-150"
        />
        <p className={`text-meta text-right ${remaining < 50 ? "text-amber-500" : "text-stone-400"}`}>
          {remaining} characters left
        </p>
      </div>
    </CardShell>
  );
}
