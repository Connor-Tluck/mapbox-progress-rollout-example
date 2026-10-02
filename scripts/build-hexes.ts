/**
 * Build the hex grid for Canada.
 *
 * 1. Downloads Natural Earth 50m admin-1 boundaries (cached in scripts/.cache).
 * 2. Fills each Canadian province/territory polygon with H3 cells at HEX_RESOLUTION.
 * 3. Assigns every hex to the nearest service-area centroid within its province.
 * 4. Guarantees every service area owns at least one hex.
 * 5. Writes public/data/hexes.json (GeoJSON FeatureCollection).
 *
 * Run: pnpm hexes
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cellToBoundary, cellToLatLng, latLngToCell, polygonToCells } from "h3-js";
import { SERVICE_AREAS, type Province } from "../src/data/service-areas";

/** H3 resolution. 3 ≈ 12,400 km² per hex (~800 hexes for Canada). 4 ≈ 1,770 km² (~5,600 hexes). */
const HEX_RESOLUTION = Number(process.env.HEX_RESOLUTION ?? 3);

const NE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson";

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, ".cache");
const cacheFile = join(cacheDir, "ne_50m_admin_1.geojson");
const outFile = join(here, "..", "public", "data", "hexes.json");

type Ring = number[][];
type PolygonCoords = Ring[];
interface NEFeature {
  properties: { adm0_a3: string; postal: string; name: string };
  geometry: { type: "Polygon"; coordinates: PolygonCoords } | { type: "MultiPolygon"; coordinates: PolygonCoords[] };
}

async function loadNaturalEarth(): Promise<NEFeature[]> {
  if (!existsSync(cacheFile)) {
    console.log(`Downloading ${NE_URL} …`);
    const res = await fetch(NE_URL);
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cacheFile, await res.text());
  }
  const fc = JSON.parse(readFileSync(cacheFile, "utf8")) as { features: NEFeature[] };
  return fc.features.filter((f) => f.properties.adm0_a3 === "CAN");
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearestArea(lat: number, lng: number, province: Province): string {
  const candidates = SERVICE_AREAS.filter((a) => a.province === province);
  const pool = candidates.length ? candidates : SERVICE_AREAS;
  let best = pool[0];
  let bestD = Infinity;
  for (const a of pool) {
    const d = haversineKm(lat, lng, a.lat, a.lng);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best.id;
}

async function main() {
  const provinces = await loadNaturalEarth();
  console.log(`Found ${provinces.length} Canadian provinces/territories. Resolution ${HEX_RESOLUTION}.`);

  // hex -> province (first province whose polygon contains the hex centre wins)
  const hexProvince = new Map<string, Province>();
  for (const f of provinces) {
    const province = f.properties.postal as Province;
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    let count = 0;
    for (const poly of polys) {
      for (const h of polygonToCells(poly, HEX_RESOLUTION, true)) {
        if (!hexProvince.has(h)) {
          hexProvince.set(h, province);
          count++;
        }
      }
    }
    console.log(`  ${f.properties.name.padEnd(28)} ${String(count).padStart(4)} hexes`);
  }

  // Guarantee every service area owns at least one hex.
  for (const a of SERVICE_AREAS) {
    const h = latLngToCell(a.lat, a.lng, HEX_RESOLUTION);
    if (!hexProvince.has(h)) hexProvince.set(h, a.province);
  }

  const features = [...hexProvince.entries()].map(([h3, province]) => {
    const [lat, lng] = cellToLatLng(h3);
    const ring = cellToBoundary(h3, true);
    ring.push(ring[0]);
    return {
      type: "Feature" as const,
      properties: { h3, province, areaId: nearestArea(lat, lng, province) },
      geometry: { type: "Polygon" as const, coordinates: [ring] },
    };
  });

  // Ensure the forced centroid hexes actually map to their area (nearest-centroid may disagree
  // for tiny provinces); override explicitly.
  for (const a of SERVICE_AREAS) {
    const h = latLngToCell(a.lat, a.lng, HEX_RESOLUTION);
    const f = features.find((x) => x.properties.h3 === h);
    if (f) f.properties.areaId = a.id;
  }

  const perArea = new Map<string, number>();
  for (const f of features) perArea.set(f.properties.areaId, (perArea.get(f.properties.areaId) ?? 0) + 1);
  const missing = SERVICE_AREAS.filter((a) => !perArea.has(a.id));
  if (missing.length) throw new Error(`Areas with no hexes: ${missing.map((a) => a.id).join(", ")}`);

  console.log("\nHexes per service area:");
  for (const a of SERVICE_AREAS) console.log(`  ${a.name.padEnd(30)} ${String(perArea.get(a.id)).padStart(4)}`);

  const fc = { type: "FeatureCollection", resolution: HEX_RESOLUTION, features };
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(fc));
  console.log(`\nWrote ${features.length} hexes → ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
