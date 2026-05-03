# Agent Coordination

Two Claude Code sessions are working this repo concurrently. This file is the shared scratchpad; both agents read it at session start and update the relevant section as needed. Keep entries terse — one or two lines per item, prefixed with `@UI` or `@Backend` and a date. Stale items get deleted, not crossed out.

---

## Roles & ownership

- **UI agent** — `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/plan/**`, `app/t/**`, `app/components/**`, `public/`, `lib/spots.ts`
- **Backend agent** — `lib/schemas.ts`, `lib/types.ts`, `lib/kv.ts`, `lib/mcp-clients.ts`, `lib/agent.ts`, `lib/vision.ts`, `lib/scoring.ts`, `lib/direction-utils.ts`, `lib/tools/**`, `lib/workflows/**`, `app/api/**`, `app/actions/**`, `scripts/**`
- **Shared (announce in this doc before editing)** — `package.json`, `tsconfig.json`, `next.config.ts`, `docker-compose.yml`, `.env.local.example`, `ARCHITECTURE.md`, `AGENT-COORDINATION.md`

## Decisions (locked, don't relitigate)

- **Skill levels = 7 values** per `lib/spots.ts SkillLevel`. ARCHITECTURE.md lists six; UI + data are authoritative.
- **Spot dataset lives at `public/spots.json`** (not `data/spots.json` per architecture) — the map needs to fetch it statically.
- **Type org**: Zod schemas in `lib/schemas.ts`, TS aliases in `lib/types.ts` via `z.infer`. `Spot` and `SkillLevel` are re-exported from `lib/spots.ts` so there's one source of truth for that UI-shared type.
- **Models route via Vercel AI Gateway**, not direct Anthropic API. Local: `AI_GATEWAY_API_KEY` in `.env.local`. Deployed: OIDC, no var needed.
- **AI SDK v6 removed `experimental_createMCPClient`** — backend uses `@modelcontextprotocol/sdk` directly + a small adapter to convert MCP `listTools()` into AI SDK `ToolSet`.
- **Long-running planner uses Vercel Workflows** so each step gets its own 60s function clock on Hobby. `lib/workflows/**`.
- **Mapbox `pk.eyJ...` is intentionally public** (`NEXT_PUBLIC_*`). Do NOT scan-block it. The genuinely-secret tokens are AI Gateway (`vck_`), Google Maps (`AIza...`), Anthropic (`sk-ant-`) if anyone re-adds it, and KV/Upstash tokens.
- **Components directory is `app/components/`**, not project-root `components/`.

## Contracts in flight

- _2026-05-03 @Backend_: next up — `lib/workflows/planTrip.ts` (Vercel Workflow with vision/discover/agent/export/save steps) and the streaming `POST /api/plan` route handler that drives it. Also need a small MCP→AI-SDK ToolSet adapter.

## Open questions / asks

_None right now._

## Recently shipped

- _2026-05-03 @Backend_: `lib/schemas.ts` + `lib/types.ts` — Zod source of truth for all shared shapes (`PlanRequest`, `BoardProfile`, `Spot`, `HourForecast`, `Session`, `TripDay`, `Trip`, `StreamEvent`, etc.). All 51 spots in `public/spots.json` parse cleanly. **UI agent: import shared types from `@/lib/types`.** `Spot` and `SkillLevel` are still exported from `lib/spots.ts` (and re-exported from `@/lib/types` for convenience).
- _2026-05-03 @Backend_: Next.js scaffold (TS + Tailwind v4 + App Router); runtime deps (`ai` v6, `workflow`, `@vercel/kv`, `redis`, `mapbox-gl`, `react-map-gl`, `zod`, `nanoid`); MCP SDK + 3 server packages; docker-compose Redis + commander; `lib/kv.ts` (dev/prod adapter, lazy connect); `lib/mcp-clients.ts` (3 stdio factories).
- _2026-05-03 @UI_: `<CaliforniaMap />` and panels at `app/components/map/`; `public/spots.json` + `public/california.geojson`; `lib/spots.ts` (Spot, MapOverlay, skillColor); Tailwind v4 design system in `app/globals.css` (`surface-glass`, `text-display`, `ease-soft`, `anim-*`, skill-color tokens).

---

## Git workflow

We commit and push from these sessions; the user is hands-off on git.

**Branch model.** `main` only. Two agents on parallel branches with frequent merges would add more conflict surface than it removes for this scale.

**Cadence.** Small, working units — one logical change per commit. Each commit MUST compile (`npx tsc --noEmit` clean) — a broken `main` blocks the other agent.

**Subject prefix.** `[backend]` or `[ui]` so the log shows ownership at a glance.

**Before every commit**

```bash
git pull --rebase origin main      # avoid stomping the other agent
npx tsc --noEmit                   # must be clean
git status                         # eyeball: nothing surprising staged
```

**Before every push (mandatory secret scan)**

```bash
# 1. No env file staged
git diff --cached --name-only | grep -E '^\.env(\.|/|$)' \
  | grep -v '^\.env\.local\.example$' \
  && { echo "BLOCK: env file staged"; exit 1; }

# 2. Grep diff for known secret formats
#    (Mapbox pk.eyJ... is intentionally NEXT_PUBLIC_ — exempted.)
git diff --cached -U0 \
  | grep -iE 'sk-ant-[a-z0-9_-]{20,}|AIza[a-zA-Z0-9_-]{35}|vck_[a-z0-9]{20,}|(UPSTASH_REDIS|KV_REST|KV_URL)[A-Z_]*=[a-z0-9_-]{20,}' \
  && { echo "BLOCK: possible secret in diff"; exit 1; }

# 3. Confirm no real .env file is tracked (only .env.local.example may be)
git ls-files | grep -E '^\.env(\.local|\.production|$)' | grep -v '\.example$' \
  && { echo "BLOCK: .env file tracked"; exit 1; }

# All clear → push
git push origin main
```

If any check fails: stop, fix, redo. **Do NOT `git commit --amend` or `git push -f` to "clean up" a leak** — once a key is in any commit it's compromised. Rotate the key first (AI Gateway: Vercel dashboard; Google Maps: Cloud Console; KV/Upstash: Upstash dashboard), then make a fresh commit and push.

**Conventional examples**
- `[backend] add Zod schemas for trip + stream events`
- `[backend] fix lib/kv.ts: add del, return Promise<void>`
- `[ui] wire trip-list cards to TripDay schema`
- `[ui] panel slide-out polish`

**Co-author footer.** Both agents include in commit body:
```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Hard don'ts**
- `git push --force` to `main`, ever.
- `git rebase -i` (broken in non-TTY).
- `git commit --no-verify` to bypass hooks.
- Stage `node_modules/`, `.next/`, `.env*` (real env files). The .gitignore already excludes these — verify with `git status` before staging anyway.
- Delete the other agent's files.
