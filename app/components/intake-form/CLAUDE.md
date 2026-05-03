# Intake Form Component Contract

Located at `app/components/intake-form/`. DO NOT modify without reading this file first.

## What it does

An 8-card horizontal scroll-snap "deck" that collects all `PlanRequest` fields
and POSTs to `/api/plan`. State lives in `useIntakeForm` (hook.tsx).

## Files

```
app/components/intake-form/
├── CLAUDE.md              # this file
├── deck.tsx               # scroll-snap rail; renders all 8 card components
├── hook.tsx               # useIntakeForm — form state machine
├── hook.test.tsx          # exhaustive state-machine tests (mandatory)
├── card-shell.tsx         # consistent card chrome (number + title + nav)
├── cards/
│   ├── when.tsx           # card 0 — custom date range picker
│   ├── when.hook.tsx      # useWhen — date range selection state
│   ├── when.hook.test.tsx
│   ├── from.tsx           # card 1 — GeoPickMap (start_point)
│   ├── to.tsx             # card 2 — GeoPickMap (end_point)
│   ├── skill.tsx          # card 3 — 7-tier skill selector
│   ├── waves.tsx          # card 4 — 3 illustrated wave-type cards
│   ├── sessions.tsx       # card 5 — 1/2/3 sessions per day
│   ├── boards.tsx         # card 6 — 1–4 boards sub-deck
│   ├── boards.hook.tsx    # useBoards — boards array + photo handling
│   ├── boards.hook.test.tsx
│   └── anything-else.tsx  # card 7 — textarea + helper chips
└── helpers/
    ├── downscale-image.ts      # canvas-based 1024px max downscale
    └── downscale-image.test.ts
```

## State ownership

- `useIntakeForm` owns ALL cross-card state (dates, points, skill, waves, sessions, boards, constraints)
- Each card receives setters from the parent `deck.tsx`; they do NOT own the top-level state
- Card-local UI state (e.g., calendar month view, chip hover) may live inline in the card component
- `useWhen` owns the two-click date range selection UI state
- `useBoards` owns the boards array within the board card

## Constraints

- DO NOT modify `app/components/map/CaliforniaMap.tsx` — wrap it via `<GeoPickMap />`
- DO NOT redefine schemas — import `PlanRequestSchema` from `@/lib/schemas`
- TypeScript strict; `npx tsc --noEmit` must be clean
- Reuse `surface-glass`, `text-display`, `ease-soft` etc. from `app/globals.css`
- Wave-line ambient SVG aesthetic: no fills on ambient SVGs, only strokes
