"use client";

import type { WavePreference } from "../hook";
import CardShell from "../card-shell";

const WAVE_OPTIONS: {
  value: WavePreference;
  label: string;
  tagline: string;
  emoji: string;
  description: string;
}[] = [
  {
    value: "mellow",
    label: "Mellow",
    tagline: "Long rides, forgiving faces",
    emoji: "🌊",
    description: "Mushy, rolling waves perfect for logging and casual surfing. Less critical, more fun.",
  },
  {
    value: "performance",
    label: "Performance",
    tagline: "Punch, power, precision",
    emoji: "⚡",
    description: "Steep, punchy waves with hollow sections. Designed for aggressive surfing.",
  },
  {
    value: "mixed",
    label: "Mixed",
    tagline: "Best of both worlds",
    emoji: "🤙",
    description: "A range of conditions — take what comes and adapt your boards and style.",
  },
];

interface WavesCardProps {
  value: WavePreference | null;
  onChange: (pref: WavePreference) => void;
}

export default function WavesCard({ value, onChange }: WavesCardProps) {
  return (
    <CardShell cardNumber={5} title="What kind of waves?">
      <div className="flex flex-col gap-3">
        {WAVE_OPTIONS.map(({ value: pref, label, tagline, emoji, description }) => {
          const isSelected = value === pref;
          return (
            <button
              key={pref}
              type="button"
              onClick={() => onChange(pref)}
              className={`flex items-start gap-4 rounded-xl px-5 py-4 text-left transition-all duration-150 ease-soft border ${
                isSelected
                  ? "border-stone-900 bg-stone-900 text-white shadow-soft"
                  : "border-stone-200/60 bg-white/70 text-stone-800 hover:bg-white hover:border-stone-300"
              }`}
            >
              <span className="text-2xl mt-0.5 flex-shrink-0">{emoji}</span>
              <span className="flex flex-col gap-0.5">
                <span className="font-medium leading-snug">{label}</span>
                <span className={`text-xs font-medium ${isSelected ? "text-stone-300" : "text-stone-500"}`}>
                  {tagline}
                </span>
                <span className={`text-xs leading-relaxed mt-0.5 ${isSelected ? "text-stone-300" : "text-stone-500"}`}>
                  {description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </CardShell>
  );
}
