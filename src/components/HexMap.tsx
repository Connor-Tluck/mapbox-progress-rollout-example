"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Popup, ExpressionSpecification, LngLatBoundsLike } from "mapbox-gl";
import { PROVINCE_NAMES, SERVICE_AREA_BY_ID } from "@/data/service-areas";
import type { HexCollection } from "@/hooks/useHexData";
import { STATUS_COLORS, STATUS_LABELS, type AreaStatus, type RolloutSnapshot } from "@/lib/rollout/types";

/** Bounding box of Canada, [west, south, east, north]. The view is locked to this. */
const CANADA_BOUNDS: [number, number, number, number] = [-141.5, 41.5, -52.0, 83.3];
/** Space reserved for the control panel on the right, in px. */
const PANEL_WIDTH = 392;

const SOURCE_ID = "hexes";
const FILL_LAYER = "hex-fill";
const LINE_LAYER = "hex-line";
const HOVER_LAYER = "hex-hover";

const OPACITY: Record<AreaStatus, number> = { off: 0.42, pending: 0.62, enabled: 0.8 };

interface Props {
  token: string;
  hexes: HexCollection | null;
  snapshot: RolloutSnapshot | null;
  hoveredAreaId: string | null;
  onHoverArea: (areaId: string | null) => void;
}

/** Build a data-driven `match` on areaId → value, with a fallback. */
function matchByArea<T extends string | number>(
  snapshot: RolloutSnapshot | null,
  pick: (status: AreaStatus) => T,
  fallback: T,
): ExpressionSpecification {
  const pairs: (string | T)[] = [];
  if (snapshot) {
    for (const [areaId, state] of Object.entries(snapshot.areas)) pairs.push(areaId, pick(state.status));
  }
  if (pairs.length === 0) return ["literal", fallback] as unknown as ExpressionSpecification;
  return ["match", ["get", "areaId"], ...pairs, fallback] as unknown as ExpressionSpecification;
}

export function HexMap({ token, hexes, snapshot, hoveredAreaId, onHoverArea }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const loadedRef = useRef(false);
  /** Flips to true once the style has loaded and our layers exist; effects below depend on it. */
  const [ready, setReady] = useState(false);
  const snapshotRef = useRef<RolloutSnapshot | null>(snapshot);
  const onHoverRef = useRef(onHoverArea);
  useEffect(() => {
    snapshotRef.current = snapshot;
    onHoverRef.current = onHoverArea;
  }, [snapshot, onHoverArea]);

  // ── Create the map once ─────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (disposed || !containerRef.current) return;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        // Lambert conformal conic (Statistics Canada standard) keeps the Arctic from
        // dominating the frame the way Mercator does, and keeps hexes hex-shaped.
        projection: { name: "lambertConformalConic", center: [-96, 60], parallels: [49, 77] },
        bounds: CANADA_BOUNDS,
        fitBoundsOptions: { padding: { top: 72, bottom: 72, left: 56, right: PANEL_WIDTH + 24 } },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: false,
        logoPosition: "bottom-right",
      });
      map.touchZoomRotate.disableRotation();
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }), "top-left");
      mapRef.current = map;

      map.on("load", () => {
        // Tone down the basemap so the hexes carry the story.
        for (const layer of map.getStyle()?.layers ?? []) {
          if (layer.type === "symbol" && /label|place|poi/.test(layer.id)) {
            map.setPaintProperty(layer.id, "text-opacity", 0.55);
          }
        }

        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          promoteId: "h3",
        });

        map.addLayer({
          id: FILL_LAYER,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": matchByArea(snapshotRef.current, (s) => STATUS_COLORS[s], STATUS_COLORS.off),
            "fill-opacity": matchByArea(snapshotRef.current, (s) => OPACITY[s], OPACITY.off),
            "fill-color-transition": { duration: 650, delay: 0 },
            "fill-opacity-transition": { duration: 650, delay: 0 },
          },
        });
        map.addLayer({
          id: LINE_LAYER,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": "#191919",
            "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.8, 6, 2],
            "line-opacity": 0.9,
          },
        });
        map.addLayer({
          id: HOVER_LAYER,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": "#F8F8F8",
            "line-width": ["interpolate", ["linear"], ["zoom"], 2, 1.2, 6, 2.5],
            "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.95, 0],
          },
        });

        // Hover: highlight the whole service area and show a popup.
        const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10, maxWidth: "260px" });
        popupRef.current = popup;
        let lastArea: string | null = null;

        map.on("mousemove", FILL_LAYER, (e) => {
          const f = e.features?.[0] as { properties?: Record<string, unknown> } | undefined;
          const areaId = (f?.properties?.areaId as string | undefined) ?? null;
          const h3 = f?.properties?.h3 as string | undefined;
          map.getCanvas().style.cursor = areaId ? "pointer" : "";
          if (areaId !== lastArea) {
            lastArea = areaId;
            onHoverRef.current(areaId);
          }
          if (areaId && h3) {
            popup.setLngLat(e.lngLat).setHTML(popupHtml(areaId, h3, snapshotRef.current)).addTo(map);
          }
        });
        map.on("mouseleave", FILL_LAYER, () => {
          map.getCanvas().style.cursor = "";
          lastArea = null;
          onHoverRef.current(null);
          popup.remove();
        });

        loadedRef.current = true;
        setReady(true);
      });
    })();

    return () => {
      disposed = true;
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
      loadedRef.current = false;
      setReady(false);
    };
  }, [token]);

  // ── Push hex geometry into the source ───────────────────────────────
  const fittedRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !hexes) return;
    const src = map.getSource(SOURCE_ID) as { setData?: (d: unknown) => void } | undefined;
    src?.setData?.(hexes);
    if (!fittedRef.current) {
      fittedRef.current = true;
      fitToHexes(map, hexes);
    }
  }, [hexes, ready]);

  // ── Recolour on every snapshot change (paint changes are transitioned) ─
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer(FILL_LAYER)) return;
    map.setPaintProperty(FILL_LAYER, "fill-color", matchByArea(snapshot, (s) => STATUS_COLORS[s], STATUS_COLORS.off));
    map.setPaintProperty(FILL_LAYER, "fill-opacity", matchByArea(snapshot, (s) => OPACITY[s], OPACITY.off));
  }, [snapshot, ready]);

  // ── Hover highlight (driven by either the map or the side panel) ─────
  const prevHoverRef = useRef<string[]>([]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hexes || !ready) return;
    for (const id of prevHoverRef.current) map.setFeatureState({ source: SOURCE_ID, id }, { hover: false });
    const ids = hoveredAreaId
      ? hexes.features.filter((f) => f.properties.areaId === hoveredAreaId).map((f) => f.properties.h3)
      : [];
    for (const id of ids) map.setFeatureState({ source: SOURCE_ID, id }, { hover: true });
    prevHoverRef.current = ids;
  }, [hoveredAreaId, hexes, snapshot, ready]);

  // Inline style on purpose: mapbox-gl.css sets `.mapboxgl-map { position: relative }` and, being
  // unlayered, it beats Tailwind's layered `absolute inset-0` utilities.
  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      aria-label="Map of Canada showing service area rollout"
    />
  );
}

