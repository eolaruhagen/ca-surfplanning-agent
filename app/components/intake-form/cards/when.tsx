"use client";

import CardShell from "../card-shell";
import { useWhen } from "./when.hook";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildDays(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push(`${year}-${m}-${dd}`);
  }
  return cells;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface MonthGridProps {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  inRange: (iso: string) => boolean;
  onHover: (iso: string | null) => void;
  onClick: (iso: string) => void;
}

function MonthGrid({ year, month, startDate, endDate, inRange, onHover, onClick }: MonthGridProps) {
  const cells = buildDays(year, month);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col gap-1">
      <p className="text-center text-sm font-medium text-stone-700 mb-1">
        {MONTHS[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DAYS.map((d) => (
          <span key={d} className="text-eyebrow py-1">{d}</span>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <span key={`empty-${i}`} />;
          const date = isoToDate(iso);
          const isPast = date < today;
          const isStart = iso === startDate;
          const isEnd = iso === endDate;
          const ranged = inRange(iso);
          let cls =
            "py-1.5 rounded text-sm cursor-pointer select-none transition-colors duration-100 ";
          if (isPast) {
            cls += "text-stone-300 cursor-not-allowed ";
          } else if (isStart || isEnd) {
            cls += "bg-stone-900 text-white font-semibold ";
          } else if (ranged) {
            cls += "bg-stone-100 text-stone-800 ";
          } else {
            cls += "text-stone-700 hover:bg-stone-50 ";
          }
          return (
            <button
              key={iso}
              disabled={isPast}
              className={cls}
              onMouseEnter={() => !isPast && onHover(iso)}
              onMouseLeave={() => onHover(null)}
              onClick={() => !isPast && onClick(iso)}
              type="button"
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface WhenCardProps {
  startDate: string;
  endDate: string;
  onDatesChange: (start: string, end: string) => void;
}

export default function WhenCard({ startDate, endDate, onDatesChange }: WhenCardProps) {
  const {
    state,
    hoverDay,
    clickDay,
    prevMonth,
    nextMonth,
    rightYear,
    rightMonth,
    inRange,
    clear,
  } = useWhen(startDate, endDate, onDatesChange);

  const fmt = (iso: string) => {
    if (!iso) return "–";
    const d = isoToDate(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <CardShell cardNumber={1} title="When are you going?">
      {/* Selected range summary */}
      <div className="flex items-center gap-3 text-sm">
        <span className="surface-pill px-3 py-1.5 text-stone-800">
          {fmt(startDate)}
        </span>
        <span className="text-stone-400">→</span>
        <span className="surface-pill px-3 py-1.5 text-stone-800">
          {fmt(endDate)}
        </span>
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={clear}
            className="text-meta text-stone-400 hover:text-stone-600 ml-auto"
          >
            Clear
          </button>
        )}
      </div>

      {state.phase === "picking-end" && (
        <p className="text-meta text-stone-500 anim-fade-in">
          Now click your return date.
        </p>
      )}

      {/* Calendar nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="surface-pill w-8 h-8 flex items-center justify-center text-stone-600 hover:text-stone-900"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={nextMonth}
          className="surface-pill w-8 h-8 flex items-center justify-center text-stone-600 hover:text-stone-900"
        >
          ›
        </button>
      </div>

      {/* Two-month grid */}
      <div className="grid grid-cols-2 gap-4">
        <MonthGrid
          year={state.leftYear}
          month={state.leftMonth}
          startDate={startDate}
          endDate={endDate}
          inRange={inRange}
          onHover={hoverDay}
          onClick={clickDay}
        />
        <MonthGrid
          year={rightYear}
          month={rightMonth}
          startDate={startDate}
          endDate={endDate}
          inRange={inRange}
          onHover={hoverDay}
          onClick={clickDay}
        />
      </div>
    </CardShell>
  );
}
