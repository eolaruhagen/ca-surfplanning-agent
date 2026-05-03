/**
 * Placeholder for the live planning view.
 *
 * The intake form POSTs to /api/plan (an SSE stream) and routes here.
 * Wiring this page to consume the real SSE stream and render the
 * existing <LiveFeed /> panel is the next step. For now, this is a
 * stub so the submission flow doesn't 404.
 *
 * Once SSE wiring lands, this page should:
 *   1. Open an EventSource-equivalent to /api/plan with the same body
 *      (or accept the in-flight stream via context)
 *   2. Reduce events via useLiveFeed
 *   3. Render <LiveFeed state={state} /> + <CaliforniaMap overlay={...} />
 *   4. On `done` event, router.push(`/t/${trip_id}`)
 */
export default function PlanLivePage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-cream">
      <div className="surface-glass max-w-md p-8 text-center flex flex-col gap-3">
        <p className="text-display text-2xl text-stone-900">
          <span className="italic">Planning in progress…</span>
        </p>
        <p className="text-meta text-stone-500">
          Live-feed wiring lands next. The agents are working on your trip.
        </p>
      </div>
    </div>
  );
}
