@AGENTS.md

# Project conventions (read both agents)

`ARCHITECTURE.md` is the canonical design reference. `AGENT-COORDINATION.md` is the cross-session scratchpad. This file collects short, durable conventions that apply to *every* change.

## Test-driven development (mandatory for non-trivial logic)

**Use the `superpowers:test-driven-development` skill before writing implementation for any non-trivial feature, tool, hook, or pure-logic module.** Skip TDD only for: trivial UI tweaks, types-only changes, configuration edits, and single-line bug fixes. For everything else (new tools, new agents, new hooks, parsing, scoring, route handlers): write the failing test first, then implement until it passes.

Test runner is built-in `node:test` invoked via `tsx`:

```bash
npm test                # unit tests (pure logic, parsers, tool execute, schemas)
npm run test:integration   # external-API tests (gated by SURFPLANNER_INTEGRATION=1)
npm run typecheck       # tsc --noEmit
```

Test file conventions:
- Unit/regression: `tests/<feature>.test.ts`
- External API integration: `tests/integration/<feature>.integration.test.ts` — skipped unless `SURFPLANNER_INTEGRATION=1` is set, so unit runs stay hermetic.
- Tests import source modules **without** `.ts` extensions (tsx resolves them).

## React component + hook co-location (UI agent)

Custom React hooks holding any non-trivial state **must exist as a separate file next to their consuming component, in a feature folder**. State that fits cleanly in `useState` inline is fine; anything beyond that — derived state, effects, multi-step interactions, anything you'd want to assert against — gets extracted into a hook.

Layout:

```
app/components/<feature-name>/
├── <component>.tsx       # render-only; consumes the hook's return value
├── hook.tsx              # exports useXxx(); owns state, effects, derivations
├── <component>.test.tsx  # render tests (optional)
└── hook.test.tsx         # state/behavior tests (mandatory if hook exists)
```

Example: a live planning view with streaming events:

```
app/components/live-feed/
├── live-feed.tsx         # renders feed entries from useLiveFeed()
├── hook.tsx              # exports useLiveFeed(url): { events, status, ... }
└── hook.test.tsx         # tests events accumulate, status transitions, errors surface
```

Why: a hook with testable state means the UI's behavior is verifiable without rendering DOM. Component tests can stay thin; the hook test is where regressions get caught.

Don't:
- Put state-heavy logic inline in a component without extracting a hook
- Mix two unrelated hooks in one `hook.tsx` (split the feature)
- Skip the hook test if the hook owns any state, async work, or derivations

## Cross-cutting

- TypeScript strict mode. Zod schemas in `lib/schemas.ts` are the source of truth for cross-boundary data; TS aliases in `lib/types.ts` via `z.infer`.
- `fetch` over libraries. No axios/node-fetch.
- Server actions for mutations, route handlers for streaming.
- Errors as values when expected (`{ ok: true, data } | { ok: false, error }`); throw for genuine bugs.
- Agents on cost-heavy MCPs (especially Google Maps) are rate-limited per request — see `lib/rate-limiter.ts`. Don't bypass.
- Before every push: run the secret-scan recipe in `AGENT-COORDINATION.md` "Git workflow".
