import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { deriveLiveFeedState } from "./hook";
import type { StreamEvent, Trip } from "@/lib/types";

// --- Fixtures ---

const FAKE_TRIP: Trip = {
  id: "trip_demo",
  created_at: "2026-05-03T12:00:00.000Z",
  params: {
    start_point: [-122.5, 37.76],
    end_point: [-119.48, 34.37],
    start_date: "2026-05-09",
    end_date: "2026-05-11",
    sessions_per_day: 2,
    skill_level: "intermediate",
    wave_preference: "mixed",
    hard_constraints: "",
  },
  quiver: [],
  days: [],
  route_geojson: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { kind: "route" },
        geometry: {
          type: "LineString",
          coordinates: [
            [-122.5108, 37.7594],
            [-122.0269, 36.9514],
          ],
        },
      },
    ],
  },
  summary_md: "# Trip",
  caveats: [],
};

// --- Tests ---

describe("deriveLiveFeedState — phase event", () => {
  it("updates currentPhase", () => {
    const events: StreamEvent[] = [{ type: "phase", phase: "recon" }];
    const s = deriveLiveFeedState(events);
    assert.equal(s.currentPhase, "recon");
  });

  it("starts with currentPhase = null", () => {
    const s = deriveLiveFeedState([]);
    assert.equal(s.currentPhase, null);
  });
});

describe("deriveLiveFeedState — agent_start", () => {
  it("sets the targeted agent to active with given task", () => {
    const events: StreamEvent[] = [
      { type: "agent_start", agent: "recon", task: "Discover spots" },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.agents.recon.state, "active");
    assert.equal(s.agents.recon.currentTask, "Discover spots");
    // Other agents stay idle.
    assert.equal(s.agents.vision.state, "idle");
    assert.equal(s.agents.planner.state, "idle");
  });
});

describe("deriveLiveFeedState — agent_thinking", () => {
  it("appends to thinkingText", () => {
    const events: StreamEvent[] = [
      { type: "agent_start", agent: "recon", task: "scan" },
      { type: "agent_thinking", agent: "recon", text: "The peak " },
      { type: "agent_thinking", agent: "recon", text: "swell looks clean." },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.agents.recon.thinkingText, "The peak swell looks clean.");
    assert.equal(s.agents.recon.state, "thinking");
    assert.equal(s.agents.recon.panelState, "thinking");
  });
});

describe("deriveLiveFeedState — tool_call + tool_result pairing", () => {
  it("resolves the matching tool chip", () => {
    const events: StreamEvent[] = [
      {
        type: "tool_call",
        agent: "recon",
        name: "list_candidate_spots",
        source: "local",
        args: { region: "central-coast" },
      },
      {
        type: "tool_result",
        agent: "recon",
        name: "list_candidate_spots",
        summary: "18 spots found",
      },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.agents.recon.activeTools.length, 1);
    const t = s.agents.recon.activeTools[0];
    assert.equal(t.resolved, true);
    assert.equal(t.resultSummary, "18 spots found");
    assert.equal(t.source, "local");
  });

  it("leaves an unmatched tool_call as in-flight", () => {
    const events: StreamEvent[] = [
      {
        type: "tool_call",
        agent: "recon",
        name: "marine_weather",
        source: "mcp:open-meteo",
        args: {},
      },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.agents.recon.activeTools.length, 1);
    assert.equal(s.agents.recon.activeTools[0].resolved, false);
  });

  it("panelState is 'action' while a tool_call is unresolved", () => {
    const events: StreamEvent[] = [
      { type: "agent_start", agent: "planner", task: "plan" },
      {
        type: "tool_call",
        agent: "planner",
        name: "directions",
        source: "mcp:google-maps",
        args: {},
      },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.agents.planner.panelState, "action");
  });

  it("panelState returns to 'thinking' once all tools resolve", () => {
    const events: StreamEvent[] = [
      { type: "agent_start", agent: "planner", task: "plan" },
      { type: "agent_thinking", agent: "planner", text: "Checking route" },
      {
        type: "tool_call",
        agent: "planner",
        name: "directions",
        source: "mcp:google-maps",
        args: {},
      },
      {
        type: "tool_result",
        agent: "planner",
        name: "directions",
        summary: "75 mi",
      },
    ];
    const s = deriveLiveFeedState(events);
    // All tools resolved + last state was thinking → back to thinking.
    assert.equal(s.agents.planner.panelState, "thinking");
  });
});

