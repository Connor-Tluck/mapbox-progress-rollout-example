"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_STAGES,
  DEFAULT_STAGE_DURATION_MS,
  buildSimulationSnapshot,
  rankedAreas,
} from "@/lib/rollout/simulation";
import type { RolloutApiResponse, RolloutSnapshot } from "@/lib/rollout/types";

const LIVE_POLL_MS = 2000;
const DEFAULT_FLAG_KEY = "service-area-rollout";

export type ConnectionState = "connecting" | "live" | "simulation";

export interface RolloutControls {
  snapshot: RolloutSnapshot | null;
  connection: ConnectionState;
  /** Why we are in simulation mode (shown as a hint). */
  simulationReason: string | null;
  // Simulation controls (no-ops in live mode)
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  stageIndex: number;
  setStageIndex: (i: number) => void;
  stageCount: number;
  speed: number;
  setSpeed: (s: number) => void;
  /** Simulated targeting rule `region is North → false`. */
  excludeNorth: boolean;
  setExcludeNorth: (v: boolean) => void;
  /** Progress (0–1) through the current stage's hold time. */
  stageProgress: number;
  lastUpdated: number | null;
}

export function useRollout(): RolloutControls {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [simulationReason, setSimulationReason] = useState<string | null>(null);
  const [flagKey, setFlagKey] = useState(DEFAULT_FLAG_KEY);
  const [liveSnapshot, setLiveSnapshot] = useState<RolloutSnapshot | null>(null);

  const [stageIndex, setStageIndexState] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [excludeNorth, setExcludeNorth] = useState(true);
  const [stageProgress, setStageProgress] = useState(0);

  // ── Decide mode & poll when live ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const res = await fetch("/api/rollout", { cache: "no-store" });
        const body = (await res.json()) as RolloutApiResponse;
        if (cancelled) return;
        setFlagKey(body.flagKey);
        if (body.mode === "live") {
          setConnection("live");
          setLiveSnapshot(body);
          timer = setTimeout(tick, LIVE_POLL_MS);
        } else {
          setConnection("simulation");
          setSimulationReason("reason" in body ? body.reason : null);
        }
      } catch {
        if (cancelled) return;
        setConnection("simulation");
        setSimulationReason("Could not reach /api/rollout; running the simulated rollout.");
      }
    };
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // ── Simulation engine ────────────────────────────────────────────────
  const ranked = useMemo(() => rankedAreas(flagKey), [flagKey]);
  const stages = DEFAULT_STAGES;

  const simSnapshot = useMemo(
    () => buildSimulationSnapshot(flagKey, stages[stageIndex], ranked, excludeNorth),
    [flagKey, stages, stageIndex, ranked, excludeNorth],
  );

  // Advance stages while playing. State updates happen inside the rAF callback.
  useEffect(() => {
    if (connection !== "simulation" || !isPlaying || stageIndex >= stages.length - 1) return;
    const hold = DEFAULT_STAGE_DURATION_MS / speed;
    const start = performance.now();
    let raf = 0;
    const loop = () => {
      const p = Math.min(1, (performance.now() - start) / hold);
      setStageProgress(p);
      if (p >= 1) {
        const next = Math.min(stageIndex + 1, stages.length - 1);
        setStageIndexState(next);
        setStageProgress(0);
        if (next >= stages.length - 1) setPlaying(false);
      } else {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [connection, isPlaying, stageIndex, speed, stages.length]);

  const play = useCallback(() => {
    // Restart from the beginning if we're already fully rolled out.
    setStageIndexState((i) => (i >= stages.length - 1 ? 0 : i));
    setPlaying(true);
  }, [stages.length]);
  const pause = useCallback(() => {
    setPlaying(false);
    setStageProgress(0);
  }, []);
  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);
  const reset = useCallback(() => {
    setPlaying(false);
    setStageIndexState(0);
    setStageProgress(0);
  }, []);
  const setStageIndex = useCallback(
    (i: number) => {
      setStageIndexState(Math.max(0, Math.min(stages.length - 1, i)));
      setStageProgress(0);
    },
    [stages.length],
  );

  const snapshot = connection === "live" ? liveSnapshot : connection === "simulation" ? simSnapshot : null;

  return {
    snapshot,
    connection,
    simulationReason,
    isPlaying,
    play,
    pause,
    toggle,
    reset,
    stageIndex,
    setStageIndex,
    stageCount: stages.length,
    speed,
    setSpeed,
    excludeNorth,
    setExcludeNorth,
    stageProgress: isPlaying ? stageProgress : 0,
    lastUpdated: snapshot?.updatedAt ?? null,
  };
}
