import { readFileSync } from "fs";
import { join } from "path";
import type { Station } from "../shared/types";

interface CSVStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}

function parseCSV(): CSVStation[] {
  const csvPath = join(new URL(".", import.meta.url).pathname, "../MTA_Subway_Stations_20260510.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n");
  const header = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());

  const stations: CSVStation[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    // Parse CSV respecting quotes
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    if (row["Borough"] !== "M") continue;

    stations.push({
      id: row["GTFS Stop ID"],
      name: row["Stop Name"],
      lat: parseFloat(row["GTFS Latitude"]),
      lng: parseFloat(row["GTFS Longitude"]),
      lines: row["Daytime Routes"].split(/\s+/).filter(Boolean),
    });
  }

  return stations;
}

const csvStations = parseCSV();

export const MANHATTAN_STATIONS: Omit<Station, "ownedBy" | "chips">[] = csvStations.map((s) => ({
  id: s.id.toLowerCase(),
  name: s.name,
  lat: s.lat,
  lng: s.lng,
  lines: s.lines,
}));
