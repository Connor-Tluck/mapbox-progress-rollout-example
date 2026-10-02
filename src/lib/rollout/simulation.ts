/**
 * Simulated progressive rollout.
 *
 * Mirrors how LaunchDarkly progressive rollouts behave: each context is hashed
 * to a stable bucket in [0, 100), and a context receives the new variation once
 * the rollout percentage passes its bucket. Because buckets are deterministic,
 * an area that is enabled at 25% stays enabled at 50%, 75% and 100%.
 *
 * (LaunchDarkly uses SHA-1 over `key.salt.contextKey`; we use FNV-1a for a
 * dependency-free, synchronous hash. The behaviour is the same for demo purposes.)
 */
import { SERVICE_AREAS, type Region } from "@/data/service-areas";
import type { AreaState, RolloutSnapshot } from "./types";

/**
 * Simulated targeting rule: `region is North → false`.
 * Areas matching it are excluded from the rollout and stay red (like a RULE_MATCH in LaunchDarkly).
 */
export const EXCLUDED_REGION: Region = "North";

export interface RolloutStage {
  /** Percentage of contexts that should receive the new variation. */
  pct: number;
  /** When false the flag is fully off: everything is red. */
  flagOn: boolean;
  label: string;
}

/** Default stage ladder; matches a typical LaunchDarkly progressive rollout. */
export const DEFAULT_STAGES: RolloutStage[] = [
  { pct: 0, flagOn: false, label: "Flag off" },
  { pct: 1, flagOn: true, label: "1% of service areas" },
  { pct: 5, flagOn: true, label: "5% of service areas" },
  { pct: 10, flagOn: true, label: "10% of service areas" },
  { pct: 25, flagOn: true, label: "25% of service areas" },
  { pct: 50, flagOn: true, label: "50% of service areas" },
  { pct: 75, flagOn: true, label: "75% of service areas" },
  { pct: 100, flagOn: true, label: "100% — fully rolled out" },
];

/** Milliseconds each stage is held at 1× speed. */
export const DEFAULT_STAGE_DURATION_MS = 3500;

function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic bucket in [0, 100) for a context key under a flag. */
export function bucketFor(flagKey: string, contextKey: string, salt = "canada-demo"): number {
  return (fnv1a(`${flagKey}.${salt}.${contextKey}`) / 0x100000000) * 100;
}

/**
 * Produce a sorted list of area ids by bucket so that the N-th area to turn on
 * is predictable. We rank buckets rather than using raw thresholds so that a
 * "1%" stage still lights up exactly one area in a ~40-area demo instead of none.
 */
export function rankedAreas(flagKey: string): { id: string; bucket: number; rank: number }[] {
  return SERVICE_AREAS.map((a) => ({ id: a.id, bucket: bucketFor(flagKey, a.id) }))
    .sort((a, b) => a.bucket - b.bucket)
    .map((a, i) => ({ ...a, rank: i }));
}

export function buildSimulationSnapshot(
  flagKey: string,
  stage: RolloutStage,
  ranked = rankedAreas(flagKey),
  excludeRegion = true,
): RolloutSnapshot {
  const excluded = new Set(
    excludeRegion ? SERVICE_AREAS.filter((a) => a.region === EXCLUDED_REGION).map((a) => a.id) : [],
  );
  // Rank only the eligible areas so "1%" still lights up exactly one eligible area.
  const eligible = ranked.filter((a) => !excluded.has(a.id));
  const total = eligible.length;
  const enabledCount = stage.flagOn ? Math.max(stage.pct > 0 ? 1 : 0, Math.round((stage.pct / 100) * total)) : 0;

  const areas: Record<string, AreaState> = {};
  eligible.forEach((a, rank) => {
    const status = !stage.flagOn ? "off" : rank < enabledCount ? "enabled" : "pending";
    areas[a.id] = { status, bucket: Math.round(a.bucket * 10) / 10, reason: stage.flagOn ? "FALLTHROUGH" : "OFF" };
  });
  for (const a of ranked) {
    if (excluded.has(a.id)) {
      areas[a.id] = { status: "off", bucket: Math.round(a.bucket * 10) / 10, reason: stage.flagOn ? "RULE_MATCH" : "OFF" };
    }
  }

  return {
    mode: "simulation",
    flagKey,
    flagOn: stage.flagOn,
    rolloutPct: stage.pct,
    stageLabel: excluded.size && stage.flagOn ? stage.label.replace("service areas", "eligible areas") : stage.label,
    areas,
    updatedAt: Date.now(),
  };
}
