# Capture the Stations: Manhattan — CLAUDE.md

Real-world strategy game inspired by Jet Lag: The Game, played across NYC subway stations. Teams physically travel Manhattan capturing stations and completing challenges. Full spec in `GAME_SPEC.md`.

## Running the App

Always run inside Docker — do not install packages locally.

```bash
docker compose up          # start dev server (hot reload)
docker compose down        # stop
```

- Frontend: http://localhost:5173 (Vite, hot reload)
- Backend: http://localhost:3001 (Express + Socket.io)
- LAN access: http://192.168.50.121:5173

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, React Router 7, Tailwind CSS 4, Leaflet |
| Backend | Express 5, Socket.io 4, better-sqlite3 |
| Build | Vite 8, TypeScript 6, tsx (dev) |
| Runtime | Docker (node:22-alpine) |

## File Structure

```
├── GAME_SPEC.md            — full game rules (source of truth for game logic)
├── docker-compose.yml
├── shared/
│   └── types.ts            — TypeScript types shared client ↔ server
├── server/
│   ├── index.ts            — Express routes + Socket.io event handlers
│   ├── game.ts             — all game logic (capture, challenges, scoring)
│   ├── stations.ts         — 123 Manhattan stations with lat/lng
│   ├── challenges.ts       — seed + reserve challenges
│   └── subway-lines.ts     — GeoJSON line paths (used by MapView)
├── src/
│   ├── App.tsx             — router + socket wiring
│   ├── constants.ts        — MTA route colors keyed by line letter
│   ├── hooks/useSocket.ts  — Socket.io client hook, exposes game state + actions
│   ├── pages/
│   │   ├── Lobby.tsx       — team select / game creation
│   │   └── GameView.tsx    — main game screen (map + bottom nav)
│   └── components/
│       ├── MapView.tsx     — Leaflet map, station + challenge markers
│       ├── StationPanel.tsx — bottom sheet for capturing/reinforcing a station
│       ├── ChallengePanel.tsx — (legacy, not used in current GameView)
│       ├── Scoreboard.tsx  — (legacy, not used in current GameView)
│       └── GameTimer.tsx   — countdown display
└── public/
    ├── manhattan-stations.json   — station list with lat/lng + lines (for MapView)
    ├── subway-lines.geojson      — line geometry for map rendering
    └── subway-map.svg            — full MTA map SVG (not yet used)
```

## Architecture

- **State lives on the server** in memory (`server/game.ts`). All mutations go through the server; clients receive updated `GameState` via Socket.io `game:update` events.
- **`useSocket.ts`** is the single client-side state owner — it holds `game: GameState` and exposes `captureStation` / `completeChallenge` action functions.
- **No auth** — team identity is a `teamId` stored in `localStorage`. Honor system throughout.
- **Real-time** — every state change (capture, challenge complete, timer tick) broadcasts to all connected clients.

## UI Layout (mobile-first)

```
┌─────────────────────────────┐
│  [⚙]    ⏱ 4:32  · 🔵 12 chips  │  ← top HUD (always visible)
│                             │
│         MAP (Leaflet)       │
│                             │
│  [challenge detail pill]    │  ← appears when challenge tapped on map
│  [station capture sheet]    │  ← appears when station tapped on map
├─────────────────────────────┤
│   📊 Scores  |  ⚡ Challenges │  ← bottom tab bar
└─────────────────────────────┘
```

- Tapping a tab slides up a bottom sheet (60vh) with scores/activity or challenge list.
- Tapping the same tab or a map item dismisses the sheet.
- Station panel and challenge detail panel are absolute overlays inside the map container — they sit just above the bottom tab bar naturally.

## Game Rules Summary

- 2+ teams, configurable duration (default 8 hrs), configurable starting chips (default 10)
- **Capture** uncaptured station: deposit 1–10 chips (must be physically present)
- **Contest** opponent's station: deposit their chip count + 1 (max 10 chips = locked, uncontestable)
- Deposited chips are consumed permanently (both attacker and defender lose their chips)
- **Challenge types:** fixed reward, variable (input-based), multiplier (% of undeposited bank), steal (% of opponent's undeposited bank)
- Full visibility, honor system, most stations held wins; tiebreaker = total chips deposited

## Debug Panel

Gear icon (top-left of map) opens a debug panel:
- Clear all claimed stations
- Clear all completed challenges
- Reset chips to starting amount
- Reveal all challenge names/details
- Deploy reserve challenges from server

## Known State / Open Work

- `subway-map.svg` is in `/public` but not yet wired into MapView — the TODO.md describes a planned rework to use `CRS.Simple` (pixel coords) with the SVG as map background instead of the current Carto tile + GeoJSON overlay approach
- `ChallengePanel.tsx` and `Scoreboard.tsx` are legacy components not rendered in the current `GameView` — can be deleted when the SVG map rework is done
