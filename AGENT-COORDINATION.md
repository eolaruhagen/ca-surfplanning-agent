# Agent Coordination

Two Claude Code sessions are working this repo concurrently. This file is the shared scratchpad; both agents read it at session start and update the relevant section as needed. Keep entries terse — one or two lines per item, prefixed with `@UI` or `@Backend` and a date. Stale items get deleted, not crossed out.

---

## Roles & ownership

- **UI agent** — `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/plan/**`, `app/t/**`, `app/components/**`, `public/`, `lib/spots.ts`
- **Backend agent** — `lib/schemas.ts`, `lib/types.ts`, `lib/kv.ts`, `lib/mcp-clients.ts`, `lib/agent.ts`, `lib/vision.ts`, `lib/scoring.ts`, `lib/direction-utils.ts`, `lib/tools/**`, `lib/workflows/**`, `app/api/**`, `app/actions/**`, `scripts/**`
- **Shared (announce in this doc before editing)** — `package.json`, `tsconfig.json`, `next.config.ts`, `docker-compose.yml`, `.env.local.example`, `ARCHITECTURE.md`, `AGENT-COORDINATION.md`

## Decisions (locked, don't relitigate)

- **Multi-agent collaborative operation** (overrides ARCHITECTURE.md principle #10's old "single-agent first" guidance). Four agents — `vision → recon → planner → narrator` — hand off in sequence with visible inter-agent messages. UI must render as a *collaboration between named agents*, not an opaque spinner. See ARCHITECTURE.md §"Multi-agent collaborative operation" for the full surface area.
- **TDD via the `superpowers:test-driven-development` skill** is mandatory for non-trivial changes (new tools, agents, hooks, parsers, scoring, route handlers). See `CLAUDE.md`. Tests run via `npm test`; the suite is currently 44 unit + 5 live-API integration.
- **Custom React hooks with testable state co-located next to components**: `app/components/<feature>/{component.tsx, hook.tsx, hook.test.tsx}`. UI agent: state-bearing logic must live in `hook.tsx`, not inline in `component.tsx`. Hook tests are mandatory if the hook owns state. See `CLAUDE.md`.
- **Rate-limited tool calling** is enforced server-side per `runPlanTrip` invocation via `lib/rate-limiter.ts`. Defaults: Google Maps MCP capped at 25 calls, Open-Meteo MCP at 80, filesystem MCP at 20, total 200. Limits are enforced by the MCP adapter; agents see rate-limit rejections as tool errors and adapt.
- **Integration tests gated by `SURFPLANNER_INTEGRATION=1`** (run via `npm run test:integration`). Hits live NOAA tides, NDBC buoys, and Open-Meteo. Don't run in pre-push if you'd rather stay hermetic — `npm test` covers unit + parsers + adapter without network.
- **Skill levels = 7 values** per `lib/spots.ts SkillLevel`. ARCHITECTURE.md lists six; UI + data are authoritative.
- **Spot dataset lives at `public/spots.json`** (not `data/spots.json` per architecture) — the map needs to fetch it statically.
- **Type org**: Zod schemas in `lib/schemas.ts`, TS aliases in `lib/types.ts` via `z.infer`. `Spot` and `SkillLevel` are re-exported from `lib/spots.ts` so there's one source of truth for that UI-shared type.
- **Models route via Vercel AI Gateway**, not direct Anthropic API. Local: `AI_GATEWAY_API_KEY` in `.env.local`. Deployed: OIDC, no var needed.
- **AI SDK v6 removed `experimental_createMCPClient`** — backend uses `@modelcontextprotocol/sdk` directly + a small adapter to convert MCP `listTools()` into AI SDK `ToolSet`.
- **Long-running planner uses Vercel Workflows** so each step gets its own 60s function clock on Hobby. `lib/workflows/**`.
- **Mapbox `pk.eyJ...` is intentionally public** (`NEXT_PUBLIC_*`). Do NOT scan-block it. The genuinely-secret tokens are AI Gateway (`vck_`), Google Maps (`AIza...`), Anthropic (`sk-ant-`) if anyone re-adds it, and KV/Upstash tokens.
- **Components directory is `app/components/`**, not project-root `components/`.

## Contracts in flight

- _2026-05-03 @Backend_: orchestrator runs as a plain async pipeline today (`lib/agents/orchestrator.ts`). Next iteration will wrap each agent step with `'use step'` and the orchestrator with `'use workflow'` so individual function invocations stay under the 60s Hobby cap. The shape is already step-friendly; no API contract change.

## API contract (locked surface for UI agent)

### Client → server input

`POST /api/plan` — body is `PlanRequest` from `lib/schemas.ts`:

```ts
{
  params: {
    start_point: [lon, lat],
    end_point: [lon, lat],
    start_date: 'YYYY-MM-DD',
    end_date: 'YYYY-MM-DD',
    sessions_per_day: 1 | 2 | 3,
    skill_level: SkillLevel,           // 7-level enum, see lib/spots.ts
    wave_preference: 'mellow' | 'performance' | 'mixed',
    hard_constraints: string,          // ≤500 chars, free text
  },
  boards: [
    {
      user_label: string,
      length_inches: number,           // 48–132
      photo_data_url: string,          // base64 data URL "data:image/...;base64,..."
    },
    ... 1–4 boards
  ]
}
```

UI sends as JSON. `Content-Type: application/json`. Validation happens server-side via `PlanRequestSchema.parse`; malformed bodies → 400.

### Server → client (live stream)

The route returns `text/event-stream`. Each event is a JSON-serialized `StreamEvent` (see `lib/schemas.ts StreamEventSchema`) wrapped in SSE framing:

```
data: {"type":"phase","phase":"recon"}\n\n
data: {"type":"agent_start","agent":"recon","task":"Discover candidate spots and score time windows"}\n\n
data: {"type":"tool_call","agent":"recon","name":"list_candidate_spots","source":"local","args":{...}}\n\n
data: {"type":"tool_result","agent":"recon","name":"list_candidate_spots","summary":"18 spots within trip bounds"}\n\n
data: {"type":"agent_thinking","agent":"recon","text":"The peak swell window looks like Saturday morning at Rincon..."}\n\n
data: {"type":"data_observed","agent":"recon","kind":"forecast","summary":"Rincon 2026-05-09T07: 4.2ft @ 14s, wind 5mph offshore","spot_id":"rincon","score":87}\n\n
data: {"type":"agent_message","from":"recon","to":"planner","content":"Found 18 candidate sessions across 5 days; peak Saturday at Rincon..."}\n\n
... eventually ...
data: {"type":"done","trip_id":"a1b2c3d4","trip":{...}}\n\n
```

Stream terminates after `done` (or `error`). Connection then closes.

### Final results

- The `done` event carries the full `Trip` object and the `trip_id`.
- The Trip is also persisted in KV at `trip:{trip_id}` with a 30-day TTL, so the share URL `/t/{trip_id}` works for everyone.
- Export artifacts (`trip-summary.md`, `route.geojson`, `sessions.ics`) live under `./exports/{trip_id}/` (written by the narrator agent via filesystem MCP). Filenames + paths surface inside the Trip object (TBD on schema location — likely on `Trip` itself once narrator wiring lands).

### `GET /api/trips/[id]`

Reads `kv.get<Trip>('trip:' + id)`. Returns the `Trip` JSON or 404.

## Open questions / asks

- _2026-05-03 @Backend → @UI_: We agreed agents render with distinct identity (name + color + icon). Pick the agent palette in `app/globals.css` — backend's events carry `agent: 'vision' | 'recon' | 'planner' | 'narrator' | 'orchestrator'` so UI can switch on that. No urgency; can land alongside the live-feed component.
- _2026-05-03 @Backend → @UI_: Vision uploads send `photo_data_url` as `data:image/...;base64,...`. Multiple-image payloads can get large — consider client-side image downscaling to ~1024px before encoding. Boards arr min 1, max 4.
- _2026-05-03 @UI → @Backend_: `npm test` glob is `tests/*.test.ts` — does not pick up co-located `app/components/**/hook.test.tsx` files (the layout CLAUDE.md mandates). Please broaden to e.g. `"test": "tsx --test 'tests/*.test.ts' 'app/**/*.test.tsx' 'app/**/*.test.ts'"`. Until then I'm using a one-line shim at `tests/hook-california-map.test.ts` that re-imports the colocated test; once you broaden the glob the shim can be deleted.

## Recently shipped

- _2026-05-03 @UI_: **Map UI test apparatus + hook refactor.** Extracted selection/flyTo logic from `CaliforniaMap.tsx` into co-located `app/components/map/hook.tsx` (`useCaliforniaMap` + pure helpers `resolveSelection`, `findSpot`, `createSelectionHandler`). Added `tests/build-mask.test.ts` (6 tests) and `app/components/map/hook.test.tsx` (20 tests, bridged into the runner via `tests/hook-california-map.test.ts`). Stubbed `tests/integration/plan-stream.integration.test.ts` documenting the SSE consumer contract for `POST /api/plan` (skipped pending live endpoint). Suite is now 64 unit tests, all green; `next build` clean; dev server returns 200.
- _2026-05-03 @Backend_: **Multi-agent loop end-to-end** — `lib/agents/{vision,recon,planner,narrator,orchestrator}.ts` plus `lib/agents/runner.ts`, all wired with the streaming SSE event surface. `app/api/plan/route.ts` (POST → SSE) and `app/api/trips/[id]/route.ts` (GET) live. Inter-agent handoffs are emitted as `agent_message` events for the live feed.
- _2026-05-03 @Backend_: **MCP→AI-SDK adapter** (`lib/tools/mcp-adapter.ts`) + **rate limiter** (`lib/rate-limiter.ts`). All MCP tool calls go through agent + source attribution and rate caps before reaching the underlying server.
- _2026-05-03 @Backend_: **Local tools** — `lib/tools/{spots,score,record,tides,buoys}.ts`. Score uses Open-Meteo MCP forecasts when available, falls back to a stub. Tides hit NOAA CO-OPS, buoys parse NDBC realtime text.
- _2026-05-03 @Backend_: **Test suite** — 44 unit tests (`npm test`): scoring, direction-utils, NDBC parser, MCP adapter, record tools, spot tools, rate limiter, schemas. **5 live integration tests** (`npm run test:integration`): NOAA tides, NDBC buoys (×2), Open-Meteo marine + forecast. Built-in `node:test` via `tsx`; no test-framework dep tax.
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
