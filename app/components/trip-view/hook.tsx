"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Trip, TripDay, Session } from "@/lib/types";
import { AUTO_ADVANCE_INTERVAL_MS, advanceTick } from "./helpers/auto-advance";

export type FlatSession = {
  session: Session;
  dayIndex: number;    // 0-based index into trip.days
  sessionIndex: number; // 0-based index within the day
  globalIndex: number;  // 0-based index across all sessions
};

export type UseTripViewReturn = {
  flatSessions: FlatSession[];
  currentIndex: number;
  currentSession: Session | null;
  currentDay: TripDay | null;
  isPlaying: boolean;
  next(): void;
  prev(): void;
  jumpTo(globalIndex: number): void;
  jumpToDay(dayIndex: number): void;
  play(): void;
  pause(): void;
  toggle(): void;
};

/**
 * Pure helper: flatten trip.days[].sessions into a single ordered array.
 * Exported for testing without React.
 */
export function flattenSessions(trip: Trip): FlatSession[] {
  const result: FlatSession[] = [];
  let globalIndex = 0;
  for (let dayIndex = 0; dayIndex < trip.days.length; dayIndex++) {
    const day = trip.days[dayIndex];
    for (let sessionIndex = 0; sessionIndex < day.sessions.length; sessionIndex++) {
      result.push({
        session: day.sessions[sessionIndex],
        dayIndex,
        sessionIndex,
        globalIndex,
      });
      globalIndex++;
    }
  }
  return result;
}

/**
 * All interactive trip-walkthrough state.
 * Auto-advance interval is intentionally NOT tested — document: interval fires
 * next() every 4500ms while isPlaying. Cleared on unmount and when paused.
 */
export function useTripView(trip: Trip): UseTripViewReturn {
  const flatSessions = flattenSessions(trip);
  const total = flatSessions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clamp = (n: number) => Math.max(0, Math.min(total - 1, n));

  const next = useCallback(() => {
    setCurrentIndex((i) => (i < total - 1 ? i + 1 : i));
  }, [total]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : 0));
  }, []);

  const jumpTo = useCallback(
    (globalIndex: number) => {
      setCurrentIndex(clamp(globalIndex));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total],
  );

  const jumpToDay = useCallback(
    (dayIndex: number) => {
      const first = flatSessions.find((fs) => fs.dayIndex === dayIndex);
      if (first) setCurrentIndex(first.globalIndex);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flatSessions.length],
  );

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((v) => !v), []);

  // Auto-advance
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setCurrentIndex((i) => {
        const tick = advanceTick(i, total);
        if (tick.shouldPause) setIsPlaying(false);
        return tick.nextIndex;
      });
    }, AUTO_ADVANCE_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, total]);

  const currentFlat = total > 0 ? flatSessions[clamp(currentIndex)] : null;
  const currentSession = currentFlat?.session ?? null;
  const currentDay = currentFlat ? trip.days[currentFlat.dayIndex] : null;

  return {
    flatSessions,
    currentIndex: total > 0 ? clamp(currentIndex) : 0,
    currentSession,
    currentDay,
    isPlaying,
    next,
    prev,
    jumpTo,
    jumpToDay,
    play,
    pause,
    toggle,
  };
}
