"use client";

/**
 * useIntakeForm — owns all 8-card state for the intake deck.
 *
 * State is a plain object reduced via useReducer for predictability.
 * Each card has its own validity check (isCardValid). Submission
 * runs PlanRequestSchema.parse before POSTing to /api/plan.
 */

import { useReducer, useCallback } from 'react';
import type { SkillLevel } from '@/lib/spots';
import type { PlanRequest } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WavePreference = 'mellow' | 'performance' | 'mixed';

export interface BoardDraft {
  id: string;
  user_label: string;
  length_inches: number;
  photo_data_url: string;
}

export interface IntakeFormState {
  currentCard: number; // 0-indexed, 0–7
  params: {
    start_date: string;
    end_date: string;
    start_point: [number, number] | null;
    end_point: [number, number] | null;
    skill_level: SkillLevel | null;
    wave_preference: WavePreference | null;
    sessions_per_day: 1 | 2 | 3;
    hard_constraints: string;
  };
  boards: BoardDraft[];
  submitting: boolean;
  submitError: string | null;
}

export const TOTAL_CARDS = 8;

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: 'GO_TO'; card: number }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SET_DATES'; start: string; end: string }
  | { type: 'SET_START_POINT'; point: [number, number] | null }
  | { type: 'SET_END_POINT'; point: [number, number] | null }
  | { type: 'SET_SKILL'; level: SkillLevel }
  | { type: 'SET_WAVE_PREF'; pref: WavePreference }
  | { type: 'SET_SESSIONS'; n: 1 | 2 | 3 }
  | { type: 'SET_CONSTRAINTS'; text: string }
  | { type: 'ADD_BOARD' }
  | { type: 'REMOVE_BOARD'; id: string }
  | { type: 'UPDATE_BOARD'; id: string; patch: Partial<Omit<BoardDraft, 'id'>> }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_ERROR'; error: string | null };

