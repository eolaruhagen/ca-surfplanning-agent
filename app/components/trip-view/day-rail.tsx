"use client";

import type { TripDay } from "@/lib/types";

type DayRailProps = {
  days: TripDay[];
  currentDayIndex: number;
  onDaySelect: (dayIndex: number) => void;
};

export default function DayRail({ days, currentDayIndex, onDaySelect }: DayRailProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {days.map((day, idx) => {
        const isActive = idx === currentDayIndex;
        const label = day.date
          ? new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })
          : `Day ${day.day_number}`;
        return (
          <button
            key={day.day_number}
            onClick={() => onDaySelect(idx)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ease-soft ${
              isActive
                ? "bg-stone-900 text-stone-50"
                : "surface-pill text-stone-600 hover:bg-white"
            }`}
          >
            <span className="text-eyebrow mr-1">D{day.day_number}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
