/**
 * LaunchDarkly server-side evaluation for every service area.
 *
 * Each service area is evaluated as its own context of kind `service-area`,
 * so the SE can drive the map from the LaunchDarkly UI with:
 *   - a progressive rollout on the fallthrough (areas turn yellow → green over time)
 *   - targeting rules on `province`, `region` or `populationTier`
 *   - the flag kill switch (everything red)
 */
import { init, type LDClient, type LDContext, type LDEvaluationDetail } from "@launchdarkly/node-server-sdk";
import { SERVICE_AREAS } from "@/data/service-areas";
import type { AreaState, AreaStatus, RolloutSnapshot } from "./types";

export const DEFAULT_FLAG_KEY = "service-area-rollout";

export function getFlagKey(): string {
  return process.env.LD_FLAG_KEY?.trim() || DEFAULT_FLAG_KEY;
}

export function getSdkKey(): string | undefined {
  const key = process.env.LD_SDK_KEY?.trim();
  return key ? key : undefined;
}

// Keep one client per server process (survives HMR in dev via globalThis).
const g = globalThis as unknown as { __ldClient?: LDClient; __ldReady?: Promise<void> };

export async function getClient(sdkKey: string): Promise<LDClient> {
  if (!g.__ldClient) {
    g.__ldClient = init(sdkKey, { logger: undefined });
    g.__ldReady = g.__ldClient
      .waitForInitialization({ timeout: 5 })
      .then(() => undefined)
      .catch((err: unknown) => {
        console.error("[launchdarkly] initialization failed", err);
      });
  }
  await g.__ldReady;
  return g.__ldClient;
}

export function contextForArea(area: (typeof SERVICE_AREAS)[number]): LDContext {
  return {
    kind: "service-area",
    key: area.id,
    name: area.name,
    province: area.province,
    region: area.region,
    populationTier: area.populationTier,
  };
}

/** Map a LaunchDarkly evaluation to red / yellow / green. */
export function statusFromDetail(detail: LDEvaluationDetail): AreaStatus {
  if (detail.value === true) return "enabled";
  const kind = detail.reason?.kind;
  // False from the fallthrough means the area is in the rollout's scope but
  // hasn't been bucketed into the new variation yet.
  if (kind === "FALLTHROUGH") return "pending";
  // OFF, RULE_MATCH (explicitly excluded), TARGET_MATCH, PREREQUISITE_FAILED, ERROR → off
  return "off";
}

export async function evaluateAllAreas(sdkKey: string, flagKey: string): Promise<RolloutSnapshot> {
  const client = await getClient(sdkKey);

  const details = await Promise.all(
    SERVICE_AREAS.map((a) => client.variationDetail(flagKey, contextForArea(a), false)),
  );

  const areas: Record<string, AreaState> = {};
  let anyOn = false;
  let inScope = 0;
  let enabled = 0;
  SERVICE_AREAS.forEach((a, i) => {
    const d = details[i];
    const status = statusFromDetail(d);
    areas[a.id] = { status, reason: d.reason?.kind };
    if (d.reason?.kind !== "OFF") anyOn = true;
    if (status !== "off") inScope++;
    if (status === "enabled") enabled++;
  });

  const pct = inScope ? Math.round((enabled / inScope) * 100) : 0;
  return {
    mode: "live",
    flagKey,
    flagOn: anyOn,
    rolloutPct: pct,
    stageLabel: !anyOn
      ? "Flag off"
      : enabled === SERVICE_AREAS.length
        ? "100% — fully rolled out"
        : `${enabled} of ${SERVICE_AREAS.length} service areas enabled`,
    areas,
    updatedAt: Date.now(),
  };
}
