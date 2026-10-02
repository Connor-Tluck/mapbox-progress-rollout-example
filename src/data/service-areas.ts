/**
 * Service areas: the unit of rollout in this demo.
 *
 * Each service area becomes one LaunchDarkly context of kind `service-area`.
 * Every hex on the map is assigned to the nearest service-area centroid
 * within its province (see scripts/build-hexes.ts), so when a flag turns on
 * for an area, all of its hexes light up together.
 *
 * Add, remove or move areas freely, then re-run `pnpm hexes` to rebuild the grid.
 */

export type Province =
  | "BC" | "AB" | "SK" | "MB" | "ON" | "QC"
  | "NB" | "NS" | "PE" | "NL" | "YT" | "NT" | "NU";

export type Region = "West" | "Prairies" | "Central" | "Atlantic" | "North";

export type PopulationTier = "metro" | "regional" | "remote";

export interface ServiceArea {
  /** Stable key; used as the LaunchDarkly context key. */
  id: string;
  name: string;
  province: Province;
  region: Region;
  populationTier: PopulationTier;
  /** Centroid used to assign hexes (nearest centroid within the same province). */
  lat: number;
  lng: number;
}

export const PROVINCE_NAMES: Record<Province, string> = {
  BC: "British Columbia",
  AB: "Alberta",
  SK: "Saskatchewan",
  MB: "Manitoba",
  ON: "Ontario",
  QC: "Québec",
  NB: "New Brunswick",
  NS: "Nova Scotia",
  PE: "Prince Edward Island",
  NL: "Newfoundland and Labrador",
  YT: "Yukon",
  NT: "Northwest Territories",
  NU: "Nunavut",
};

export const REGION_ORDER: Region[] = ["West", "Prairies", "Central", "Atlantic", "North"];

