"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanRequestSchema } from "@/lib/schemas";
import { useIntakeForm, TOTAL_CARDS } from "./hook";

import WhenCard from "./cards/when";
import FromCard from "./cards/from";
import ToCard from "./cards/to";
import SkillCard from "./cards/skill";
import WavesCard from "./cards/waves";
import SessionsCard from "./cards/sessions";
import BoardsCard from "./cards/boards";
import AnythingElseCard from "./cards/anything-else";

/**
 * Deck — the intake form's outer chrome and navigation.
 * Renders the current card (anim-fade-in on each transition),
 * progress dots, and prev/next/submit controls.
 *
 * On submit: builds PlanRequest, validates via PlanRequestSchema,
 * POSTs to /api/plan, and navigates to /plan/live.
 */
export default function Deck() {
  const form = useIntakeForm();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLast = form.state.currentCard === TOTAL_CARDS - 1;
  const isFirst = form.state.currentCard === 0;
  const canAdvance = form.isCurrentValid();

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    const req = form.buildPlanRequest();
    if (!req) {
      setSubmitError("Form is incomplete — go back and fill any missing fields.");
      return;
    }
    const parsed = PlanRequestSchema.safeParse(req);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Server returned ${res.status}: ${txt.slice(0, 120)}`);
      }
      // The /api/plan response is an SSE stream consumed by /plan/live.
      // For now, navigate there; live-feed wiring to real SSE is a follow-up.
      router.push("/plan/live");
    } catch (err) {
      setSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : "Submission failed.");
    }
  }, [form, router]);

  const handleSameAsStart = useCallback(() => {
    if (form.state.params.start_point) {
      form.setEndPoint(form.state.params.start_point);
    }
  }, [form]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-cream py-10 px-4">
      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: TOTAL_CARDS }, (_, i) => {
          const active = i === form.state.currentCard;
          const visited = i < form.state.currentCard;
          return (
            <button
              key={i}
              type="button"
              onClick={() => form.goTo(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ease-soft ${
                active
                  ? "w-8 bg-stone-900"
                  : visited
                    ? "w-3 bg-stone-500"
                    : "w-3 bg-stone-300"
              }`}
            />
          );
        })}
      </div>

      {/* Current card (key triggers re-mount + fade-in animation) */}
      <div key={form.state.currentCard} className="anim-fade-in w-full flex justify-center">
        {renderCard(form, handleSameAsStart)}
      </div>

      {/* Footer nav */}
      <div className="flex items-center gap-3 mt-8">
        <button
          type="button"
          onClick={form.prev}
          disabled={isFirst}
          className="surface-pill px-4 py-2 text-sm text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all ease-soft"
        >
          ← Back
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 text-sm font-medium text-white bg-stone-900 rounded-full hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all ease-soft"
          >
            {submitting ? "Planning…" : "Plan my trip →"}
          </button>
        ) : (
          <button
            type="button"
            onClick={form.next}
            disabled={!canAdvance}
            className="px-6 py-2 text-sm font-medium text-white bg-stone-900 rounded-full disabled:bg-stone-300 disabled:cursor-not-allowed transition-all ease-soft hover:bg-stone-800"
          >
            Next →
          </button>
        )}
      </div>

      {submitError && (
        <p className="mt-4 text-sm text-red-600 anim-fade-in max-w-md text-center">
          {submitError}
        </p>
      )}
    </div>
  );
}

function renderCard(
  form: ReturnType<typeof useIntakeForm>,
  onSameAsStart: () => void,
) {
  const { state } = form;
  switch (state.currentCard) {
    case 0:
      return (
        <WhenCard
          startDate={state.params.start_date}
          endDate={state.params.end_date}
          onDatesChange={form.setDates}
        />
      );
    case 1:
      return (
        <FromCard
          point={state.params.start_point}
          onPick={form.setStartPoint}
        />
      );
    case 2:
      return (
        <ToCard
          point={state.params.end_point}
          startPoint={state.params.start_point}
          onPick={form.setEndPoint}
          onSameAsStart={onSameAsStart}
        />
      );
    case 3:
      return (
        <SkillCard
          value={state.params.skill_level}
          onChange={form.setSkill}
        />
      );
    case 4:
      return (
        <WavesCard
          value={state.params.wave_preference}
          onChange={form.setWavePref}
        />
      );
    case 5:
      return (
        <SessionsCard
          value={state.params.sessions_per_day}
          onChange={form.setSessions}
        />
      );
    case 6:
      return (
        <BoardsCard
          boards={state.boards}
          addBoard={form.addBoard}
          removeBoard={form.removeBoard}
          updateBoard={form.updateBoard}
        />
      );
    case 7:
      return (
        <AnythingElseCard
          value={state.params.hard_constraints}
          onChange={form.setConstraints}
        />
      );
    default:
      return null;
  }
}
