# Map UI Spec — `app/components/map/`

This is the core map UI for the California Surf Planner. The agent will read,
filter, highlight, and overlay onto this surface as the user refines a trip.
**Treat this as a contract — keep it stable, extend via props, don't fork it.**

---

## 1. Visual language ("SF startup" — minimalist, light)

| Token                  | Value          | Where                                |
| ---------------------- | -------------- | ------------------------------------ |
| Background             | `#fafaf7`      | `--color-background`, `--color-cream` |
| Foreground             | `#1c1917`      | `--color-foreground`                 |
| Surface (glass)        | `rgb(255 255 255 / 0.85)` + blur 12px | `surface-glass`           |
| Surface (strong)       | `rgb(255 255 255 / 0.90)` + blur 12px | `surface-glass-strong`    |
| Surface (pill button)  | `rgb(255 255 255 / 0.80)` + blur 8px  | `surface-pill`            |
| Soft shadow            | `0 8px 30px rgb(0 0 0 / 0.04)` | `--shadow-soft` (md / lg variants) |
| Display font           | Instrument Serif (italic-friendly) | `text-display` / `text-display-italic` |
| Body font              | Geist Sans     | `font-sans` (default)                 |
| Eyebrow                | 10px upper, tracking 0.08em, stone-400 | `text-eyebrow`           |
| Meta                   | 11px stone-500 | `text-meta`                           |

**Skill-level palette (also data colors):** `--color-skill-{beginner,beginner-intermediate,intermediate,intermediate-advanced,advanced,advanced-expert,expert}` — paired with `skillColor()` from `@/lib/spots`.

**Mode:** light only. Don't add a dark mode toggle without re-evaluating the mask
overlay (which assumes a pale outside-CA fill).

---

## 2. Motion

All UI motion uses one easing: `--ease-soft` = `cubic-bezier(0.32, 0.72, 0.3, 1)`.
Available as the Tailwind utility `ease-soft`.

| Animation         | Duration | Use                                 |
| ----------------- | -------- | ----------------------------------- |
| `anim-panel-in-left`  | 320ms | Left side panels (Spots list)       |
| `anim-panel-in-right` | 320ms | Right side panels (Spot detail)     |
| `anim-fade-in`        | 220ms | Subtle reveals                      |
| `anim-pop-in`         | 220ms | Markers, chips, popovers            |
| Marker hover/select   | 180ms | `.spot-dot` transform               |
| `flyTo`               | 900ms | Map camera, easing handled by mapbox|

The list and detail panels also use a Tailwind `transition-all duration-300
ease-soft` for the slide-and-fade open/close (so they animate both directions).

---

## 3. Layout grid

```
┌──────────────────────────────── viewport ────────────────────────────────┐
│  Header (px-6 pt-5, z-30, pointer-events-none wrapper)                    │
│  ┌──────────────┐                                       ┌──────────────┐ │
│  │  Spot list   │                                       │ Spot detail  │ │
│  │  w-72 left-6 │           MAPBOX (full bleed)         │ w-80 right-6 │ │
│  │  top-20      │                                       │ top-20       │ │
│  │  bottom-6    │                                       │ bottom-6     │ │
│  │  z-20        │                                       │ z-20         │ │
│  └──────────────┘                                       └──────────────┘ │
│                                            Nav control (bottom-right)   │
└─────────────────────────────────────────────────────────────────────────┘
```

- Map fills the viewport. Panels float above with `surface-glass`.
- Outside-California is dimmed by a polygon mask (world rect with CA holes).
- California outline at `#1c1917` opacity 0.5, weight 1.
- Map is bounded to roughly CA: SW `[-125.0, 32.3]`, NE `[-113.5, 42.2]`.

---

## 4. Component contract — `<CaliforniaMap />`

Located at `app/components/map/CaliforniaMap.tsx`. It is a **client component**
loaded via `next/dynamic({ ssr: false })` from `app/page.tsx` (Mapbox GL needs
`window`).

```ts
type CaliforniaMapProps = {
  spots?: Spot[];                    // override bundled /spots.json
  selectedSpotId?: string | null;    // controlled selection (parent drives it)
  onSpotSelect?: (id: string | null, spot: Spot | null) => void;
  overlay?: MapOverlay;              // highlights, trip days, route polyline
  showSpotList?: boolean;            // default true
  showSpotDetail?: boolean;          // default true
  header?: React.ReactNode;          // override; pass null to hide
};

type MapOverlay = {
  selectedSpotId?: string | null;
  highlightedSpotIds?: string[];      // dims everything not in this set
  tripDays?: { spotId: string; dayIndex: number; label?: string }[];
  routeGeoJSON?: GeoJSON.FeatureCollection | GeoJSON.Feature | null;
};
```

**Selection model.** If `selectedSpotId` is passed (even `null`), the component
runs in **controlled mode**: parent owns selection, map fires `onSpotSelect`.
If omitted, the map self-manages selection internally. Either way, picking a
spot triggers `flyTo` via the internal `MapRef`.

**Extension points for the agent:**
- Filter the marker set → pass a subset via `spots`.
- Highlight a candidate set → `overlay.highlightedSpotIds` (others dim to 35%).
- Render the day-by-day driving route → `overlay.routeGeoJSON` (LineString).
- Replace the header with a trip title, day picker, etc. → `header`.
- Hide the default panels and render your own UI on top → `showSpotList=false` / `showSpotDetail=false`.

---

## 5. Files

```
app/components/map/
├── CLAUDE.md              # this file
├── CaliforniaMap.tsx      # main component, owns the Mapbox instance
├── SpotList.tsx           # left-side glass panel
├── SpotDetail.tsx         # right-side glass panel
└── buildMask.ts           # outside-CA mask polygon helper

lib/spots.ts               # Spot type, MapOverlay type, SKILL_COLORS, skillColor()
public/spots.json          # static spot dataset (ships with build)
public/california.geojson  # CA boundary (ships with build)
```

---

## 6. Reusable utilities (defined in `app/globals.css`)

These are **app-wide** — use them anywhere, not just on the map:

**Surfaces:** `surface-glass`, `surface-glass-strong`, `surface-pill`
**Typography:** `text-display`, `text-display-italic`, `text-eyebrow`, `text-meta`
**Motion:** `ease-soft`, `anim-panel-in-left`, `anim-panel-in-right`, `anim-fade-in`, `anim-pop-in`
**Theme colors:** `bg-cream`, `bg-cream-soft`, `text-skill-beginner`, `bg-skill-expert`, etc.
**Shadows:** `shadow-soft`, `shadow-soft-md`, `shadow-soft-lg` (via `--shadow-soft*` tokens)

When building new screens (trip view, share page, agent chat panel) **reuse
these utilities first** before introducing new ones. Adding a new utility means
editing `globals.css` and updating this doc.

---

## 7. Environment

`NEXT_PUBLIC_MAPBOX_TOKEN` must be set in `.env.local` for the map tiles to
render. The component falls back to an empty string, which Mapbox rejects with
a console error (intentional — fail loud rather than silently render gray tiles).

---

## 8. Don't

- Don't add map providers other than Mapbox GL (the spec in
  `spec-addendum-v3.md` §2.3 is explicit: Mapbox for UI, Google for server-side
  routing via MCP).
- Don't fork `CaliforniaMap` per use case — extend via props/overlay instead.
- Don't bypass `flyTo` with imperative `setCenter` calls; the easing is part of
  the brand.
- Don't introduce a CSS framework on top of Tailwind v4 (no styled-components,
  no shadcn, no chakra). Single-source styling via `globals.css` + Tailwind.
