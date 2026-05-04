import { streamText, stepCountIs, type ToolSet } from 'ai';
import type { AgentName, SendEvent } from '@/lib/types';

export const DEFAULT_MODEL = 'anthropic/claude-haiku-4.5';

// Hard wallclock cap on a single agent run. Below the workflow step's 800s
// ceiling so we surface a clear error from inside the agent instead of being
// killed silently by the platform with no diagnostic.
const DEFAULT_WALLCLOCK_MS = 5 * 60 * 1000;

/**
 * Test-only seam. The real `streamText` lives on the AI SDK; tests can pass
 * a shim that records the args (notably `stopWhen`) and returns a fake
 * stream so we can assert the hard step cap is applied.
 */
export type StreamTextLike = typeof streamText;

export async function runAgent(opts: {
  agent: AgentName;
  model?: string;
  system: string;
  prompt: string;
  tools: ToolSet;
  maxSteps: number;
  sendEvent: SendEvent;
  /** Wallclock cap in ms; defaults to 5 minutes. */
  wallclockMs?: number;
  /** Optional override for tests. Defaults to the real `streamText`. */
  streamTextImpl?: StreamTextLike;
}): Promise<{ text: string }> {
  const { agent, sendEvent } = opts;
  const impl = opts.streamTextImpl ?? streamText;
  const wallclockMs = opts.wallclockMs ?? DEFAULT_WALLCLOCK_MS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), wallclockMs);

  try {
    const result = impl({
      model: opts.model ?? DEFAULT_MODEL,
      system: opts.system,
      prompt: opts.prompt,
      tools: opts.tools,
      stopWhen: stepCountIs(opts.maxSteps),
      abortSignal: controller.signal,
      onStepFinish: (step) => {
        const text = (step as { text?: string }).text;
        if (text && text.trim().length > 0) {
          sendEvent({ type: 'agent_thinking', agent, text });
        }
      },
    });

    for await (const _ of result.textStream) {
      void _;
    }

    const finalText = await result.text;
    return { text: finalText };
  } catch (err) {
    const aborted = controller.signal.aborted;
    const baseMessage = err instanceof Error ? err.message : 'agent run failed';
    const message = aborted
      ? `${agent} timed out after ${Math.round(wallclockMs / 1000)}s (likely a stuck model or MCP tool call)`
      : baseMessage;
    sendEvent({ type: 'error', agent, message });
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
