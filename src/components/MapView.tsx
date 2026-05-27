import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { GameState } from "../../shared/types";
import { ROUTE_COLORS } from "../constants";

interface StationData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}

interface MapData {
  stations: StationData[];
  edges: [string, string][];
  transfers: [string, string][];
}

interface GeoJSONFeature {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: { name: string; rt_symbol: string };
}

interface Props {
  game: GameState;
  teamId: string;
  hiddenChallengeTypes: Set<string>;
  hoveredChallengeId: string | null;
  selectedChallengeId: string | null;
  revealAll: boolean;
  onSelectStation: (id: string) => void;
  onSelectChallenge: (id: string) => void;
}

const MANHATTAN_BOUNDS = { minLat: 40.695, maxLat: 40.885, minLng: -74.025, maxLng: -73.900 };

function inManhattan(lng: number, lat: number) {
  return lat >= MANHATTAN_BOUNDS.minLat && lat <= MANHATTAN_BOUNDS.maxLat
    && lng >= MANHATTAN_BOUNDS.minLng && lng <= MANHATTAN_BOUNDS.maxLng;
}

export default function MapView({ game, teamId, hiddenChallengeTypes, hoveredChallengeId, selectedChallengeId, revealAll, onSelectStation, onSelectChallenge }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const staticLinesRef = useRef<L.LayerGroup | null>(null);
  const teamLinesRef = useRef<L.LayerGroup | null>(null);
  const stationLayerRef = useRef<L.LayerGroup | null>(null);
  const challengeLayerRef = useRef<L.LayerGroup | null>(null);
  const prevZoomRef = useRef<{ center: L.LatLng; zoom: number } | null>(null);

  // Per-station marker refs — updated in place instead of recreated
  const stationCirclesRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const stationRingsRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const stationHitAreasRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const challengeMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  // Stable callback refs — parent re-renders don't trigger map redraws
  const onSelectStationRef = useRef(onSelectStation);
  onSelectStationRef.current = onSelectStation;
  const onSelectChallengeRef = useRef(onSelectChallenge);
  onSelectChallengeRef.current = onSelectChallenge;

  const [mapData, setMapData] = useState<MapData | null>(null);
  const [lineGeo, setLineGeo] = useState<GeoJSONFeature[] | null>(null);

  // Coarse key that only changes when station ownership or chip counts change
  const ownershipKey = game.stations.map(s => `${s.id}:${s.ownedBy ?? ""}:${s.chips}`).join(",");

  // Load + filter GeoJSON to Manhattan only (742 → ~359 features)
  useEffect(() => {
    fetch(import.meta.env.BASE_URL + "manhattan-stations.json").then(r => r.json()).then(setMapData);
    fetch(import.meta.env.BASE_URL + "subway-lines.geojson").then(r => r.json()).then(data => {
      const filtered: GeoJSONFeature[] = data.features.filter((f: GeoJSONFeature) =>
        f.geometry.coordinates.some(([lng, lat]) => inManhattan(lng, lat))
      );
      setLineGeo(filtered);
    });
  }, []);

  // Init map once
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map("game-map", {
      center: [40.758, -73.985],
      zoom: 13,
      zoomControl: false,
      preferCanvas: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);

    // Layer order matters for canvas z-ordering: lines → stations → challenges
    staticLinesRef.current = L.layerGroup().addTo(map);
    teamLinesRef.current = L.layerGroup().addTo(map);
    stationLayerRef.current = L.layerGroup().addTo(map);
    challengeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Fly to selected challenge
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (selectedChallengeId) {
      const challenge = game.challenges.find(c => c.id === selectedChallengeId);
      if (challenge) {
        prevZoomRef.current = { center: map.getCenter(), zoom: map.getZoom() };
        map.flyTo([challenge.lat, challenge.lng], 16, { duration: 0.5 });
      }
    } else if (prevZoomRef.current) {
      map.flyTo(prevZoomRef.current.center, prevZoomRef.current.zoom, { duration: 0.5 });
      prevZoomRef.current = null;
    }
  }, [selectedChallengeId]);

  // Draw static (muted) lines ONCE when geo data loads — never cleared again
  useEffect(() => {
    if (!staticLinesRef.current || !lineGeo) return;
    lineGeo.forEach(feature => {
      const { coordinates } = feature.geometry;
      if (coordinates.length < 2) return;
      const latLngs: L.LatLngExpression[] = coordinates.map(([lng, lat]) => [lat, lng]);
      L.polyline(latLngs, {
        color: ROUTE_COLORS[feature.properties.rt_symbol] || "#555",
        weight: 3,
        opacity: 0.25,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(staticLinesRef.current!);
    });
  }, [lineGeo]);

  // Draw team-colored line overlay — only when ownership actually changes
  useEffect(() => {
    if (!teamLinesRef.current || !lineGeo) return;
    teamLinesRef.current.clearLayers();

    const capturedStations = game.stations.filter(s => s.ownedBy);
    if (capturedStations.length === 0) return;

    lineGeo.forEach(feature => {
      const { coordinates } = feature.geometry;
      if (coordinates.length < 2) return;
      const nearStart = findNearestCapturedStation(coordinates[0], capturedStations);
      const nearEnd = findNearestCapturedStation(coordinates[coordinates.length - 1], capturedStations);
      if (!nearStart || !nearEnd || nearStart.ownedBy !== nearEnd.ownedBy) return;
      const team = game.teams.find(t => t.id === nearStart.ownedBy);
      L.polyline(coordinates.map(([lng, lat]) => [lat, lng] as L.LatLngExpression), {
        color: team?.color || "#888",
        weight: 5,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(teamLinesRef.current!);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownershipKey, lineGeo, game.teams]);

  // Create station markers ONCE when mapData loads — never recreated
  useEffect(() => {
    if (!stationLayerRef.current || !mapData) return;
    stationCirclesRef.current.forEach(m => m.remove());
    stationRingsRef.current.forEach(m => m.remove());
    stationHitAreasRef.current.forEach(m => m.remove());
    stationCirclesRef.current.clear();
    stationRingsRef.current.clear();
    stationHitAreasRef.current.clear();

    // Detect stations sharing exact coordinates and offset them so all are tappable
    const coordGroups = new Map<string, string[]>();
    mapData.stations.forEach(s => {
      const key = `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`;
      if (!coordGroups.has(key)) coordGroups.set(key, []);
      coordGroups.get(key)!.push(s.id);
    });
    // Small offsets per position in the group (~10m apart)
    const GROUP_OFFSETS: [number, number][] = [[0, 0], [0.00009, 0], [-0.00009, 0], [0, 0.00009]];

    mapData.stations.forEach(station => {
      const key = `${station.lat.toFixed(5)},${station.lng.toFixed(5)}`;
      const groupIdx = coordGroups.get(key)!.indexOf(station.id);
      const [dlat, dlng] = GROUP_OFFSETS[groupIdx] ?? [0, 0];
      const latlng: L.LatLngExpression = [station.lat + dlat, station.lng + dlng];

      // Ownership ring (behind visible dot)
      const ring = L.circleMarker(latlng, {
        radius: 8, fillColor: "transparent", color: "transparent",
        weight: 2, opacity: 0, fillOpacity: 0, interactive: false,
      }).addTo(stationLayerRef.current!);
      stationRingsRef.current.set(station.id, ring);

      // Visible dot — non-interactive, just visual
      const circle = L.circleMarker(latlng, {
        radius: 4, fillColor: "#888", color: "#555",
        weight: 1, opacity: 1, fillOpacity: 0.5, interactive: false,
      }).addTo(stationLayerRef.current!);
      stationCirclesRef.current.set(station.id, circle);

      // Large invisible hit area — handles clicks and tooltip
      const hitArea = L.circleMarker(latlng, {
        radius: 15, fillColor: "transparent", color: "transparent",
        fillOpacity: 0, opacity: 0, interactive: true,
      });
      hitArea.bindTooltip(
        `<strong>${station.name}</strong><br><span style="opacity:0.7">${station.lines.join(" ")}</span>`,
        { direction: "top", offset: [0, -8], className: "subway-tooltip" }
      );
      hitArea.on("click", () => onSelectStationRef.current(station.id));
      hitArea.addTo(stationLayerRef.current!);
      stationHitAreasRef.current.set(station.id, hitArea);
    });
  }, [mapData]);

  // Update station marker styles in place — no recreation
  useEffect(() => {
    if (!mapData) return;
    const gameStationById = new Map(game.stations.map(s => [s.id, s]));

    mapData.stations.forEach(station => {
      const gs = gameStationById.get(station.id);
      const circle = stationCirclesRef.current.get(station.id);
      const ring = stationRingsRef.current.get(station.id);
      const hitArea = stationHitAreasRef.current.get(station.id);
      if (!circle) return;

      const owner = gs?.ownedBy;
      const team = owner ? game.teams.find(t => t.id === owner) : null;
      const isMine = owner === teamId;
      const size = gs && gs.chips > 0 ? 5 + gs.chips * 0.4 : 4;

      circle.setRadius(size);
      circle.setStyle({
        fillColor: team ? team.color : "#888",
        color: owner ? "#fff" : "#555",
        weight: owner ? 1.5 : 1,
        fillOpacity: owner ? 0.9 : 0.5,
      });

      if (ring) {
        if (isMine && team) {
          ring.setRadius(size + 4);
          ring.setStyle({ color: team.color, opacity: 0.6, weight: 2 });
        } else {
          ring.setStyle({ color: "transparent", opacity: 0 });
        }
      }

      hitArea?.setTooltipContent(
        `<strong>${station.name}</strong><br><span style="opacity:0.7">${station.lines.join(" ")}</span>${
          gs && gs.chips > 0 ? `<br>${gs.chips} chips` : ""
        }`
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownershipKey, game.teams, teamId, mapData]);

  // Create challenge markers — when challenge list or filters change
  useEffect(() => {
    if (!challengeLayerRef.current) return;
    challengeLayerRef.current.clearLayers();
    challengeMarkersRef.current.clear();

    game.challenges
      .filter(c => !hiddenChallengeTypes.has(c.type))
      .forEach(challenge => {
        const completed = challenge.completedBy.includes(teamId);
        const iconColor = completed ? "#666" :
          challenge.type === "multiplier" ? "#9333ea" :
          challenge.type === "steal" ? "#dc2626" :
          challenge.type === "variable" ? "#2563eb" : "#f59e0b";

        const marker = L.marker([challenge.lat, challenge.lng], {
          zIndexOffset: 1000,
          icon: L.divIcon({
            className: "challenge-marker",
            html: challengeIconHtml(iconColor, completed ? 0.3 : 1),
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        });
        marker.bindTooltip(
          revealAll ? challenge.name : challenge.type.charAt(0).toUpperCase() + challenge.type.slice(1) + " Challenge",
          { direction: "top", offset: [0, -14], className: "subway-tooltip" }
        );
        marker.on("click", () => onSelectChallengeRef.current(challenge.id));
        marker.addTo(challengeLayerRef.current!);
        challengeMarkersRef.current.set(challenge.id, marker);
      });
  }, [game.challenges, teamId, hiddenChallengeTypes, revealAll]);

  // Update challenge marker icons for hover/selection state — no recreation
  useEffect(() => {
    challengeMarkersRef.current.forEach((marker, challengeId) => {
      const challenge = game.challenges.find(c => c.id === challengeId);
      if (!challenge) return;
      const completed = challenge.completedBy.includes(teamId);
      const isGrayed =
        (hoveredChallengeId !== null && challengeId !== hoveredChallengeId) ||
        (selectedChallengeId !== null && challengeId !== selectedChallengeId);
      const iconColor = completed || isGrayed ? "#666" :
        challenge.type === "multiplier" ? "#9333ea" :
        challenge.type === "steal" ? "#dc2626" :
        challenge.type === "variable" ? "#2563eb" : "#f59e0b";
      marker.setIcon(L.divIcon({
        className: "challenge-marker",
        html: challengeIconHtml(iconColor, completed || isGrayed ? 0.3 : 1),
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }));
    });
  }, [hoveredChallengeId, selectedChallengeId, game.challenges, teamId]);

  return <div id="game-map" className="h-full w-full" />;
}

function challengeIconHtml(color: string, opacity: number): string {
  return `<div style="width:22px;height:22px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);opacity:${opacity}"><div style="width:15px;height:15px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;"><svg width="8" height="8" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div></div>`;
}

function findNearestCapturedStation(
  point: [number, number],
  capturedStations: { lat: number; lng: number; ownedBy: string | null }[]
): { lat: number; lng: number; ownedBy: string | null } | null {
  const [lng, lat] = point;
  let best = null;
  let bestDist = 0.003;
  for (const s of capturedStations) {
    const dist = Math.sqrt((s.lat - lat) ** 2 + (s.lng - lng) ** 2);
    if (dist < bestDist) { bestDist = dist; best = s; }
  }
  return best;
}
