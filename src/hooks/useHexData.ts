"use client";

import { useEffect, useMemo, useState } from "react";
import type { Province } from "@/data/service-areas";

export interface HexFeature {
  type: "Feature";
  properties: { h3: string; province: Province; areaId: string };
  geometry: { type: "Polygon"; coordinates: number[][][] };
}

export interface HexCollection {
  type: "FeatureCollection";
  resolution: number;
  features: HexFeature[];
}

/** Loads the pre-built hex grid from /data/hexes.json once. */
export function useHexData() {
  const [hexes, setHexes] = useState<HexCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/hexes.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load hex grid (${r.status})`);
        return r.json() as Promise<HexCollection>;
      })
      .then((fc) => {
        if (!cancelled) setHexes(fc);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hexCountByArea = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of hexes?.features ?? []) {
      counts[f.properties.areaId] = (counts[f.properties.areaId] ?? 0) + 1;
    }
    return counts;
  }, [hexes]);

  return { hexes, hexCountByArea, error };
}
