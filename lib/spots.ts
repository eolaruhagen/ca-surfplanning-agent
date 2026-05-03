export type SkillLevel =
  | "beginner"
  | "beginner-intermediate"
  | "intermediate"
  | "intermediate-advanced"
  | "advanced"
  | "advanced-expert"
  | "expert";

export type Spot = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  tide_station_id?: string;
  primary_buoy_id?: string;
  ideal_swell_direction_deg?: [number, number];
  ideal_swell_period_sec?: [number, number];
  ideal_wind_direction_deg?: [number, number];
  ideal_tide_state?: string;
  wave_size_feet: [number, number];
  skill_level: SkillLevel;
  wave_character: string;
  boards_recommended: string[];
  crowd_factor: string;
  hazards: string[];
  notes: string;
  confidence: "low" | "medium" | "high";
};

export const SKILL_COLORS: Record<SkillLevel, string> = {
  beginner: "#10b981",
  "beginner-intermediate": "#84cc16",
  intermediate: "#f59e0b",
  "intermediate-advanced": "#f97316",
  advanced: "#ef4444",
  "advanced-expert": "#b91c1c",
  expert: "#1c1917",
};

export const skillColor = (s: string): string =>
  (SKILL_COLORS as Record<string, string>)[s] ?? "#78716c";

export type TripDayMarker = {
  spotId: string;
  dayIndex: number;
  label?: string;
};

export type MapOverlay = {
  selectedSpotId?: string | null;
  highlightedSpotIds?: string[];
  tripDays?: TripDayMarker[];
  routeGeoJSON?: GeoJSON.FeatureCollection | GeoJSON.Feature | null;
};