/**
 * Fit the camera so every hex is visible inside the padded viewport, then lock the view there.
 * Works by measuring projected pixels, so it is correct for any projection (Mapbox's own
 * fitBounds is only an approximation under non-Mercator projections).
 */
function fitToHexes(map: MapboxMap, hexes: HexCollection) {
  const pad = { top: 72, bottom: 56, left: 56, right: PANEL_WIDTH + 24 };
  const points: [number, number][] = hexes.features.flatMap((f) => f.geometry.coordinates[0] as [number, number][]);

  const measure = () => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      const { x, y } = map.project(p);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY };
  };

  const canvas = map.getCanvas();
  const availW = canvas.clientWidth - pad.left - pad.right;
  const availH = canvas.clientHeight - pad.top - pad.bottom;

  // Iterate a few times: zoom to fit, then recentre on the padded box centre.
  for (let i = 0; i < 4; i++) {
    const b = measure();
    const scale = Math.min(availW / (b.maxX - b.minX), availH / (b.maxY - b.minY));
    map.setZoom(map.getZoom() + Math.log2(scale));
    const b2 = measure();
    const bboxCx = (b2.minX + b2.maxX) / 2;
    const bboxCy = (b2.minY + b2.maxY) / 2;
    const targetCx = pad.left + availW / 2;
    const targetCy = pad.top + availH / 2;
    const current = map.project(map.getCenter());
    map.setCenter(map.unproject([current.x + (bboxCx - targetCx), current.y + (bboxCy - targetCy)]));
  }

  // Lock: can't zoom out past this view, can zoom in to ~8, can't pan far from Canada.
  map.setMinZoom(map.getZoom() - 0.1);
  map.setMaxZoom(8);
  const [w, s, e, n] = CANADA_BOUNDS;
  const padX = (e - w) * 0.3;
  const padY = (n - s) * 0.25;
  const maxBounds: LngLatBoundsLike = [
    [w - padX, Math.max(-85, s - padY)],
    [e + padX, Math.min(85, n + padY)],
  ];
  map.setMaxBounds(maxBounds);
}

function popupHtml(areaId: string, h3: string, snapshot: RolloutSnapshot | null): string {
  const area = SERVICE_AREA_BY_ID[areaId];
  const status = snapshot?.areas[areaId]?.status ?? "off";
  const color = STATUS_COLORS[status];
  const name = area?.name ?? areaId;
  const province = area ? PROVINCE_NAMES[area.province] : "";
  return `
    <div style="display:flex;flex-direction:column;gap:6px;min-width:180px">
      <div style="font-weight:500;font-size:14px;line-height:1.2">${escapeHtml(name)}</div>
      <div style="font-size:12px;color:#A7A9AC">${escapeHtml(province)}${area ? ` · ${area.populationTier}` : ""}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
        <span style="width:8px;height:8px;border-radius:999px;background:${color};box-shadow:0 0 0 3px ${color}33"></span>
        <span style="font-size:12px;font-weight:500">${STATUS_LABELS[status]}</span>
      </div>
      <div style="font-family:ui-monospace,monospace;font-size:10.5px;color:#6D6E71">hex ${h3}</div>
    </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
