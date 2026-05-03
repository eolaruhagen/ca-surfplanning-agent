# live-feed component — design notes

## Five agent identities and palette colors

| Agent | Key | CSS var | Hex |
|---|---|---|---|
| Orchestrator | `orchestrator` | `--agent-orchestrator` | `#1c1917` (stone-900) |
| Vision | `vision` | `--agent-vision` | `#0891b2` (cyan-600) |
| Recon | `recon` | `--agent-recon` | `#d97706` (amber-600) |
| Narrator | `narrator` | `--agent-narrator` | `#16a34a` (green-600) |
| Planner | `planner` | `--agent-planner` | `#4f46e5` (indigo-600) |

Colors are declared in `app/globals.css` as both CSS custom props (`--agent-*`) and Tailwind theme tokens (`--color-agent-*`). The `AGENT_COLOR` map in `app/components/agent-icons/index.ts` maps `AgentName` → CSS var string.

## Panel layout

`live-feed.tsx` renders a two-row stage:

1. **Orchestrator row** — centered, width 220px.
2. **Specialists grid** — 4 columns: vision / recon / planner / narrator.

The specialists grid has `position: relative` so `InterAgentArcOverlay` (an SVG) can sit absolutely over it with `z-index: 8`.

## State machine (AgentPanelState)

Each agent card derives a 5-way `panelState` from its lifecycle state and tool activity:

| `panelState` | When | Visual treatment |
|---|---|---|
| `idle` | Not yet started | 55% opacity, placeholder dot + text |
| `queued` | `agent_start` received, no thinking/tool yet | Same as idle, pill shows "queued" |
| `thinking` | `agent_thinking` event arrived, no in-flight tool | Accent border + shadow, italic streaming text + blinking cursor |
| `action` | At least one unresolved `tool_call` | `thinking` treatment + active tool chip(s) |
| `done` | `agent_finish` received | ✓ + summary text + last observation chip |

Transitions are computed in `computePanelState()` in `hook.tsx`. The reducer recomputes panel state on every relevant event (`agent_start`, `agent_thinking`, `agent_finish`, `tool_call`, `tool_result`).

Character SVG animation by state:
- `idle` / `queued` → `idle-float` (gentle bob)
- `thinking` → `breathe 2.6s`
- `action` → `breathe 1.4s` (faster)
- `done` → no animation

Halo ring (CSS pseudo-element via inline style):
- `thinking` → faint ring at inset -3px, opacity 0.2, `halo-pulse`
- `action` → stronger ring at inset -6px, opacity 0.32, `halo-pulse-action`

All keyframes live in `app/globals.css` (`idle-float`, `breathe`, `halo-pulse`, `halo-pulse-action`, `cursor-blink`, `tool-spin`).

## Consultation pattern rendering

### consultedBy overlay (per-card)

When `consultation_start` fires, the hook sets `agents[consultee].consultedBy = { initiator, correlation_id, topic }`. `agent-card.tsx` renders:

- A dashed indigo frame (`border: 1.4px dashed var(--agent-planner), opacity 0.45`) overlaid on the card.
- A ribbon pill (`CONSULTED · {correlation_id}`) at `top: -9px, left: 50%` — rides above the card top edge. The card must NOT have `overflow: hidden`.

On `consultation_end`, `consultedBy` is cleared and the overlay disappears.

### Inter-agent arcs (between cards)

`inter-agent-arc.tsx` renders an SVG layer absolutely over the specialists grid. Fresh messages (< 3.2s old) draw arcs with a lifecycle animation: fade-in (0–20%), hold (20–70%), fade-out (70–100%).

Arc styles by `kind`:
- `handoff` — stone-300, 1px, dashed 3 3, no label
- `question` — indigo (planner), 1.2px, dashed 4 3, label "QUESTION · {correlation_id}"
- `answer` — amber (recon), 1.2px, dashed 4 3, label "ANSWER · {correlation_id}"
- `note` — stone-300 subtle, no label

The arc renderer needs `message.timestamp` (a real `Date.now()` value set by the reducer) and uses `requestAnimationFrame` to recompute opacity. Arcs are removed from the DOM when `age >= ARC_LIFETIME_MS` (3200ms).

### recentMessages vs conversation

`state.recentMessages` holds all `AgentMessage` entries with real `timestamp` values. The arc renderer reads from `recentMessages`. `state.conversation` is an alias to the same array (same reference). For arc freshness, use `timestamp`; for ordering in any list view, use `index`.

## How to add a new agent identity

1. **Palette** — add `--agent-{name}: #hex;` in `:root {}` in `app/globals.css`, and `--color-agent-{name}: #hex;` in `@theme inline {}`.
2. **AgentName schema** — edit `AgentNameSchema` in `lib/schemas.ts` (backend owns this; file an `@UI → @Backend` ask in `AGENT-COORDINATION.md` if needed).
3. **Icon** — create `app/components/agent-icons/{Name}Icon.tsx` following the stroke-only convention (see `app/components/agent-icons/CLAUDE.md`).
4. **Registry** — add to `REGISTRY`, `AGENT_COLOR`, `AGENT_LABEL` in `app/components/agent-icons/index.ts`.
5. **Hook** — add to `ALL_AGENTS` in `hook.tsx` so `emptyAgents()` initializes it.
6. **Placeholder text** — add to `AGENT_PLACEHOLDER` in `agent-card.tsx`.
7. **Panel order** — if a specialist, add to `SPECIALIST_ORDER` in `live-feed.tsx`. If an orchestrator-style singleton, add an `orch-row` equivalent.
8. **Tests** — update `hook.test.tsx` to assert the new agent's idle state is initialized.
