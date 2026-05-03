"use client";

import { useState, useCallback } from "react";

export interface WhenState {
  /** Currently displayed month for left calendar (0-indexed month) */
  leftYear: number;
  leftMonth: number; // 0-11
  /** Hovered date during selection */
  hoverDate: string | null;
  /** Selection phase: null = no selection, 'start' = start picked, waiting for end */
  phase: "idle" | "picking-end";
}

export interface UseWhenReturn {
  state: WhenState;
  /** Selected start date (ISO yyyy-mm-dd), passed in from parent */
  startDate: string;
  endDate: string;
  /** Hover a date cell */
  hoverDay: (iso: string | null) => void;
  /** Click a day cell */
  clickDay: (iso: string) => void;
  /** Navigate left calendar */
  prevMonth: () => void;
  nextMonth: () => void;
  /** Right calendar always shows month after left */
  rightYear: number;
  rightMonth: number;
  /** Whether a given ISO date falls in the selected range (inclusive) */
  inRange: (iso: string) => boolean;
  /** Clear the selection */
  clear: () => void;
}

function addMonths(year: number, month: number, delta: number): [number, number] {
  const d = new Date(year, month + delta, 1);
  return [d.getFullYear(), d.getMonth()];
}

function isoToDate(iso: string): Date {
  // Parse YYYY-MM-DD in local time to avoid UTC offset issues
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function useWhen(
  startDate: string,
  endDate: string,
  onDatesChange: (start: string, end: string) => void,
): UseWhenReturn {
  const today = new Date();
  const [state, setState] = useState<WhenState>({
    leftYear: today.getFullYear(),
    leftMonth: today.getMonth(),
    hoverDate: null,
    phase: "idle",
  });

  const [rightYear, rightMonth] = addMonths(state.leftYear, state.leftMonth, 1);

  const prevMonth = useCallback(() => {
    setState((s) => {
      const [y, m] = addMonths(s.leftYear, s.leftMonth, -1);
      return { ...s, leftYear: y, leftMonth: m };
    });
  }, []);

  const nextMonth = useCallback(() => {
    setState((s) => {
      const [y, m] = addMonths(s.leftYear, s.leftMonth, 1);
      return { ...s, leftYear: y, leftMonth: m };
    });
  }, []);

  const hoverDay = useCallback((iso: string | null) => {
    setState((s) => ({ ...s, hoverDate: iso }));
  }, []);

  const clickDay = useCallback(
    (iso: string) => {
      if (state.phase === "idle") {
        // First click: set start, clear end, enter picking-end phase
        onDatesChange(iso, "");
        setState((s) => ({ ...s, phase: "picking-end", hoverDate: null }));
      } else {
        // Second click: determine start/end order
        const clickedDate = isoToDate(iso);
        const startDateObj = isoToDate(startDate);
        if (clickedDate < startDateObj) {
          // Clicked before start → new start, old start becomes end
          onDatesChange(iso, startDate);
        } else {
          onDatesChange(startDate, iso);
        }
        setState((s) => ({ ...s, phase: "idle", hoverDate: null }));
      }
    },
    [state.phase, startDate, onDatesChange],
  );

  const clear = useCallback(() => {
    onDatesChange("", "");
    setState((s) => ({ ...s, phase: "idle", hoverDate: null }));
  }, [onDatesChange]);

  const inRange = useCallback(
    (iso: string): boolean => {
      if (!startDate) return false;
      const d = isoToDate(iso);
      const start = isoToDate(startDate);
      if (endDate) {
        const end = isoToDate(endDate);
        return d >= start && d <= end;
      }
      // During picking-end, show hover range
      if (state.phase === "picking-end" && state.hoverDate) {
        const hover = isoToDate(state.hoverDate);
        const lo = hover < start ? hover : start;
        const hi = hover < start ? start : hover;
        return d >= lo && d <= hi;
      }
      return d.getTime() === start.getTime();
    },
    [startDate, endDate, state.phase, state.hoverDate],
  );

  return {
    state,
    startDate,
    endDate,
    hoverDay,
    clickDay,
    prevMonth,
    nextMonth,
    rightYear,
    rightMonth,
    inRange,
    clear,
  };
}
