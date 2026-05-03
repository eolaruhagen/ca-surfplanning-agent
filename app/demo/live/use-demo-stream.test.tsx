import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DEMO_LOOP_MS,
  DEMO_TIMELINE,
  DEMO_ROUTE_GEOJSON,
  stepsBetween,
} from "./use-demo-stream";
import { deriveLiveFeedState } from "../../components/live-feed/hook";

describe("DEMO_TIMELINE — shape", () => {
  it("stays inside the 16-second loop window", () => {
    for (const s of DEMO_TIMELINE) {
      assert.ok(
        s.atMs >= 0 && s.atMs < DEMO_LOOP_MS,
        `step ${s.event.type} @${s.atMs}ms is out of [0, ${DEMO_LOOP_MS})`,
      );
    }
  });

  it("steps are in non-decreasing time order", () => {
    for (let i = 1; i < DEMO_TIMELINE.length; i++) {
      assert.ok(
        DEMO_TIMELINE[i].atMs >= DEMO_TIMELINE[i - 1].atMs,
        `step ${i} (${DEMO_TIMELINE[i].atMs}ms) < step ${i - 1} (${DEMO_TIMELINE[i - 1].atMs}ms)`,
      );
    }
  });

  it("emits all four phase transitions", () => {
    const phases = DEMO_TIMELINE.filter((s) => s.event.type === "phase").map(
      (s) => (s.event.type === "phase" ? s.event.phase : null),
    );
    assert.deepEqual(phases, ["vision", "recon", "planning", "narration"]);
  });

  it("ends with a `done` event carrying a Trip", () => {
    const last = DEMO_TIMELINE[DEMO_TIMELINE.length - 1];
    assert.equal(last.event.type, "done");
    if (last.event.type === "done") {
      assert.ok(last.event.trip);
      assert.equal(last.event.trip.days.length, 3);
    }
  });
});

describe("stepsBetween — slicing", () => {
  it("returns vision-phase events in the first 1.1s", () => {
    const slice = stepsBetween(0, 1100);
    const types = slice.map((s) => s.event.type);
    assert.ok(types.includes("phase"), "should include the vision phase event");
    assert.ok(types.includes("agent_start"), "vision agent_start");
  });

  it("returns no events past the loop end", () => {
    assert.equal(stepsBetween(DEMO_LOOP_MS, DEMO_LOOP_MS + 5000).length, 0);
  });
});

describe("DEMO_TIMELINE — applied in order yields a coherent state", () => {
  it("after the full timeline: done, all 4 agents finished, 3 trip days, route present", () => {
    const events = DEMO_TIMELINE.map((s) => s.event);
    const state = deriveLiveFeedState(events);

    assert.equal(state.isDone, true);
    assert.equal(state.currentPhase, "done");
    assert.ok(state.finalTrip, "finalTrip set");
    assert.equal(state.finalTrip?.days.length, 3);

    // All four named agents should be finished (orchestrator is unused here).
    assert.equal(state.agents.vision.state, "finished");
    assert.equal(state.agents.recon.state, "finished");
    assert.equal(state.agents.planner.state, "finished");
    assert.equal(state.agents.narrator.state, "finished");

    // Three day_complete events resolve to three day markers.
    assert.equal(state.tripDays.length, 3);

    // Three scored spots highlighted.
    assert.deepEqual(state.highlightedSpotIds.sort(), [
      "ocean-beach-sf",
      "rincon",
      "steamer-lane",
    ]);
    assert.equal(state.spotScores.rincon, 92);

    // routeGeoJSON present (sourced from the trip).
    assert.ok(state.routeGeoJSON);

    // Inter-agent messages: recon→planner handoff + Q/A pair (c1) + planner→narrator handoff = 4 total.
    assert.equal(state.conversation.length, 4);
    const handoffs = state.conversation.filter((m) => m.kind === "handoff");
    assert.equal(handoffs.length, 2, "two handoff messages");
    assert.equal(handoffs[0].from, "recon");
    assert.equal(handoffs[1].from, "planner");

    // After the full timeline the consultation is closed.
    assert.equal(state.activeConsultations.size, 0);
    assert.equal(state.agents.recon.consultedBy, undefined);
  });
});

describe("DEMO_TIMELINE — consultation sequence", () => {
  it("consultation_start and consultation_end fire in correct order", () => {
    const consultationSteps = DEMO_TIMELINE.filter(
      (s) =>
        s.event.type === "consultation_start" ||
        s.event.type === "consultation_end",
    );
    assert.equal(consultationSteps.length, 2, "one start + one end");
    assert.equal(consultationSteps[0].event.type, "consultation_start");
    assert.equal(consultationSteps[1].event.type, "consultation_end");
  });

  it("question fires before consultation_start", () => {
    const questionStep = DEMO_TIMELINE.find(
      (s) => s.event.type === "agent_message" && s.event.type === "agent_message" &&
        (s.event as { kind?: string }).kind === "question",
    );
    const startStep = DEMO_TIMELINE.find((s) => s.event.type === "consultation_start");
    assert.ok(questionStep, "question message exists");
    assert.ok(startStep, "consultation_start exists");
    assert.ok(questionStep.atMs <= startStep.atMs, "question fires before or at consultation_start");
  });

  it("answer fires after consultation_end", () => {
    const answerStep = DEMO_TIMELINE.find(
      (s) => s.event.type === "agent_message" &&
        (s.event as { kind?: string }).kind === "answer",
    );
    const endStep = DEMO_TIMELINE.find((s) => s.event.type === "consultation_end");
    assert.ok(answerStep, "answer message exists");
    assert.ok(endStep, "consultation_end exists");
    assert.ok(answerStep.atMs >= endStep.atMs, "answer fires after consultation_end");
  });

  it("question and answer share correlation_id 'c1'", () => {
    const q = DEMO_TIMELINE.find(
      (s) => s.event.type === "agent_message" &&
        (s.event as { kind?: string }).kind === "question",
    );
    const a = DEMO_TIMELINE.find(
      (s) => s.event.type === "agent_message" &&
        (s.event as { kind?: string }).kind === "answer",
    );
    assert.ok(q && a);
    if (q.event.type === "agent_message" && a.event.type === "agent_message") {
      assert.equal(q.event.correlation_id, "c1");
      assert.equal(a.event.correlation_id, "c1");
    }
  });

  it("mid-consultation state: recon is marked as consultedBy planner", () => {
    // Only replay up through consultation_start.
    const startIndex = DEMO_TIMELINE.findIndex(
      (s) => s.event.type === "consultation_start",
    );
    const partialEvents = DEMO_TIMELINE.slice(0, startIndex + 1).map((s) => s.event);
    const state = deriveLiveFeedState(partialEvents);
    assert.ok(state.agents.recon.consultedBy);
    assert.equal(state.agents.recon.consultedBy?.initiator, "planner");
    assert.equal(state.agents.recon.consultedBy?.correlation_id, "c1");
    assert.equal(state.activeConsultations.size, 1);
  });
});

describe("DEMO_ROUTE_GEOJSON — fixture polyline", () => {
  it("is a FeatureCollection with one LineString", () => {
    assert.equal(DEMO_ROUTE_GEOJSON.type, "FeatureCollection");
    assert.equal(DEMO_ROUTE_GEOJSON.features.length, 1);
    const f = DEMO_ROUTE_GEOJSON.features[0];
    assert.equal(f.geometry.type, "LineString");
    if (f.geometry.type === "LineString") {
      // 4 anchor stops connected.
      assert.equal(f.geometry.coordinates.length, 4);
    }
  });
});
