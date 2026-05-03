import { z } from 'zod';

export const SkillLevelSchema = z.enum([
  'beginner',
  'beginner-intermediate',
  'intermediate',
  'intermediate-advanced',
  'advanced',
  'advanced-expert',
  'expert',
]);

export const ConfidenceSchema = z.enum(['low', 'medium', 'high']);

const LonLat = z.tuple([z.number(), z.number()]);
const NumRange = z.tuple([z.number(), z.number()]);

export const SpotSchema = z.object({
  id: z.string(),
  name: z.string(),
  region: z.string(),
  lat: z.number(),
  lon: z.number(),
  tide_station_id: z.string().optional(),
  primary_buoy_id: z.string().optional(),
  ideal_swell_direction_deg: NumRange.optional(),
  ideal_swell_period_sec: NumRange.optional(),
  ideal_wind_direction_deg: NumRange.optional(),
  ideal_tide_state: z.string().optional(),
  wave_size_feet: NumRange,
  skill_level: SkillLevelSchema,
  wave_character: z.string(),
  boards_recommended: z.array(z.string()),
  crowd_factor: z.string(),
  hazards: z.array(z.string()),
  notes: z.string(),
  confidence: ConfidenceSchema,
});

export const TripParamsSchema = z.object({
  start_point: LonLat,
  end_point: LonLat,
  start_date: z.string(),
  end_date: z.string(),
  sessions_per_day: z.number().int().min(1).max(3),
  skill_level: SkillLevelSchema,
  wave_preference: z.enum(['mellow', 'performance', 'mixed']),
  hard_constraints: z.string().max(500).default(''),
});

export const BoardInputSchema = z.object({
  user_label: z.string(),
  length_inches: z.number().min(48).max(132),
  photo_data_url: z.string(),
});

/**
 * Curated subset of @ai-sdk/gateway's GatewayModelId that we know works for
 * this planner. Both the UI dropdown and the API runtime parse against this
 * union, so contracts stay in sync. To allow a model the SDK supports but
 * we haven't curated, add it here — don't bypass.
 */
export const SURF_PLANNER_MODELS = [
  'anthropic/claude-opus-4.7',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-haiku-4.5',
  'openai/gpt-5.2',
  'openai/gpt-5.1-thinking',
  'openai/gpt-5-mini',
  'google/gemini-3-pro-preview',
  'google/gemini-2.5-pro',
] as const;

export const PlannerModelSchema = z.enum(SURF_PLANNER_MODELS);

export const PlanRequestSchema = z.object({
  params: TripParamsSchema,
  boards: z.array(BoardInputSchema).min(1).max(4),
  /**
   * Optional model override per request. Defaults to anthropic/claude-sonnet-4.6
   * server-side. UI exposes a typed dropdown over SURF_PLANNER_MODELS.
   */
  model: PlannerModelSchema.optional(),
});

export const BoardTypeSchema = z.enum([
  'shortboard',
  'longboard',
  'midlength',
  'fish',
  'funboard',
  'gun',
  'hybrid',
]);

export const WaveQualitySchema = z.enum(['mushy', 'moderate', 'punchy', 'any']);

export const BoardSkillSchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const BoardProfileSchema = z.object({
  id: z.string(),
  user_label: z.string(),
  length_inches: z.number(),
  board_type: BoardTypeSchema,
  shape_notes: z.string(),
  ideal_conditions: z.object({
    wave_height_ft: NumRange,
    wave_period_sec: NumRange,
    wave_quality: WaveQualitySchema,
    skill_required: BoardSkillSchema,
  }),
  confidence: ConfidenceSchema,
  raw_description: z.string(),
});

export const HourForecastSchema = z.object({
  spot_id: z.string(),
  datetime: z.string(),
  swell_height_ft: z.number(),
  swell_direction_deg: z.number(),
  swell_period_sec: z.number(),
  swell_peak_period_sec: z.number(),
  wind_speed_mph: z.number(),
  wind_direction_deg: z.number(),
  combined_wave_height_ft: z.number(),
});

export const SessionSchema = z.object({
  time_window: z.string(),
  spot_id: z.string(),
  spot_name: z.string(),
  spot_coords: z.tuple([z.number(), z.number()]).optional(),
  board_id: z.string(),
  /**
   * Short, animation-friendly tagline (≤120 chars) — what the UI shows when
   * the trip is being walked through spot-by-spot. Always present; the
   * planner is required to provide one.
   */
  pick_reason: z.string().min(1).max(160),
  /**
   * Long-form reasoning (no length cap) — feeds the markdown summary and
   * detail panes. May restate context the pick_reason omits.
   */
  reasoning: z.string(),
  forecast_snapshot: HourForecastSchema.partial(),
  fit_score: z.number(),
});

export const TripDaySchema = z.object({
  day_number: z.number().int().min(1),
  date: z.string(),
  sessions: z.array(SessionSchema),
  overnight: z
    .object({
      town: z.string(),
      coords: LonLat,
      reasoning: z.string(),
    })
    .nullable(),
  drive_to_next: z
    .object({
      duration_minutes: z.number(),
      distance_miles: z.number(),
    })
    .nullable(),
});

export const TripSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  params: TripParamsSchema,
  quiver: z.array(BoardProfileSchema),
  days: z.array(TripDaySchema),
  route_geojson: z.unknown(),
  summary_md: z.string(),
  caveats: z.array(z.string()),
});

export const PhaseSchema = z.enum([
  'vision',
  'recon',
  'planning',
  'narration',
  'done',
]);

export const AgentNameSchema = z.enum([
  'orchestrator',
  'vision',
  'recon',
  'planner',
  'narrator',
]);

export const StreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('phase'),
    phase: PhaseSchema,
  }),
  z.object({
    type: z.literal('agent_start'),
    agent: AgentNameSchema,
    task: z.string(),
  }),
  z.object({
    type: z.literal('agent_finish'),
    agent: AgentNameSchema,
    summary: z.string(),
  }),
  z.object({
    type: z.literal('agent_message'),
    from: AgentNameSchema,
    to: AgentNameSchema,
    content: z.string(),
  }),
  z.object({
    type: z.literal('agent_thinking'),
    agent: AgentNameSchema,
    text: z.string(),
  }),
  z.object({
    type: z.literal('vision_progress'),
    board_index: z.number().int(),
    board: BoardProfileSchema,
  }),
  z.object({
    type: z.literal('tool_call'),
    agent: AgentNameSchema,
    name: z.string(),
    source: z.enum(['local', 'mcp:open-meteo', 'mcp:google-maps', 'mcp:filesystem']),
    args: z.unknown(),
  }),
  z.object({
    type: z.literal('tool_result'),
    agent: AgentNameSchema,
    name: z.string(),
    summary: z.string(),
  }),
  z.object({
    type: z.literal('data_observed'),
    agent: AgentNameSchema,
    kind: z.enum(['spot', 'forecast', 'route', 'tide', 'buoy', 'place']),
    summary: z.string(),
    spot_id: z.string().optional(),
    score: z.number().optional(),
  }),
  z.object({
    type: z.literal('day_complete'),
    day: TripDaySchema,
  }),
  z.object({
    type: z.literal('done'),
    trip_id: z.string(),
    trip: TripSchema,
  }),
  z.object({
    type: z.literal('error'),
    agent: AgentNameSchema.optional(),
    message: z.string(),
  }),
]);