export const SERVICE_AREAS: ServiceArea[] = [
  // ── West ───────────────────────────────────────────────────────────────
  { id: "greater-vancouver", name: "Greater Vancouver", province: "BC", region: "West", populationTier: "metro", lat: 49.25, lng: -123.0 },
  { id: "vancouver-island", name: "Vancouver Island", province: "BC", region: "West", populationTier: "regional", lat: 49.4, lng: -125.2 },
  { id: "bc-interior", name: "BC Interior", province: "BC", region: "West", populationTier: "regional", lat: 50.3, lng: -119.6 },
  { id: "northern-bc", name: "Northern BC", province: "BC", region: "West", populationTier: "remote", lat: 55.5, lng: -124.5 },

  // ── Prairies ───────────────────────────────────────────────────────────
  { id: "calgary", name: "Calgary", province: "AB", region: "Prairies", populationTier: "metro", lat: 51.05, lng: -114.07 },
  { id: "edmonton", name: "Edmonton", province: "AB", region: "Prairies", populationTier: "metro", lat: 53.55, lng: -113.5 },
  { id: "southern-alberta", name: "Southern Alberta", province: "AB", region: "Prairies", populationTier: "regional", lat: 49.7, lng: -112.5 },
  { id: "northern-alberta", name: "Northern Alberta", province: "AB", region: "Prairies", populationTier: "remote", lat: 57.0, lng: -114.0 },
  { id: "saskatoon", name: "Saskatoon", province: "SK", region: "Prairies", populationTier: "regional", lat: 52.13, lng: -106.67 },
  { id: "regina", name: "Regina", province: "SK", region: "Prairies", populationTier: "regional", lat: 50.45, lng: -104.6 },
  { id: "northern-saskatchewan", name: "Northern Saskatchewan", province: "SK", region: "Prairies", populationTier: "remote", lat: 56.5, lng: -106.0 },
  { id: "winnipeg", name: "Winnipeg", province: "MB", region: "Prairies", populationTier: "metro", lat: 49.9, lng: -97.14 },
  { id: "northern-manitoba", name: "Northern Manitoba", province: "MB", region: "Prairies", populationTier: "remote", lat: 55.5, lng: -97.5 },

  // ── Central ────────────────────────────────────────────────────────────
  { id: "greater-toronto", name: "Greater Toronto", province: "ON", region: "Central", populationTier: "metro", lat: 43.75, lng: -79.4 },
  { id: "golden-horseshoe", name: "Golden Horseshoe", province: "ON", region: "Central", populationTier: "metro", lat: 43.2, lng: -79.9 },
  { id: "ottawa-gatineau", name: "Ottawa–Gatineau", province: "ON", region: "Central", populationTier: "metro", lat: 45.42, lng: -75.7 },
  { id: "southwestern-ontario", name: "Southwestern Ontario", province: "ON", region: "Central", populationTier: "regional", lat: 42.98, lng: -81.25 },
  { id: "eastern-ontario", name: "Eastern Ontario", province: "ON", region: "Central", populationTier: "regional", lat: 44.3, lng: -76.5 },
  { id: "northeastern-ontario", name: "Northeastern Ontario", province: "ON", region: "Central", populationTier: "remote", lat: 47.5, lng: -81.0 },
  { id: "northwestern-ontario", name: "Northwestern Ontario", province: "ON", region: "Central", populationTier: "remote", lat: 50.5, lng: -89.0 },
  { id: "far-north-ontario", name: "Far North Ontario", province: "ON", region: "Central", populationTier: "remote", lat: 54.0, lng: -85.0 },
  { id: "montreal", name: "Montréal", province: "QC", region: "Central", populationTier: "metro", lat: 45.5, lng: -73.6 },
  { id: "quebec-city", name: "Québec City", province: "QC", region: "Central", populationTier: "metro", lat: 46.81, lng: -71.21 },
  { id: "eastern-townships", name: "Eastern Townships", province: "QC", region: "Central", populationTier: "regional", lat: 45.4, lng: -71.9 },
  { id: "outaouais-laurentides", name: "Outaouais–Laurentides", province: "QC", region: "Central", populationTier: "regional", lat: 46.3, lng: -75.5 },
  { id: "saguenay", name: "Saguenay–Lac-Saint-Jean", province: "QC", region: "Central", populationTier: "regional", lat: 48.6, lng: -71.8 },
  { id: "gaspesie", name: "Gaspésie–Bas-Saint-Laurent", province: "QC", region: "Central", populationTier: "regional", lat: 48.6, lng: -67.5 },
  { id: "cote-nord", name: "Côte-Nord", province: "QC", region: "Central", populationTier: "remote", lat: 50.5, lng: -64.0 },
  { id: "nord-du-quebec", name: "Nord-du-Québec", province: "QC", region: "Central", populationTier: "remote", lat: 54.5, lng: -74.0 },

  // ── Atlantic ───────────────────────────────────────────────────────────
  { id: "moncton", name: "Moncton", province: "NB", region: "Atlantic", populationTier: "regional", lat: 46.1, lng: -64.8 },
  { id: "saint-john-fredericton", name: "Saint John–Fredericton", province: "NB", region: "Atlantic", populationTier: "regional", lat: 45.7, lng: -66.3 },
  { id: "halifax", name: "Halifax", province: "NS", region: "Atlantic", populationTier: "metro", lat: 44.65, lng: -63.6 },
  { id: "cape-breton", name: "Cape Breton", province: "NS", region: "Atlantic", populationTier: "regional", lat: 46.2, lng: -60.7 },
  { id: "prince-edward-island", name: "Prince Edward Island", province: "PE", region: "Atlantic", populationTier: "regional", lat: 46.3, lng: -63.3 },
  { id: "st-johns", name: "St. John's", province: "NL", region: "Atlantic", populationTier: "regional", lat: 47.56, lng: -52.7 },
  { id: "western-newfoundland", name: "Western Newfoundland", province: "NL", region: "Atlantic", populationTier: "remote", lat: 49.0, lng: -56.5 },
  { id: "labrador", name: "Labrador", province: "NL", region: "Atlantic", populationTier: "remote", lat: 54.0, lng: -61.5 },

  // ── North ──────────────────────────────────────────────────────────────
  { id: "yukon", name: "Yukon", province: "YT", region: "North", populationTier: "remote", lat: 63.5, lng: -136.0 },
  { id: "northwest-territories", name: "Northwest Territories", province: "NT", region: "North", populationTier: "remote", lat: 64.5, lng: -120.0 },
  { id: "kivalliq-kitikmeot", name: "Kivalliq–Kitikmeot", province: "NU", region: "North", populationTier: "remote", lat: 65.5, lng: -98.0 },
  { id: "qikiqtaaluk", name: "Qikiqtaaluk (Baffin)", province: "NU", region: "North", populationTier: "remote", lat: 70.0, lng: -78.0 },
];

export const SERVICE_AREA_BY_ID: Record<string, ServiceArea> = Object.fromEntries(
  SERVICE_AREAS.map((a) => [a.id, a]),
);
