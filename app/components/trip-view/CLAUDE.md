# trip-view — cinematic walkthrough component

Renders the trip results at `/t/[id]`. Cinematic walkthrough with Mapbox terrain at pitch ~60°, sequential flyTo between sessions, narrator speech bubble showing each session's `pick_reason`.

## Hook: `useTripView(trip)`

All stateful logic lives in `hook.tsx`. `trip-view.tsx` is render-only.

## Files

```
app/components/trip-view/
├── CLAUDE.md           # this file
├── trip-view.tsx       # render-only, consumes useTripView
├── hook.tsx            # useTripView hook
├── hook.test.tsx       # mandatory TDD tests
├── speech-bubble.tsx   # narrator portrait + pick_reason bubble
├── day-rail.tsx        # horizontal day chips
├── nav-controls.tsx    # prev/next/play UI
├── pitch-toggle.tsx    # 2D/3D toggle
└── session-marker.tsx  # numbered pin component
```

## Design

Reuse design system tokens: `surface-glass`, `text-display`, `text-display-italic`, `ease-soft`.
Auto-advance every 4500ms. flyTo zoom 12, pitch 60, duration 1800ms per session.
pick_reason ≤160 chars — shown in speech bubble.
