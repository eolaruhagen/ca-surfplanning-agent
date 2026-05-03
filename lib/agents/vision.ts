import { generateObject } from 'ai';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { BoardProfileSchema } from '@/lib/schemas';
import type { BoardInput, BoardProfile, SendEvent } from '@/lib/types';

const VisionProfileSchema = BoardProfileSchema.omit({
  id: true,
  user_label: true,
  length_inches: true,
});

export const VISION_MODEL = 'anthropic/claude-sonnet-4.6';

export async function runVisionAgent(opts: {
  boards: BoardInput[];
  sendEvent: SendEvent;
  model?: string;
}): Promise<BoardProfile[]> {
  const { boards, sendEvent } = opts;
  const model = opts.model ?? VISION_MODEL;

  sendEvent({ type: 'phase', phase: 'vision' });
  sendEvent({
    type: 'agent_start',
    agent: 'vision',
    task: `Identify ${boards.length} board${boards.length === 1 ? '' : 's'} from photos`,
  });

  const results = await Promise.all(
    boards.map(async (board, i) => {
      sendEvent({
        type: 'tool_call',
        agent: 'vision',
        name: 'identify_board',
        source: 'local',
        args: { user_label: board.user_label, length_inches: board.length_inches },
      });

      try {
        const { object } = await generateObject({
          model,
          schema: VisionProfileSchema,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text:
                    `Identify this surfboard. The user states it is ${board.length_inches} inches long — use that as the scale reference. Reason about overall shape, rocker, fin setup, tail design, and likely use case. The user labeled it "${board.user_label}". Output a structured profile.`,
                },
                { type: 'image', image: board.photo_data_url },
              ],
            },
          ],
        });

        const profile: BoardProfile = {
          id: `board-${nanoid(6)}`,
          user_label: board.user_label,
          length_inches: board.length_inches,
          ...object,
        };

        sendEvent({
          type: 'tool_result',
          agent: 'vision',
          name: 'identify_board',
          summary: `${profile.user_label} → ${profile.board_type} (${profile.confidence})`,
        });
        sendEvent({ type: 'vision_progress', board_index: i, board: profile });
        return profile;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'vision failed';
        sendEvent({ type: 'tool_result', agent: 'vision', name: 'identify_board', summary: `error: ${message}` });
        const fallback: BoardProfile = {
          id: `board-${nanoid(6)}`,
          user_label: board.user_label,
          length_inches: board.length_inches,
          board_type: 'shortboard',
          shape_notes: 'Vision identification failed; using generic profile.',
          ideal_conditions: {
            wave_height_ft: [3, 6],
            wave_period_sec: [10, 16],
            wave_quality: 'moderate',
            skill_required: 'intermediate',
          },
          confidence: 'low',
          raw_description: 'fallback after vision error',
        };
        sendEvent({ type: 'vision_progress', board_index: i, board: fallback });
        return fallback;
      }
    }),
  );

  sendEvent({
    type: 'agent_finish',
    agent: 'vision',
    summary: `Identified ${results.length} board${results.length === 1 ? '' : 's'}`,
  });
  return results;
}

export const _internalVisionSchema = VisionProfileSchema as z.ZodTypeAny;
