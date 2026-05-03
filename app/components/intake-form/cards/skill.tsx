"use client";

import type { SkillLevel } from "@/lib/spots";
import CardShell from "../card-shell";

const SKILL_LEVELS: { value: SkillLevel; label: string; description: string; color: string }[] = [
  { value: "beginner", label: "Beginner", description: "Just learning to pop up", color: "bg-skill-beginner" },
  { value: "beginner-intermediate", label: "Beginner–Intermediate", description: "Riding whitewater, occasional green waves", color: "bg-skill-beginner-intermediate" },
  { value: "intermediate", label: "Intermediate", description: "Catching unbroken waves, basic turns", color: "bg-skill-intermediate" },
  { value: "intermediate-advanced", label: "Intermediate–Advanced", description: "Consistent surf, rail to rail", color: "bg-skill-intermediate-advanced" },
  { value: "advanced", label: "Advanced", description: "Charging overhead+ surf confidently", color: "bg-skill-advanced" },
  { value: "advanced-expert", label: "Advanced–Expert", description: "Competing or surfing serious reef/point breaks", color: "bg-skill-advanced-expert" },
  { value: "expert", label: "Expert", description: "Elite surfing, big waves, high consequence", color: "bg-skill-expert" },
];

interface SkillCardProps {
  value: SkillLevel | null;
  onChange: (level: SkillLevel) => void;
}

export default function SkillCard({ value, onChange }: SkillCardProps) {
  return (
    <CardShell cardNumber={4} title="What's your level?">
      <div className="flex flex-col gap-2">
        {SKILL_LEVELS.map(({ value: level, label, description, color }) => {
          const isSelected = value === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-150 ease-soft border ${
                isSelected
                  ? "border-stone-900 bg-stone-900 text-white shadow-soft"
                  : "border-stone-200/60 bg-white/70 text-stone-800 hover:bg-white hover:border-stone-300"
              }`}
            >
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${isSelected ? "bg-white" : color}`} />
              <span className="flex flex-col">
                <span className="text-sm font-medium leading-snug">{label}</span>
                <span className={`text-xs leading-snug ${isSelected ? "text-stone-300" : "text-stone-500"}`}>
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
