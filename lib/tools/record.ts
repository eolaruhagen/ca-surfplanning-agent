import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import type { AgentName, Session, TripDay, SendEvent } from '@/lib/types';

const ForecastSnapshotInputSchema = z
  .object({
    spot_id: z.string().optional(),
    datetime: z.string().optional(),
    swell_height_ft: z.coerce.number().optional(),
    swell_direction_deg: z.coerce.number().optional(),
    swell_period_sec: z.coerce.number().optional(),
    swell_peak_period_sec: z.coerce.number().optional(),
    wind_speed_mph: z.coerce.number().optional(),
    wind_direction_deg: z.coerce.number().optional(),
    combined_wave_height_ft: z.coerce.number().optional(),
  })
  .partial();

export type RecordedPlan = {
  days: Map<number, TripDay>;
};

export function newRecordedPlan(): RecordedPlan {
  return { days: new Map() };
}

function ensureDay(plan: RecordedPlan, day_number: number, date: string): TripDay {
  let day = plan.days.get(day_number);
  if (!day) {
    day = {
      day_number,
      date,
      sessions: [],
      overnight: null,
      drive_to_next: null,
    };
    plan.days.set(day_number, day);
  }
  return day;
}

export function recordTools(
  agent: AgentName,
  sendEvent: SendEvent,
  plan: RecordedPlan,
): ToolSet {
  return {
    record_session: tool({
      description:
        'Confirm a planned surf session in the itinerary. Call once per session you commit to, in chronological order. pick_reason MUST be a short, animation-friendly tagline (≤160 chars) — this is what the UI shows when it walks the user through the trip spot-by-spot. reasoning is the long-form explanation that feeds the markdown summary. fit_score must be the score returned by score_spot_fit.',
      inputSchema: z.object({
        day_number: z.number().int().min(1),
        date: z.string(),
        time_window: z.string().describe('e.g. "6:30 AM – 9:00 AM"'),
        spot_id: z.string(),
        spot_name: z.string(),
        spot_coords: z
          .tuple([z.number(), z.number()])
          .optional()
          .describe('[lon, lat] of the spot — set so the UI can pin it precisely'),
        board_id: z.string(),
        pick_reason: z
          .string()
          .min(1)
          .max(160)
          .describe('Short tagline for the per-spot animation, e.g. "Peak swell window — 5ft @ 14s, light offshore"'),
        reasoning: z.string().describe('Long-form reasoning for the summary doc'),
        fit_score: z.number(),
        forecast_snapshot: ForecastSnapshotInputSchema.optional(),
      }),
      execute: async (args) => {
        sendEvent({ type: 'tool_call', agent, name: 'record_session', source: 'local', args });
        const day = ensureDay(plan, args.day_number, args.date);
        const parsedSnapshot = ForecastSnapshotInputSchema.safeParse(args.forecast_snapshot ?? {});
        const session: Session = {
          time_window: args.time_window,
          spot_id: args.spot_id,
          spot_name: args.spot_name,
          spot_coords: args.spot_coords,
          board_id: args.board_id,
          pick_reason: args.pick_reason,
          reasoning: args.reasoning,
          fit_score: args.fit_score,
          forecast_snapshot: (parsedSnapshot.success ? parsedSnapshot.data : {}) as Session['forecast_snapshot'],
        };
        day.sessions.push(session);
        sendEvent({
          type: 'tool_result',
          agent,
          name: 'record_session',
          summary: `Day ${args.day_number} • ${args.time_window} • ${args.spot_name} (${args.fit_score})`,
        });
        return { ok: true };
      },
    }),

    record_overnight: tool({
      description:
        'Record where the user will sleep at the end of a day. coords are [lon, lat]. Skip on the last day of the trip.',
      inputSchema: z.object({
        day_number: z.number().int().min(1),
        date: z.string(),
        town: z.string(),
        coords: z.tuple([z.number(), z.number()]),
        reasoning: z.string(),
      }),
      execute: async (args) => {
        sendEvent({ type: 'tool_call', agent, name: 'record_overnight', source: 'local', args });
        const day = ensureDay(plan, args.day_number, args.date);
        day.overnight = {
          town: args.town,
          coords: args.coords,
          reasoning: args.reasoning,
        };
        sendEvent({
          type: 'tool_result',
          agent,
          name: 'record_overnight',
          summary: `Day ${args.day_number} → overnight in ${args.town}`,
        });
        if (day.sessions.length > 0) {
          sendEvent({ type: 'day_complete', day });
        }
        return { ok: true };
      },
    }),

    record_drive: tool({
      description: 'Record the drive from the end of one day to the start of the next.',
      inputSchema: z.object({
        day_number: z.number().int().min(1),
        date: z.string(),
        duration_minutes: z.number(),
        distance_miles: z.number(),
      }),
      execute: async (args) => {
        sendEvent({ type: 'tool_call', agent, name: 'record_drive', source: 'local', args });
        const day = ensureDay(plan, args.day_number, args.date);
        day.drive_to_next = {
          duration_minutes: args.duration_minutes,
          distance_miles: args.distance_miles,
        };
        sendEvent({
          type: 'tool_result',
          agent,
          name: 'record_drive',
          summary: `Day ${args.day_number} drive: ${args.distance_miles.toFixed(0)}mi / ${args.duration_minutes.toFixed(0)}min`,
        });
        return { ok: true };
      },
    }),
  };
}

export function plannedDays(plan: RecordedPlan): TripDay[] {
  return [...plan.days.values()].sort((a, b) => a.day_number - b.day_number);
}
