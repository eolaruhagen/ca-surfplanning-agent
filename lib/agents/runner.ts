import { streamText, stepCountIs, type ToolSet } from 'ai';
import type { AgentName, SendEvent } from '@/lib/types';

export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6';

export async function runAgent(opts: {
  agent: AgentName;
  model?: string;
  system: string;
  prompt: string;
  tools: ToolSet;
  maxSteps: number;
  sendEvent: SendEvent;
}): Promise<{ text: string }> {
  const { agent, sendEvent } = opts;

  try {
    const result = streamText({
      model: opts.model ?? DEFAULT_MODEL,
      system: opts.system,
      prompt: opts.prompt,
      tools: opts.tools,
      stopWhen: stepCountIs(opts.maxSteps),
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
    const message = err instanceof Error ? err.message : 'agent run failed';
    sendEvent({ type: 'error', agent, message });
    throw err;
  }
}
