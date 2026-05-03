# agent-icons — icon convention

## Stroke-only, no fills

All five agent icons use a consistent visual style:

- `fill: none`
- `stroke: currentColor`
- `stroke-width: 1.4`
- `stroke-linecap: round`
- `stroke-linejoin: round`
- No hard-coded colors — always `currentColor` so the parent controls color via CSS.

## ViewBox and default size

All icons use `viewBox="0 0 80 80"`. The default `size` prop is **64** (px), but props accept any size. The `OrchestratorIcon` is typically rendered at 60px (slightly smaller than the four specialists).

## Prop signature

```ts
type IconProps = { className?: string; size?: number };
```

Every icon component exports a default function matching this signature.

## Character SVGs

The five icons are figurative character drawings extracted from the v5 live-feed mockup:

| Icon | Character concept |
|---|---|
| `OrchestratorIcon` | Conductor figure with arms extended, crown of dots |
| `VisionIcon` | Figure with camera/binocular eye and surf scene backdrop |
| `ReconIcon` | Binocular-wielding figure standing above wave lines |
| `PlannerIcon` | Figure at a planning table with route lines |
| `NarratorIcon` | Figure at a speech podium with microphone capsule |

Each character uses a `viewBox="0 0 80 80"` coordinate space with paths scaled accordingly.

## How to add a new icon

1. Create `app/components/agent-icons/{Name}Icon.tsx`.
2. Implement as a named-default export following the prop signature above.
3. SVG must use `fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"`.
4. Export from `app/components/agent-icons/index.ts` and add to `REGISTRY`, `AGENT_COLOR`, `AGENT_LABEL`.

## Usage

```ts
import { agentIcon, AGENT_COLOR, AGENT_LABEL } from "@/app/components/agent-icons";

const Icon = agentIcon("recon");
// <Icon size={64} className="optional-class" />
```

The `agentIcon()` helper falls back to `OrchestratorIcon` for unrecognized agent names.
