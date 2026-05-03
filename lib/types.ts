import type { z } from 'zod';
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
} from './schemas';

export type { Spot, SkillLevel } from './spots';

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

export type ToolResult<T> = { ok: true; data: T } | { ok: false; error: string };
