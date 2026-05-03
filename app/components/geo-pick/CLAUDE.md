# geo-pick — GeoPickMap component contract

Located at `app/components/geo-pick/`. Wraps a standalone MapGL instance for
single-point picking (start or end location). Does NOT modify CaliforniaMap.

## Files

```
app/components/geo-pick/
├── CLAUDE.md               # this file
├── geo-pick-map.tsx        # main component — MapGL + pin + bbox overlay
├── hook.tsx                # useGeoPick — pin state + reverse geocoding
├── hook.test.tsx           # state tests (no DOM)
└── helpers/
    ├── reverse-geocode.ts      # Mapbox Geocoding API wrapper
    └── reverse-geocode.test.ts # parse-logic tests
```

## Usage

```tsx
<GeoPickMap
  variant="start"  // "start" = green pin, "end" = red pin
  point={state.params.start_point}
  onPick={setStartPoint}
/>
```

## Constraints

- DO NOT import from CaliforniaMap.tsx — we do reuse buildMask from ./map/buildMask
- Uses react-map-gl/mapbox directly (same token, same style)
- Terrain exaggeration is NOT applied in this component (card context is too small)
- bbox overlay animates via CSS, not Mapbox animation API
- No spot markers, no spot list, no spot detail
