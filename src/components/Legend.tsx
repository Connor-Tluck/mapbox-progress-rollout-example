import { STATUS_COLORS, STATUS_LABELS, type AreaStatus } from "@/lib/rollout/types";

const ORDER: AreaStatus[] = ["off", "pending", "enabled"];
const HINT: Record<AreaStatus, string> = {
  off: "Flag off or area excluded",
  pending: "In rollout, not yet bucketed in",
  enabled: "Feature live in this area",
};

export function HexSwatch({ color, className = "" }: { color: string; className?: string }) {
  return (
    <span
      className={`inline-block h-3 w-3.5 shrink-0 ${className}`}
      style={{
        background: color,
        clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
      }}
    />
  );
}

export function Legend({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "flex items-center gap-4" : "flex flex-col gap-2.5"}>
      {ORDER.map((s) => (
        <div key={s} className="flex items-center gap-2.5">
          <HexSwatch color={STATUS_COLORS[s]} />
          <div className="leading-tight">
            <div className="text-[13px] font-medium text-ld-gray-01">{STATUS_LABELS[s]}</div>
            {!compact && <div className="text-[11px] text-ld-gray-03">{HINT[s]}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