function reducer(state: IntakeFormState, action: Action): IntakeFormState {
  switch (action.type) {
    case 'GO_TO':
      return {
        ...state,
        currentCard: Math.max(0, Math.min(TOTAL_CARDS - 1, action.card)),
      };
    case 'NEXT':
      return { ...state, currentCard: Math.min(state.currentCard + 1, TOTAL_CARDS - 1) };
    case 'PREV':
      return { ...state, currentCard: Math.max(state.currentCard - 1, 0) };
    case 'SET_DATES':
      return {
        ...state,
        params: { ...state.params, start_date: action.start, end_date: action.end },
      };
    case 'SET_START_POINT':
      return {
        ...state,
        params: { ...state.params, start_point: action.point },
      };
    case 'SET_END_POINT':
      return {
        ...state,
        params: { ...state.params, end_point: action.point },
      };
    case 'SET_SKILL':
      return {
        ...state,
        params: { ...state.params, skill_level: action.level },
      };
    case 'SET_WAVE_PREF':
      return {
        ...state,
        params: { ...state.params, wave_preference: action.pref },
      };
    case 'SET_SESSIONS':
      return {
        ...state,
        params: { ...state.params, sessions_per_day: action.n },
      };
    case 'SET_CONSTRAINTS':
      return {
        ...state,
        params: { ...state.params, hard_constraints: action.text },
      };
    case 'ADD_BOARD':
      if (state.boards.length >= 4) return state;
      return {
        ...state,
        boards: [
          ...state.boards,
          {
            id: `board-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            user_label: '',
            length_inches: 72,
            photo_data_url: '',
          },
        ],
      };
    case 'REMOVE_BOARD':
      if (state.boards.length <= 1) return state;
      return { ...state, boards: state.boards.filter((b) => b.id !== action.id) };
    case 'UPDATE_BOARD':
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.id ? { ...b, ...action.patch } : b,
        ),
      };
    case 'SET_SUBMITTING':
      return { ...state, submitting: action.value };
    case 'SET_ERROR':
      return { ...state, submitError: action.error };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

function makeInitialState(): IntakeFormState {
  return {
    currentCard: 0,
    params: {
      start_date: '',
      end_date: '',
      start_point: null,
      end_point: null,
      skill_level: null,
      wave_preference: null,
      sessions_per_day: 1,
      hard_constraints: '',
    },
    boards: [
      {
        id: `board-initial-${Date.now()}`,
        user_label: '',
        length_inches: 72,
        photo_data_url: '',
      },
    ],
    submitting: false,
    submitError: null,
  };
}

// ---------------------------------------------------------------------------
// Card validity
// ---------------------------------------------------------------------------

export function isCardValid(state: IntakeFormState, card: number): boolean {
  switch (card) {
    case 0: // When — dates
      return !!state.params.start_date && !!state.params.end_date;
    case 1: // From — start point
      return !!state.params.start_point;
    case 2: // To — end point
      return !!state.params.end_point;
    case 3: // Skill level
      return !!state.params.skill_level;
    case 4: // Wave preference
      return !!state.params.wave_preference;
    case 5: // Sessions per day — always valid (has default)
      return true;
    case 6: // Boards — at least 1 with a label
      return (
        state.boards.length >= 1 &&
        state.boards.every((b) => b.user_label.trim().length > 0)
      );
    case 7: // Anything else — optional
      return true;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseIntakeFormReturn {
  state: IntakeFormState;
  // navigation
  goTo: (card: number) => void;
  next: () => void;
  prev: () => void;
  isCurrentValid: () => boolean;
  // params setters
  setDates: (start: string, end: string) => void;
  setStartPoint: (point: [number, number] | null) => void;
  setEndPoint: (point: [number, number] | null) => void;
  setSkill: (level: SkillLevel) => void;
  setWavePref: (pref: WavePreference) => void;
  setSessions: (n: 1 | 2 | 3) => void;
  setConstraints: (text: string) => void;
  // boards
  addBoard: () => void;
  removeBoard: (id: string) => void;
  updateBoard: (id: string, patch: Partial<Omit<BoardDraft, 'id'>>) => void;
  // submission
  buildPlanRequest: () => PlanRequest | null;
}

export function useIntakeForm(): UseIntakeFormReturn {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);

  const goTo = useCallback((card: number) => dispatch({ type: 'GO_TO', card }), []);
  const next = useCallback(() => dispatch({ type: 'NEXT' }), []);
  const prev = useCallback(() => dispatch({ type: 'PREV' }), []);
  const isCurrentValid = useCallback(
    () => isCardValid(state, state.currentCard),
    [state],
  );

  const setDates = useCallback(
    (start: string, end: string) => dispatch({ type: 'SET_DATES', start, end }),
    [],
  );
  const setStartPoint = useCallback(
    (point: [number, number] | null) => dispatch({ type: 'SET_START_POINT', point }),
    [],
  );
  const setEndPoint = useCallback(
    (point: [number, number] | null) => dispatch({ type: 'SET_END_POINT', point }),
    [],
  );
  const setSkill = useCallback(
    (level: SkillLevel) => dispatch({ type: 'SET_SKILL', level }),
    [],
  );
  const setWavePref = useCallback(
    (pref: WavePreference) => dispatch({ type: 'SET_WAVE_PREF', pref }),
    [],
  );
  const setSessions = useCallback(
    (n: 1 | 2 | 3) => dispatch({ type: 'SET_SESSIONS', n }),
    [],
  );
  const setConstraints = useCallback(
    (text: string) => dispatch({ type: 'SET_CONSTRAINTS', text }),
    [],
  );

  const addBoard = useCallback(() => dispatch({ type: 'ADD_BOARD' }), []);
  const removeBoard = useCallback(
    (id: string) => dispatch({ type: 'REMOVE_BOARD', id }),
    [],
  );
  const updateBoard = useCallback(
    (id: string, patch: Partial<Omit<BoardDraft, 'id'>>) =>
      dispatch({ type: 'UPDATE_BOARD', id, patch }),
    [],
  );

  const buildPlanRequest = useCallback((): PlanRequest | null => {
    const { params, boards } = state;
    if (
      !params.start_point ||
      !params.end_point ||
      !params.skill_level ||
      !params.wave_preference ||
      !params.start_date ||
      !params.end_date
    ) {
      return null;
    }
    return {
      params: {
        start_point: params.start_point,
        end_point: params.end_point,
        start_date: params.start_date,
        end_date: params.end_date,
        sessions_per_day: params.sessions_per_day,
        skill_level: params.skill_level,
        wave_preference: params.wave_preference,
        hard_constraints: params.hard_constraints,
      },
      boards: boards.map((b) => ({
        user_label: b.user_label,
        length_inches: b.length_inches,
        photo_data_url: b.photo_data_url,
      })),
    };
  }, [state]);

  return {
    state,
    goTo,
    next,
    prev,
    isCurrentValid,
    setDates,
    setStartPoint,
    setEndPoint,
    setSkill,
    setWavePref,
    setSessions,
    setConstraints,
    addBoard,
    removeBoard,
    updateBoard,
    buildPlanRequest,
  };
}
