import type { z } from 'zod';
import type { GatewayModelId } from '@ai-sdk/gateway';
import type {
  SpotSchema,
  TripParamsSchema,
  BoardInputSchema,
  PlanRequestSchema,
  BoardProfileSchema,
  BoardTypeSchema,
  WaveQualitySchema,
  BoardSkillSchema,
  HourForecastSchema,
  SessionSchema,
  TripDaySchema,
  TripSchema,
  StreamEventSchema,
  PhaseSchema,
  ConfidenceSchema,
  AgentNameSchema,
  PlannerModelSchema,
  ConsultationKindSchema,
} from './schemas';
export { SURF_PLANNER_MODELS } from './schemas';

export type { Spot, SkillLevel } from './spots';

/**
 * Strongly-typed model id usable with the Vercel AI Gateway. Re-exported
 * from `@ai-sdk/gateway` so UI and API share the same union — no string
 * drift between client dropdown and server runtime.
 */
export type { GatewayModelId };

/** Curated subset shipped with this app — see lib/schemas.ts SURF_PLANNER_MODELS. */
export type SurfPlannerModel = z.infer<typeof PlannerModelSchema>;

export type SpotFromSchema = z.infer<typeof SpotSchema>;
export type TripParams = z.infer<typeof TripParamsSchema>;
export type BoardInput = z.infer<typeof BoardInputSchema>;
export type PlanRequest = z.infer<typeof PlanRequestSchema>;
export type BoardProfile = z.infer<typeof BoardProfileSchema>;
export type BoardType = z.infer<typeof BoardTypeSchema>;
export type WaveQuality = z.infer<typeof WaveQualitySchema>;
export type BoardSkill = z.infer<typeof BoardSkillSchema>;
export type HourForecast = z.infer<typeof HourForecastSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type TripDay = z.infer<typeof TripDaySchema>;
export type Trip = z.infer<typeof TripSchema>;
export type StreamEvent = z.infer<typeof StreamEventSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type AgentName = z.infer<typeof AgentNameSchema>;
export type ConsultationKind = z.infer<typeof ConsultationKindSchema>;

export type ToolResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type SendEvent = (event: StreamEvent) => void;
