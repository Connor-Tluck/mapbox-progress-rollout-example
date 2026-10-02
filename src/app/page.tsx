"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { HexMap } from "@/components/HexMap";
import { ControlPanel } from "@/components/ControlPanel";
import { useHexData } from "@/hooks/useHexData";
import { useRollout } from "@/hooks/useRollout";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export default function Home() {
  const rollout = useRollout();
  const { hexes, hexCountByArea, error: hexError } = useHexData();
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);

  // Space toggles play/pause in simulation mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      rollout.toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rollout]);

  return (
    <main className="relative h-full w-full overflow-hidden bg-ld-black">
      {MAPBOX_TOKEN ? (
        <HexMap
          token={MAPBOX_TOKEN}
          hexes={hexes}
          snapshot={rollout.snapshot}
          hoveredAreaId={hoveredAreaId}
          onHoverArea={setHoveredAreaId}
        />
      ) : (
        <MissingToken />
      )}

      {/* Top-left brand lockup */}
      <header className="pointer-events-none absolute left-5 top-5 flex items-center gap-3">
        <div className="glass pointer-events-auto flex items-center gap-3 rounded-full py-2 pl-3 pr-4">
          <Image src="/brand/logo-white.png" alt="LaunchDarkly" width={129} height={20} priority />
          <span className="h-4 w-px bg-white/15" aria-hidden />
          <span className="text-[13px] text-ld-gray-03">Service area rollout demo</span>
        </div>
      </header>

      {hexError && (
        <div className="absolute bottom-5 left-5 rounded-lg border border-status-off/40 bg-status-off/15 px-3 py-2 text-[12px]">
          {hexError}
        </div>
      )}

      {/* Right-hand control panel */}
      <div className="pointer-events-none absolute inset-y-5 right-5">
        <ControlPanel
          {...rollout}
          hexCountByArea={hexCountByArea}
          hoveredAreaId={hoveredAreaId}
          onHoverArea={setHoveredAreaId}
        />
      </div>
    </main>
  );
}

function MissingToken() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_#2c2c2c_0%,_#191919_65%)]">
      <div className="glass mr-[392px] max-w-md rounded-2xl p-6">
        <div className="eyebrow">Setup required</div>
        <h1 className="font-display mt-2 text-[22px] font-bold tracking-[-0.02em]">Add a Mapbox token</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ld-gray-03">
          Create <code className="font-mono text-ld-gray-01">.env.local</code> with your public Mapbox access token, then
          restart the dev server.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-white/8 bg-black/40 p-3 font-mono text-[12px] text-ld-gray-01">
          NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
        </pre>
        <p className="mt-3 text-[12px] text-ld-gray-04">The rollout controls on the right already work without the map.</p>
      </div>
    </div>
  );
}
