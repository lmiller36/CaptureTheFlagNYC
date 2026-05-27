import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { GameState } from "../../shared/types";

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

interface GeoJSON {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

import { ROUTE_COLORS } from "../constants";

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

export default function MapView({ game, teamId, hiddenChallengeTypes, hoveredChallengeId, selectedChallengeId, revealAll, onSelectStation, onSelectChallenge }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const linesRef = useRef<L.LayerGroup | null>(null);
  const prevZoomRef = useRef<{ center: L.LatLng; zoom: number } | null>(null);
  const challengeMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [lineGeo, setLineGeo] = useState<GeoJSON | null>(null);

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + "manhattan-stations.json").then((r) => r.json()).then(setMapData);
    fetch(import.meta.env.BASE_URL + "subway-lines.geojson").then((r) => r.json()).then(setLineGeo);
  }, []);

  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map("game-map", {
      center: [40.758, -73.985],
      zoom: 13,
      zoomControl: false,
      preferCanvas: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }
    ).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    linesRef.current = L.layerGroup().addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (selectedChallengeId) {
      const challenge = game.challenges.find((c) => c.id === selectedChallengeId);
      if (challenge) {
        prevZoomRef.current = { center: map.getCenter(), zoom: map.getZoom() };
        map.flyTo([challenge.lat, challenge.lng], 16, { duration: 0.5 });
      }
    } else if (prevZoomRef.current) {
      map.flyTo(prevZoomRef.current.center, prevZoomRef.current.zoom, { duration: 0.5 });
      prevZoomRef.current = null;
    }
  }, [selectedChallengeId]);

  useEffect(() => {
    if (!markersRef.current || !linesRef.current || !mapData || !lineGeo) return;
    markersRef.current.clearLayers();
    linesRef.current.clearLayers();

    const gameStationById = new Map(game.stations.map((s) => [s.id, s]));

    // For each line segment, determine if it should be colored by a team
    // A segment lights up if there are captured stations on both ends of that segment
    // For simplicity: a line segment is "owned" by a team if the nearest station
    // at each end of the segment belongs to that team.

    // Build a spatial index of captured stations
    const capturedStations = game.stations.filter((s) => s.ownedBy);

    lineGeo.features.forEach((feature) => {
      const coords = feature.geometry.coordinates;
      if (coords.length < 2) return;

      const latLngs: L.LatLngExpression[] = coords.map(([lng, lat]) => [lat, lng]);

      // Check if the segment's start and end are near captured stations of same team
      const startPt = coords[0];
      const endPt = coords[coords.length - 1];

      let segmentTeam: string | null = null;

      const nearStart = findNearestCapturedStation(startPt, capturedStations);
      const nearEnd = findNearestCapturedStation(endPt, capturedStations);

      if (nearStart && nearEnd && nearStart.ownedBy === nearEnd.ownedBy) {
        segmentTeam = nearStart.ownedBy;
      }

      if (segmentTeam) {
        const team = game.teams.find((t) => t.id === segmentTeam);
        // Team-colored line
        L.polyline(latLngs, {
          color: team?.color || "#888",
          weight: 5,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(linesRef.current!);
      } else {
        // Muted line
        const routeColor = ROUTE_COLORS[feature.properties.rt_symbol] || "#555";
        L.polyline(latLngs, {
          color: routeColor,
          weight: 3,
          opacity: 0.25,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(linesRef.current!);
      }
    });

    // Draw station markers
    mapData.stations.forEach((station) => {
      const gameStation = gameStationById.get(station.id);
      const owner = gameStation?.ownedBy;
      const team = owner ? game.teams.find((t) => t.id === owner) : null;
      const isMine = owner === teamId;

      const fillColor = team ? team.color : "#888";
      const size = gameStation && gameStation.chips > 0 ? 5 + gameStation.chips * 0.4 : 4;

      if (isMine) {
        L.circleMarker([station.lat, station.lng], {
          radius: size + 4,
          fillColor: "transparent",
          color: team!.color,
          weight: 2,
          opacity: 0.6,
          fillOpacity: 0,
          interactive: false,
        }).addTo(markersRef.current!);
      }

      // Invisible hit area for easier tapping on mobile
      const hitArea = L.circleMarker([station.lat, station.lng], {
        radius: 15,
        fillColor: "transparent",
        color: "transparent",
        fillOpacity: 0,
        opacity: 0,
        interactive: true,
      });
      hitArea.on("click", () => {
        if (gameStation) onSelectStation(gameStation.id);
      });
      hitArea.addTo(markersRef.current!);

      const marker = L.circleMarker([station.lat, station.lng], {
        radius: size,
        fillColor,
        color: owner ? "#fff" : "#555",
        weight: owner ? 1.5 : 1,
        opacity: 1,
        fillOpacity: owner ? 0.9 : 0.5,
      });

      marker.bindTooltip(
        `<strong>${station.name}</strong><br><span style="opacity:0.7">${station.lines.join(" ")}</span>${
          gameStation && gameStation.chips > 0 ? `<br>${gameStation.chips} chips` : ""
        }`,
        { direction: "top", offset: [0, -8], className: "subway-tooltip" }
      );

      marker.on("click", () => {
        if (gameStation) {
          onSelectStation(gameStation.id);
        }
      });
      marker.addTo(markersRef.current!);
    });

    // Challenge markers (on higher z-index so they're always visible above stations)
    challengeMarkersRef.current.clear();
    game.challenges
      .filter((c) => !hiddenChallengeTypes.has(c.type))
      .forEach((challenge) => {
        const completed = challenge.completedBy.includes(teamId);
        const iconColor = completed
          ? "#666"
          : challenge.type === "multiplier"
          ? "#9333ea"
          : challenge.type === "steal"
          ? "#dc2626"
          : challenge.type === "variable"
          ? "#2563eb"
          : "#f59e0b";

        const marker = L.marker([challenge.lat, challenge.lng], {
          zIndexOffset: 1000,
          icon: L.divIcon({
            className: "challenge-marker",
            html: `<div style="
              width: 18px; height: 18px;
              transform: rotate(45deg);
              background: ${iconColor};
              box-shadow: 0 0 8px ${iconColor}, 0 0 16px ${iconColor}55;
              opacity: ${completed ? 0.3 : 1};
            "></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        });

        marker.bindTooltip(
          revealAll ? challenge.name : challenge.type.charAt(0).toUpperCase() + challenge.type.slice(1) + " Challenge",
          { direction: "top", offset: [0, -14], className: "subway-tooltip" }
        );
        marker.on("click", () => onSelectChallenge(challenge.id));
        marker.addTo(markersRef.current!);
        challengeMarkersRef.current.set(challenge.id, marker);
      });
  }, [game, teamId, mapData, lineGeo, hiddenChallengeTypes, revealAll, onSelectStation, onSelectChallenge]);

  useEffect(() => {
    challengeMarkersRef.current.forEach((marker, challengeId) => {
      const challenge = game.challenges.find((c) => c.id === challengeId);
      if (!challenge) return;
      const completed = challenge.completedBy.includes(teamId);
      const isGrayed =
        (hoveredChallengeId !== null && challengeId !== hoveredChallengeId) ||
        (selectedChallengeId !== null && challengeId !== selectedChallengeId);
      const iconColor =
        completed || isGrayed
          ? "#666"
          : challenge.type === "multiplier"
          ? "#9333ea"
          : challenge.type === "steal"
          ? "#dc2626"
          : challenge.type === "variable"
          ? "#2563eb"
          : "#f59e0b";
      marker.setIcon(
        L.divIcon({
          className: "challenge-marker",
          html: `<div style="
            width: 18px; height: 18px;
            transform: rotate(45deg);
            background: ${iconColor};
            box-shadow: 0 0 8px ${iconColor}, 0 0 16px ${iconColor}55;
            opacity: ${completed || isGrayed ? 0.3 : 1};
          "></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        })
      );
    });
  }, [hoveredChallengeId, selectedChallengeId, game.challenges, teamId]);

  return <div id="game-map" className="h-full w-full" />;
}

function findNearestCapturedStation(
  point: [number, number],
  capturedStations: { lat: number; lng: number; ownedBy: string | null }[]
): { lat: number; lng: number; ownedBy: string | null } | null {
  const [lng, lat] = point;
  let best = null;
  let bestDist = 0.003; // ~300m threshold
  for (const s of capturedStations) {
    const dist = Math.sqrt((s.lat - lat) ** 2 + (s.lng - lng) ** 2);
    if (dist < bestDist) {
      bestDist = dist;
      best = s;
    }
  }
  return best;
}