describe("deriveLiveFeedState — data_observed", () => {
  it("adds spot_id to highlightedSpotIds, score to spotScores, and pulses", () => {
    const events: StreamEvent[] = [
      {
        type: "data_observed",
        agent: "recon",
        kind: "forecast",
        summary: "Rincon clean",
        spot_id: "rincon",
        score: 87,
      },
    ];
    const s = deriveLiveFeedState(events);
    assert.deepEqual(s.highlightedSpotIds, ["rincon"]);
    assert.deepEqual(s.spotScores, { rincon: 87 });
    assert.deepEqual(s.pulsedSpotIds, ["rincon"]);
    assert.equal(s.observations.length, 1);
    assert.equal(s.agents.recon.observations.length, 1);
  });

  it("dedupes highlightedSpotIds for repeat spot observations", () => {
    const events: StreamEvent[] = [
      {
        type: "data_observed",
        agent: "recon",
        kind: "forecast",
        summary: "first",
        spot_id: "rincon",
        score: 70,
      },
      {
        type: "data_observed",
        agent: "recon",
        kind: "forecast",
        summary: "second",
        spot_id: "rincon",
        score: 87,
      },
    ];
    const s = deriveLiveFeedState(events);
    assert.deepEqual(s.highlightedSpotIds, ["rincon"]);
    // Latest score wins.
    assert.equal(s.spotScores.rincon, 87);
  });
});

describe("deriveLiveFeedState — day_complete", () => {
  it("adds to tripDays anchored on the day's first session spot", () => {
    const events: StreamEvent[] = [
      {
        type: "day_complete",
        day: {
          day_number: 1,
          date: "2026-05-09",
          sessions: [
            {
              time_window: "7–10am",
              spot_id: "ocean-beach-sf",
              spot_name: "Ocean Beach (SF)",
              board_id: "b1",
              pick_reason: "South-facing peak open",
              reasoning: "...",
              forecast_snapshot: {},
              fit_score: 72,
            },
          ],
          overnight: null,
          drive_to_next: null,
        },
      },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.tripDays.length, 1);
    assert.equal(s.tripDays[0].spotId, "ocean-beach-sf");
    assert.equal(s.tripDays[0].dayIndex, 1);
  });
});

describe("deriveLiveFeedState — agent_finish", () => {
  it("sets state to finished with summary", () => {
    const events: StreamEvent[] = [
      { type: "agent_start", agent: "vision", task: "ID boards" },
      { type: "agent_finish", agent: "vision", summary: "2 boards identified" },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.agents.vision.state, "finished");
    assert.equal(s.agents.vision.summary, "2 boards identified");
    assert.equal(s.agents.vision.panelState, "done");
  });
});

describe("deriveLiveFeedState — agent_message", () => {
  it("appends inter-agent messages in order", () => {
    const events: StreamEvent[] = [
      { type: "agent_message", from: "recon", to: "planner", content: "Found 18" },
      { type: "agent_message", from: "planner", to: "narrator", content: "Trip ready" },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.conversation.length, 2);
    assert.equal(s.conversation[0].from, "recon");
    assert.equal(s.conversation[1].to, "narrator");
  });

  it("defaults kind to 'handoff' when absent", () => {
    const events: StreamEvent[] = [
      { type: "agent_message", from: "recon", to: "planner", content: "handoff" },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.conversation[0].kind, "handoff");
  });

  it("preserves kind 'question' and correlation_id", () => {
    const events: StreamEvent[] = [
      {
        type: "agent_message",
        from: "planner",
        to: "recon",
        content: "Is Mavericks safe?",
        kind: "question",
        correlation_id: "c1",
      },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.conversation[0].kind, "question");
    assert.equal(s.conversation[0].correlation_id, "c1");
  });

  it("populates recentMessages alongside conversation", () => {
    const events: StreamEvent[] = [
      { type: "agent_message", from: "recon", to: "planner", content: "Found 18" },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.recentMessages.length, 1);
    assert.equal(s.recentMessages[0].from, "recon");
  });

  it("correlates paired question+answer in recentMessages", () => {
    const events: StreamEvent[] = [
      {
        type: "agent_message",
        from: "planner",
        to: "recon",
        content: "Is Mavericks safe?",
        kind: "question",
        correlation_id: "c1",
      },
      {
        type: "agent_message",
        from: "recon",
        to: "planner",
        content: "Skip Mavericks.",
        kind: "answer",
        correlation_id: "c1",
      },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.recentMessages.length, 2);
    const q = s.recentMessages.find((m) => m.kind === "question");
    const a = s.recentMessages.find((m) => m.kind === "answer");
    assert.ok(q && a);
    assert.equal(q.correlation_id, "c1");
    assert.equal(a.correlation_id, "c1");
  });
});

