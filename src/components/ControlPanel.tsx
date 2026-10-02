"use client";

import { useMemo } from "react";
import { PROVINCE_NAMES, REGION_ORDER, SERVICE_AREAS } from "@/data/service-areas";
import { DEFAULT_STAGES, EXCLUDED_REGION } from "@/lib/rollout/simulation";
import { STATUS_COLORS, STATUS_LABELS, type AreaStatus } from "@/lib/rollout/types";
import type { RolloutControls } from "@/hooks/useRollout";
import { Legend } from "./Legend";

interface Props extends RolloutControls {
  hexCountByArea: Record<string, number>;
  hoveredAreaId: string | null;
  onHoverArea: (id: string | null) => void;
}

export function ControlPanel(props: Props) {
  const {
    snapshot,
    connection,
    simulationReason,
    isPlaying,
    toggle,
    reset,
    stageIndex,
    setStageIndex,
    stageCount,
    speed,
    setSpeed,
    excludeNorth,
    setExcludeNorth,
    stageProgress,
    lastUpdated,
    hexCountByArea,
    hoveredAreaId,
    onHoverArea,
  } = props;

  const counts = useMemo(() => {
    const c = { areas: { off: 0, pending: 0, enabled: 0 }, hexes: { off: 0, pending: 0, enabled: 0 } };
    if (!snapshot) return c;
    for (const a of SERVICE_AREAS) {
      const s = snapshot.areas[a.id]?.status ?? "off";
      c.areas[s]++;
      c.hexes[s] += hexCountByArea[a.id] ?? 0;
    }
    return c;
  }, [snapshot, hexCountByArea]);

  const totalAreas = SERVICE_AREAS.length;
  const isLive = connection === "live";
  const pct = snapshot?.rolloutPct ?? 0;
  const atEnd = stageIndex >= stageCount - 1;

  return (
    <aside className="glass pointer-events-auto flex h-full w-[360px] flex-col rounded-2xl text-ld-gray-01">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <div className="eyebrow">Progressive rollout</div>
          <h2 className="font-display mt-1 text-[18px] font-bold leading-tight tracking-[-0.02em]">
            Canada service areas
          </h2>
        </div>
        <ModeBadge connection={connection} />
      </div>

      <div className="mt-4 px-5">
        <div className="flex items-center gap-2 text-[12px] text-ld-gray-03">
          <span>Flag</span>
          <code className="rounded-md bg-white/6 px-1.5 py-0.5 font-mono text-[11.5px] text-ld-gray-01">
            {snapshot?.flagKey ?? "service-area-rollout"}
          </code>
          <span className="ml-auto flex items-center gap-1.5">
            <span
              className={`dot ${snapshot?.flagOn ? "text-status-enabled" : "text-status-off"}`}
              aria-hidden
            />
            {snapshot?.flagOn ? "On" : "Off"}
          </span>
        </div>
      </div>

      {/* Big stage readout */}
      <div className="mx-5 mt-5 rounded-xl border border-white/8 bg-white/4 p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="eyebrow">{isLive ? "Observed rollout" : "Rollout stage"}</div>
            <div className="font-display mt-1 flex items-baseline gap-1 leading-none">
              <span className="text-[56px] font-bold tracking-[-0.03em] tabular-nums">{pct}</span>
              <span className="text-[22px] font-bold text-ld-gray-03">%</span>
            </div>
          </div>
          <div className="text-right text-[12px] text-ld-gray-03">
            <div className="text-[13px] font-medium text-ld-gray-01">{snapshot?.stageLabel ?? "Connecting…"}</div>
            <div className="mt-1">
              {counts.areas.enabled}/{totalAreas} areas enabled
            </div>
          </div>
        </div>

        {/* Stacked status bar */}
        <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-white/8">
          {(["enabled", "pending", "off"] as AreaStatus[]).map((s) => (
            <div
              key={s}
              className="h-full transition-[width] duration-500 ease-ld"
              style={{ width: `${(counts.hexes[s] / Math.max(1, totalHexes(counts.hexes))) * 100}%`, background: STATUS_COLORS[s] }}
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11.5px] text-ld-gray-03">
          {(["enabled", "pending", "off"] as AreaStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="dot" style={{ color: STATUS_COLORS[s] }} aria-hidden />
              <span className="tabular-nums text-ld-gray-01">{counts.hexes[s]}</span>
              <span>hexes</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transport controls (simulation) or live hint */}
      <div className="mx-5 mt-4">
        {isLive ? (
          <div className="rounded-xl border border-ld-blue/30 bg-ld-blue/10 p-3 text-[12.5px] leading-relaxed text-ld-gray-01">
            <div className="font-medium">Driven by LaunchDarkly</div>
            <div className="mt-0.5 text-ld-gray-03">
              Start a progressive rollout, add a targeting rule on <code className="font-mono">province</code>, or
              toggle the flag off. The map updates within ~2 seconds.
            </div>
            {lastUpdated && (
              <div className="mt-1.5 font-mono text-[10.5px] text-ld-gray-04">
                updated {new Date(lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggle}
                disabled={connection !== "simulation"}
                className="group flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-ld-blue font-medium text-white transition-colors duration-200 ease-ld hover:bg-ld-blue-dark active:scale-[0.98] disabled:opacity-50"
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                <span>{isPlaying ? "Pause" : atEnd ? "Replay rollout" : stageIndex === 0 ? "Play rollout" : "Resume"}</span>
              </button>
              <button
                type="button"
                onClick={reset}
                title="Reset to flag off"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/4 text-ld-gray-01 transition-colors duration-200 ease-ld hover:bg-white/8 active:scale-[0.98]"
              >
                <ResetIcon />
              </button>
              <div className="flex h-11 items-center rounded-lg border border-white/10 bg-white/4 p-1">
                {[1, 2, 4].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={`h-full rounded-md px-2 font-mono text-[11.5px] transition-colors duration-200 ease-ld ${
                      speed === s ? "bg-white/12 text-ld-gray-01" : "text-ld-gray-03 hover:text-ld-gray-01"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            {/* Stage scrubber */}
            <div className="mt-4">
              <input
                type="range"
                className="scrubber"
                min={0}
                max={stageCount - 1}
                step={1}
                value={stageIndex}
                onChange={(e) => setStageIndex(Number(e.target.value))}
                aria-label="Rollout stage"
                style={{ ["--fill" as string]: `${((stageIndex + (isPlaying ? stageProgress : 0)) / (stageCount - 1)) * 100}%` }}
              />
              <div className="mt-2 flex justify-between font-mono text-[10.5px] text-ld-gray-04">
                {DEFAULT_STAGES.map((st, i) => (
                  <button
                    key={st.label}
                    type="button"
                    onClick={() => setStageIndex(i)}
                    className={`transition-colors duration-200 ease-ld hover:text-ld-gray-01 ${i === stageIndex ? "text-ld-gray-01" : ""}`}
                  >
                    {st.flagOn ? `${st.pct}%` : "off"}
                  </button>
                ))}
              </div>
            </div>
            {/* Simulated targeting rule */}
            <button
              type="button"
              role="switch"
              aria-checked={excludeNorth}
              onClick={() => setExcludeNorth(!excludeNorth)}
              className="mt-4 flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-left transition-colors duration-200 ease-ld hover:bg-white/6"
            >
              <span
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-ld ${excludeNorth ? "bg-status-off" : "bg-white/15"}`}
                aria-hidden
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left] duration-200 ease-ld ${excludeNorth ? "left-[18px]" : "left-0.5"}`}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium">Targeting rule</span>
                <span className="block truncate font-mono text-[11px] text-ld-gray-03">
                  region is {EXCLUDED_REGION} → serve <span className="text-status-off">false</span>
                </span>
              </span>
              <span className="shrink-0 text-[11px] text-ld-gray-04">{excludeNorth ? "On" : "Off"}</span>
            </button>
            {simulationReason && (
              <div className="mt-3 text-[11px] leading-relaxed text-ld-gray-04">
                Simulated. Set <code className="font-mono">LD_SDK_KEY</code> to drive this from a real flag.
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="mx-5 mt-4 border-t border-white/8 pt-4">
        <Legend />
      </div>

      {/* Area list */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-white/8">
        <div className="eyebrow px-5 pt-4">Service areas</div>
        <div className="scroll-thin mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3" onMouseLeave={() => onHoverArea(null)}>
          {REGION_ORDER.map((region) => {
            const areas = SERVICE_AREAS.filter((a) => a.region === region);
            return (
              <div key={region} className="mb-2">
                <div className="px-3 pb-1 pt-2 text-[11px] font-medium text-ld-gray-04">{region}</div>
                {areas.map((a) => {
                  const state = snapshot?.areas[a.id];
                  const s = state?.status ?? "off";
                  const label = s === "off" && state?.reason === "RULE_MATCH" ? "Excluded" : STATUS_LABELS[s];
                  const active = hoveredAreaId === a.id;
                  return (
                    <div
                      key={a.id}
                      onMouseEnter={() => onHoverArea(a.id)}
                      className={`flex cursor-default items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors duration-150 ease-ld ${
                        active ? "bg-white/8" : "hover:bg-white/5"
                      }`}
                    >
                      <span className={`dot ${s === "pending" ? "pulse" : ""}`} style={{ color: STATUS_COLORS[s] }} aria-hidden />
                      <span className="truncate">{a.name}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-ld-gray-04">{PROVINCE_NAMES[a.province]}</span>
                      <span className="w-[62px] shrink-0 text-right text-[11px]" style={{ color: STATUS_COLORS[s] }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function totalHexes(h: Record<AreaStatus, number>) {
  return h.off + h.pending + h.enabled;
}

function ModeBadge({ connection }: { connection: RolloutControls["connection"] }) {
  const map = {
    connecting: { label: "Connecting", cls: "border-white/10 text-ld-gray-03", dot: "text-ld-gray-03 pulse" },
    live: { label: "Live · LaunchDarkly", cls: "border-ld-blue/40 bg-ld-blue/15 text-ld-gray-01", dot: "text-ld-blue-light pulse" },
    simulation: { label: "Simulated", cls: "border-white/10 bg-white/5 text-ld-gray-01", dot: "text-ld-orange" },
  }[connection];
  return (
    <span className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${map.cls}`}>
      <span className={`dot ${map.dot}`} aria-hidden />
      {map.label}
    </span>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.52.86l10.5-6.5a1 1 0 0 0 0-1.72L9.52 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}
