import { NextResponse } from "next/server";
import { evaluateAllAreas, getFlagKey, getSdkKey } from "@/lib/rollout/ld";
import type { RolloutApiResponse } from "@/lib/rollout/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const flagKey = getFlagKey();
  const sdkKey = getSdkKey();

  if (!sdkKey) {
    const body: RolloutApiResponse = {
      mode: "simulation",
      flagKey,
      reason: "LD_SDK_KEY is not set; running the built-in simulated rollout.",
    };
    return NextResponse.json(body, { headers: noStore });
  }

  try {
    const snapshot = await evaluateAllAreas(sdkKey, flagKey);
    return NextResponse.json(snapshot satisfies RolloutApiResponse, { headers: noStore });
  } catch (err) {
    console.error("[api/rollout]", err);
    const body: RolloutApiResponse = {
      mode: "simulation",
      flagKey,
      reason: "LaunchDarkly evaluation failed; falling back to the simulated rollout.",
    };
    return NextResponse.json(body, { status: 200, headers: noStore });
  }
}