describe("deriveLiveFeedState — consultation_start / consultation_end", () => {
  it("consultation_start adds to activeConsultations and sets consultedBy on consultee", () => {
    const events: StreamEvent[] = [
      {
        type: "consultation_start",
        initiator: "planner",
        consultee: "recon",
        correlation_id: "c1",
        topic: "Skill mismatch concern",
      },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.activeConsultations.size, 1);
    const consultation = s.activeConsultations.get("c1");
    assert.ok(consultation);
    assert.equal(consultation.initiator, "planner");
    assert.equal(consultation.consultee, "recon");
    assert.equal(consultation.topic, "Skill mismatch concern");

    // Consultee has consultedBy set.
    assert.ok(s.agents.recon.consultedBy);
    assert.equal(s.agents.recon.consultedBy.initiator, "planner");
    assert.equal(s.agents.recon.consultedBy.correlation_id, "c1");
    assert.equal(s.agents.recon.consultedBy.topic, "Skill mismatch concern");

    // Initiator (planner) does NOT get consultedBy.
    assert.equal(s.agents.planner.consultedBy, undefined);
  });

  it("consultation_end removes from activeConsultations and clears consultedBy", () => {
    const events: StreamEvent[] = [
      {
        type: "consultation_start",
        initiator: "planner",
        consultee: "recon",
        correlation_id: "c1",
        topic: "Skill mismatch concern",
      },
      {
        type: "consultation_end",
        initiator: "planner",
        consultee: "recon",
        correlation_id: "c1",
        summary: "Advised against Mavericks",
      },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.activeConsultations.size, 0);
    assert.equal(s.agents.recon.consultedBy, undefined);
  });

  it("full consultation sequence: question → start → mini-run → end → answer", () => {
    const events: StreamEvent[] = [
      {
        type: "agent_message",
        from: "planner",
        to: "recon",
        kind: "question",
        correlation_id: "c1",
        content: "Is Mavericks safe at intermediate?",
      },
      {
        type: "consultation_start",
        initiator: "planner",
        consultee: "recon",
        correlation_id: "c1",
        topic: "Skill mismatch concern",
      },
      {
        type: "agent_thinking",
        agent: "recon",
        text: "Looking up Mavericks...",
      },
      {
        type: "tool_call",
        agent: "recon",
        name: "lookup_spot",
        source: "local",
        args: { id: "mavericks" },
      },
      {
        type: "tool_result",
        agent: "recon",
        name: "lookup_spot",
        summary: "Mavericks: expert big-wave",
      },
      {
        type: "consultation_end",
        initiator: "planner",
        consultee: "recon",
        correlation_id: "c1",
        summary: "Advised against; try Steamer Lane",
      },
      {
        type: "agent_message",
        from: "recon",
        to: "planner",
        kind: "answer",
        correlation_id: "c1",
        content: "Skip Mavericks — try Steamer Lane instead",
      },
    ];
    const s = deriveLiveFeedState(events);

    // After end: consultation closed.
    assert.equal(s.activeConsultations.size, 0);
    assert.equal(s.agents.recon.consultedBy, undefined);

    // Two messages in conversation (question + answer).
    assert.equal(s.conversation.length, 2);
    assert.equal(s.conversation[0].kind, "question");
    assert.equal(s.conversation[1].kind, "answer");

    // recentMessages has both.
    assert.equal(s.recentMessages.length, 2);

    // Recon ran its mini-loop tool.
    assert.equal(s.agents.recon.activeTools.length, 1);
    assert.equal(s.agents.recon.activeTools[0].resolved, true);
  });

  it("multiple simultaneous consultations can be tracked independently", () => {
    const events: StreamEvent[] = [
      {
        type: "consultation_start",
        initiator: "planner",
        consultee: "recon",
        correlation_id: "c1",
        topic: "Topic A",
      },
      {
        type: "consultation_start",
        initiator: "planner",
        consultee: "vision",
        correlation_id: "c2",
        topic: "Topic B",
      },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.activeConsultations.size, 2);
    assert.ok(s.activeConsultations.has("c1"));
    assert.ok(s.activeConsultations.has("c2"));
  });
});

describe("deriveLiveFeedState — panelState derivation", () => {
  it("starts idle", () => {
    const s = deriveLiveFeedState([]);
    for (const agent of ["vision", "recon", "planner", "narrator"] as const) {
      assert.equal(s.agents[agent].panelState, "idle");
    }
  });

  it("panelState is 'queued' when active but not yet thinking or acting", () => {
    const events: StreamEvent[] = [
      { type: "agent_start", agent: "narrator", task: "Write trip" },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.agents.narrator.panelState, "queued");
  });

  it("panelState is 'done' after agent_finish", () => {
    const events: StreamEvent[] = [
      { type: "agent_start", agent: "vision", task: "ID boards" },
      { type: "agent_finish", agent: "vision", summary: "done" },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.agents.vision.panelState, "done");
  });
});

describe("deriveLiveFeedState — done", () => {
  it("sets finalTrip and currentPhase=done", () => {
    const events: StreamEvent[] = [
      { type: "phase", phase: "narration" },
      { type: "done", trip_id: FAKE_TRIP.id, trip: FAKE_TRIP },
    ];
    const s = deriveLiveFeedState(events);
    assert.equal(s.currentPhase, "done");
    assert.equal(s.isDone, true);
    assert.ok(s.finalTrip);
    assert.equal(s.finalTrip?.id, "trip_demo");
    assert.ok(s.routeGeoJSON, "should hydrate routeGeoJSON from trip");
  });
});
