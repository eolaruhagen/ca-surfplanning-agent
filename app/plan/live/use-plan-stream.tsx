"use client";

import { useEffect, useRef, useState } from "react";

import type { PlanRequest, StreamEvent } from "@/lib/types";
import { StreamEventSchema } from "@/lib/schemas";
import { parseSseChunk } from "./sse";

export type PlanStreamStatus = "idle" | "connecting" | "streaming" | "done" | "error";

export type UsePlanStreamResult = {
  events: StreamEvent[];
  error: string | null;
  status: PlanStreamStatus;
};

export function usePlanStream(request: PlanRequest | null): UsePlanStreamResult {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PlanStreamStatus>("idle");

  const requestRef = useRef<PlanRequest | null>(null);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    if (!request) return;

    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      setEvents([]);
      setError(null);
      setStatus("connecting");

      // Track whether we ever saw a terminator event (`done` or `error`).
      // If the stream closes without one, the route function probably hit
      // its maxDuration cap or the workflow rejected silently — surface
      // that to the user instead of leaving them on a frozen "streaming"
      // view forever.
      let sawTerminator = false;

      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestRef.current),
          signal: controller.signal,
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Server returned ${res.status}: ${txt.slice(0, 120)}`);
        }

        if (!res.body) {
          throw new Error("Missing response body for SSE stream.");
        }

        setStatus("streaming");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done || cancelled) break;
          buffer += decoder.decode(value, { stream: true });
          const { messages, rest } = parseSseChunk(buffer);
          buffer = rest;

          for (const message of messages) {
            let parsedJson: unknown;
            try {
              parsedJson = JSON.parse(message);
            } catch {
              continue;
            }
            const parsed = StreamEventSchema.safeParse(parsedJson);
            if (!parsed.success) continue;

            const evt = parsed.data;
            setEvents((prev) => [...prev, evt]);
            if (evt.type === "done") {
              sawTerminator = true;
              setStatus("done");
            } else if (evt.type === "error") {
              sawTerminator = true;
              const label = evt.agent ? `${evt.agent}: ${evt.message}` : evt.message;
              setError(label);
              setStatus("error");
            }
          }
        }

        if (!cancelled && !sawTerminator) {
          setError(
            "Connection to the planning server closed before the trip finished. " +
              "This usually means the request hit the platform's max duration. " +
              "Try a shorter trip or fewer sessions per day.",
          );
          setStatus("error");
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Streaming failed.");
        setStatus("error");
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [request]);

  return { events, error, status };
}
