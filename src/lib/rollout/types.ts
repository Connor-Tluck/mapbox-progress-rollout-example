/** Status of a service area (and therefore every hex inside it). */
export type AreaStatus =
  /** Red — flag is off for this area, or the area is explicitly excluded. */
  | "off"
  /** Yellow — a rollout is active but this area has not been bucketed in yet. */
  | "pending"
  /** Green — the feature is enabled for this area. */
  | "enabled";

export type RolloutMode = "live" | "simulation";

export interface AreaState {
  status: AreaStatus;
  /** 0–100 deterministic bucket (simulation only). */
  bucket?: number;
  /** LaunchDarkly evaluation reason kind (live only). */
  reason?: string;
}

export interface RolloutSnapshot {
  mode: RolloutMode;
  flagKey: string;
  /** False when the flag is fully off (everything red). */
  flagOn: boolean;
  /** Simulation: the current stage percentage. Live: observed % of in-scope areas enabled. */
  rolloutPct: number;
  /** Human label for the current stage, e.g. "25% of service areas". */
  stageLabel: string;
  areas: Record<string, AreaState>;
  updatedAt: number;
}

/** Shape returned by /api/rollout when no LaunchDarkly SDK key is configured. */
export interface SimulationFallback {
  mode: "simulation";
  flagKey: string;
  reason: string;
}

export type RolloutApiResponse = RolloutSnapshot | SimulationFallback;

export const STATUS_COLORS: Record<AreaStatus, string> = {
  off: "#E5484D",
  pending: "#F5A623",
  enabled: "#2EBD6B",
};

export const STATUS_LABELS: Record<AreaStatus, string> = {
  off: "Off",
  pending: "In rollout",
  enabled: "Enabled",
};
