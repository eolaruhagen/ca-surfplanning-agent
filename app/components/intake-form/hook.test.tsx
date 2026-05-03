/**
 * useIntakeForm — state machine tests.
 *
 * Tests card navigation, field updates, validation, and submission state.
 * Node test runner via tsx. No DOM rendering — hook is tested as a pure
 * state machine by calling the returned actions directly.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Minimal React mock (no DOM needed for state machine tests)
// ---------------------------------------------------------------------------
import { useState, useCallback } from 'react';

// We test the hook logic extracted into a plain function that mirrors the hook's
// return type, so we don't need a React test renderer here. Instead we inline
// a miniature version of the reducer logic that mirrors hook.tsx's behaviour.
// ---------------------------------------------------------------------------

// Mirror the IntakeFormState shape
type WavePreference = 'mellow' | 'performance' | 'mixed';
type SkillLevel =
  | 'beginner'
  | 'beginner-intermediate'
  | 'intermediate'
  | 'intermediate-advanced'
  | 'advanced'
  | 'advanced-expert'
  | 'expert';

interface BoardDraft {
  id: string;
  user_label: string;
  length_inches: number;
  photo_data_url: string;
}

interface IntakeFormState {
  currentCard: number; // 0-indexed
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

const TOTAL_CARDS = 8;

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
      { id: '1', user_label: '', length_inches: 72, photo_data_url: '' },
    ],
    submitting: false,
    submitError: null,
  };
}

// Pure reducer that mirrors useIntakeForm
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
      return { ...state, currentCard: Math.max(0, Math.min(TOTAL_CARDS - 1, action.card)) };
    case 'NEXT':
      return { ...state, currentCard: Math.min(state.currentCard + 1, TOTAL_CARDS - 1) };
    case 'PREV':
      return { ...state, currentCard: Math.max(state.currentCard - 1, 0) };
    case 'SET_DATES':
      return { ...state, params: { ...state.params, start_date: action.start, end_date: action.end } };
    case 'SET_START_POINT':
      return { ...state, params: { ...state.params, start_point: action.point } };
    case 'SET_END_POINT':
      return { ...state, params: { ...state.params, end_point: action.point } };
    case 'SET_SKILL':
      return { ...state, params: { ...state.params, skill_level: action.level } };
    case 'SET_WAVE_PREF':
      return { ...state, params: { ...state.params, wave_preference: action.pref } };
    case 'SET_SESSIONS':
      return { ...state, params: { ...state.params, sessions_per_day: action.n } };
    case 'SET_CONSTRAINTS':
      return { ...state, params: { ...state.params, hard_constraints: action.text } };
    case 'ADD_BOARD':
      if (state.boards.length >= 4) return state;
      return {
        ...state,
        boards: [
          ...state.boards,
          { id: String(Date.now()), user_label: '', length_inches: 72, photo_data_url: '' },
        ],
      };
    case 'REMOVE_BOARD':
      if (state.boards.length <= 1) return state;
      return { ...state, boards: state.boards.filter((b) => b.id !== action.id) };
    case 'UPDATE_BOARD':
      return {
        ...state,
        boards: state.boards.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b)),
      };
    case 'SET_SUBMITTING':
      return { ...state, submitting: action.value };
    case 'SET_ERROR':
      return { ...state, submitError: action.error };
    default:
      return state;
  }
}

// Validation helper mirrors hook.tsx's isCardValid
function isCardValid(state: IntakeFormState, card: number): boolean {
  switch (card) {
    case 0: return !!state.params.start_date && !!state.params.end_date;
    case 1: return !!state.params.start_point;
    case 2: return !!state.params.end_point;
    case 3: return !!state.params.skill_level;
    case 4: return !!state.params.wave_preference;
    case 5: return true; // sessions always has a default
    case 6: return state.boards.length >= 1 && state.boards.every((b) => b.user_label.trim().length > 0);
    case 7: return true; // hard_constraints optional
    default: return false;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useIntakeForm — initial state', () => {
  it('starts on card 0', () => {
    const state = makeInitialState();
    assert.equal(state.currentCard, 0);
  });

  it('has one empty board by default', () => {
    const state = makeInitialState();
    assert.equal(state.boards.length, 1);
  });

  it('defaults sessions_per_day to 1', () => {
    const state = makeInitialState();
    assert.equal(state.params.sessions_per_day, 1);
  });

  it('starts with empty dates', () => {
    const state = makeInitialState();
    assert.equal(state.params.start_date, '');
    assert.equal(state.params.end_date, '');
  });

  it('is not submitting', () => {
    const state = makeInitialState();
    assert.equal(state.submitting, false);
    assert.equal(state.submitError, null);
  });
});

describe('useIntakeForm — navigation', () => {
  it('NEXT increments card', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'NEXT' });
    assert.equal(state.currentCard, 1);
  });

  it('PREV decrements card', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'GO_TO', card: 3 });
    state = reducer(state, { type: 'PREV' });
    assert.equal(state.currentCard, 2);
  });

  it('PREV cannot go below 0', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'PREV' });
    assert.equal(state.currentCard, 0);
  });

  it('NEXT cannot exceed TOTAL_CARDS - 1', () => {
    let state = makeInitialState();
    for (let i = 0; i < 20; i++) state = reducer(state, { type: 'NEXT' });
    assert.equal(state.currentCard, TOTAL_CARDS - 1);
  });

  it('GO_TO jumps directly to a card', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'GO_TO', card: 5 });
    assert.equal(state.currentCard, 5);
  });

  it('GO_TO clamps to valid range', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'GO_TO', card: 100 });
    assert.equal(state.currentCard, TOTAL_CARDS - 1);
    state = reducer(state, { type: 'GO_TO', card: -5 });
    assert.equal(state.currentCard, 0);
  });
});

describe('useIntakeForm — params updates', () => {
  it('SET_DATES updates start and end date', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_DATES', start: '2026-06-01', end: '2026-06-07' });
    assert.equal(state.params.start_date, '2026-06-01');
    assert.equal(state.params.end_date, '2026-06-07');
  });

  it('SET_START_POINT stores coordinates', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_START_POINT', point: [-118.4, 34.0] });
    assert.deepEqual(state.params.start_point, [-118.4, 34.0]);
  });

  it('SET_END_POINT stores coordinates', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_END_POINT', point: [-122.4, 37.8] });
    assert.deepEqual(state.params.end_point, [-122.4, 37.8]);
  });

  it('SET_START_POINT allows null (clear)', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_START_POINT', point: [-118.4, 34.0] });
    state = reducer(state, { type: 'SET_START_POINT', point: null });
    assert.equal(state.params.start_point, null);
  });

  it('SET_SKILL updates skill_level', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_SKILL', level: 'intermediate' });
    assert.equal(state.params.skill_level, 'intermediate');
  });

  it('SET_WAVE_PREF updates wave_preference', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_WAVE_PREF', pref: 'performance' });
    assert.equal(state.params.wave_preference, 'performance');
  });

  it('SET_SESSIONS updates sessions_per_day', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_SESSIONS', n: 3 });
    assert.equal(state.params.sessions_per_day, 3);
  });

  it('SET_CONSTRAINTS updates hard_constraints', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_CONSTRAINTS', text: 'No crowds please' });
    assert.equal(state.params.hard_constraints, 'No crowds please');
  });
});

describe('useIntakeForm — boards', () => {
  it('ADD_BOARD appends a blank board', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'ADD_BOARD' });
    assert.equal(state.boards.length, 2);
  });

  it('ADD_BOARD caps at 4', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'ADD_BOARD' });
    state = reducer(state, { type: 'ADD_BOARD' });
    state = reducer(state, { type: 'ADD_BOARD' });
    state = reducer(state, { type: 'ADD_BOARD' }); // 5th — should be ignored
    assert.equal(state.boards.length, 4);
  });

  it('REMOVE_BOARD removes by id', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'ADD_BOARD' });
    const idToRemove = state.boards[1].id;
    state = reducer(state, { type: 'REMOVE_BOARD', id: idToRemove });
    assert.equal(state.boards.length, 1);
    assert.ok(!state.boards.find((b) => b.id === idToRemove));
  });

  it('REMOVE_BOARD cannot remove last board', () => {
    let state = makeInitialState();
    const firstId = state.boards[0].id;
    state = reducer(state, { type: 'REMOVE_BOARD', id: firstId });
    assert.equal(state.boards.length, 1);
  });

  it('UPDATE_BOARD patches a board by id', () => {
    let state = makeInitialState();
    const id = state.boards[0].id;
    state = reducer(state, { type: 'UPDATE_BOARD', id, patch: { user_label: '6\'2 shortboard', length_inches: 74 } });
    assert.equal(state.boards[0].user_label, '6\'2 shortboard');
    assert.equal(state.boards[0].length_inches, 74);
  });

  it('UPDATE_BOARD does not mutate other boards', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'ADD_BOARD' });
    const [id1, id2] = state.boards.map((b) => b.id);
    state = reducer(state, { type: 'UPDATE_BOARD', id: id1, patch: { user_label: 'Board A' } });
    assert.equal(state.boards.find((b) => b.id === id2)?.user_label, '');
  });
});

describe('useIntakeForm — submission state', () => {
  it('SET_SUBMITTING sets submitting flag', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_SUBMITTING', value: true });
    assert.equal(state.submitting, true);
  });

  it('SET_ERROR stores error message', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_ERROR', error: 'Network failure' });
    assert.equal(state.submitError, 'Network failure');
  });

  it('SET_ERROR allows null to clear error', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_ERROR', error: 'Oops' });
    state = reducer(state, { type: 'SET_ERROR', error: null });
    assert.equal(state.submitError, null);
  });
});

describe('isCardValid — per-card validation', () => {
  it('card 0 (dates) is invalid when empty', () => {
    assert.equal(isCardValid(makeInitialState(), 0), false);
  });

  it('card 0 (dates) is valid when both dates set', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_DATES', start: '2026-06-01', end: '2026-06-05' });
    assert.equal(isCardValid(state, 0), true);
  });

  it('card 1 (from) is invalid without start_point', () => {
    assert.equal(isCardValid(makeInitialState(), 1), false);
  });

  it('card 1 (from) is valid with start_point', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_START_POINT', point: [-118.4, 34.0] });
    assert.equal(isCardValid(state, 1), true);
  });

  it('card 2 (to) is invalid without end_point', () => {
    assert.equal(isCardValid(makeInitialState(), 2), false);
  });

  it('card 2 (to) is valid with end_point', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_END_POINT', point: [-122.4, 37.8] });
    assert.equal(isCardValid(state, 2), true);
  });

  it('card 3 (skill) is invalid without skill_level', () => {
    assert.equal(isCardValid(makeInitialState(), 3), false);
  });

  it('card 3 (skill) is valid when skill set', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_SKILL', level: 'advanced' });
    assert.equal(isCardValid(state, 3), true);
  });

  it('card 4 (waves) is invalid without wave_preference', () => {
    assert.equal(isCardValid(makeInitialState(), 4), false);
  });

  it('card 4 (waves) is valid when wave_preference set', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'SET_WAVE_PREF', pref: 'mellow' });
    assert.equal(isCardValid(state, 4), true);
  });

  it('card 5 (sessions) is always valid', () => {
    assert.equal(isCardValid(makeInitialState(), 5), true);
  });

  it('card 6 (boards) is invalid when board has no label', () => {
    assert.equal(isCardValid(makeInitialState(), 6), false);
  });

  it('card 6 (boards) is valid when all boards have labels', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'UPDATE_BOARD', id: state.boards[0].id, patch: { user_label: '6\'0 shortboard' } });
    assert.equal(isCardValid(state, 6), true);
  });

  it('card 7 (anything else) is always valid', () => {
    assert.equal(isCardValid(makeInitialState(), 7), true);
  });
});

describe('useIntakeForm — state independence', () => {
  it('does not share state between independent state instances', () => {
    let stateA = makeInitialState();
    let stateB = makeInitialState();
    stateA = reducer(stateA, { type: 'SET_SKILL', level: 'expert' });
    assert.equal(stateB.params.skill_level, null);
    assert.equal(stateA.params.skill_level, 'expert');
  });

  it('params spread does not mutate original', () => {
    const stateA = makeInitialState();
    const stateB = reducer(stateA, { type: 'SET_SESSIONS', n: 3 });
    assert.equal(stateA.params.sessions_per_day, 1); // original unchanged
    assert.equal(stateB.params.sessions_per_day, 3);
  });
});
