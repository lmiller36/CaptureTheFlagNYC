# Capture the Stations - Project Status

## What's Built
- Full-stack webapp: React + Vite frontend, Express + Socket.io backend
- Game lobby with team creation and configuration
- Real-time game state sync via WebSockets
- Map view (Leaflet), Challenge panel, Scoreboard with activity log
- 123 Manhattan subway stations with capture/reinforce mechanics
- 20 seed challenges (fixed, variable, multiplier, steal types)
- Challenge reveal system (initial, capture-triggered, timed)
- Game timer with auto-end

## Tech Stack
- Frontend: React, React Router, Tailwind CSS, Leaflet, Socket.io-client
- Backend: Express, Socket.io, in-memory game state
- Build: Vite, TypeScript, tsx (dev server)
- Run with: `npm run dev` (starts both server on :3001 and client on :5173)

## Current State / Next Step
**The map needs rework.** We tried:
1. Geographic polylines over a Carto tile map — too messy
2. Vignelli-style diagram with tan background — user didn't like it

**Decided approach:** Use an official-style MTA subway map SVG as the map background.
- Use Leaflet with `CRS.Simple` (pixel coordinates, not lat/lng)
- Overlay the SVG as the map image
- Place station markers at pixel positions extracted from SVG elements

### To Do
1. **Find an open-source SVG subway map** with individually identifiable station elements
   - Check Wikimedia Commons: search "NYC subway map SVG"
   - Check GitHub repos (e.g. "nyc-subway-map svg")
   - Needs: open license, stations as distinct SVG elements (circles/groups with IDs)
   - Manhattan-focused or full system with Manhattan clearly shown
2. **Extract station pixel coordinates** from the SVG
   - Parse SVG, find station elements (likely `<circle>` or `<g>` with class/id)
   - Map them to our station IDs in `server/stations.ts`
3. **Refactor MapView.tsx** to use CRS.Simple + SVG image overlay
   - Replace geographic lat/lng with pixel x/y for all station positions
   - Keep challenge markers positioned relative to their nearest station
4. **Update station data** — replace lat/lng with x/y pixel coords (or maintain both)

## File Structure
```
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.server.json
├── index.html
├── GAME_SPEC.md          — full game rules spec
├── server/
│   ├── index.ts          — Express + Socket.io server
│   ├── game.ts           — game logic (create, capture, challenges)
│   ├── stations.ts       — 123 Manhattan stations with lat/lng
│   ├── challenges.ts     — 20 seed challenges
│   └── subway-lines.ts   — line path data (will be replaced by SVG)
├── shared/
│   └── types.ts          — TypeScript types shared between client/server
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── hooks/useSocket.ts
│   ├── pages/
│   │   ├── Lobby.tsx
│   │   └── GameView.tsx
│   └── components/
│       ├── MapView.tsx       — *** needs rework for SVG map ***
│       ├── StationPanel.tsx
│       ├── ChallengePanel.tsx
│       ├── Scoreboard.tsx
│       └── GameTimer.tsx
└── public/               — put SVG map file here
```

## Game Rules Summary
- 2+ teams, 8-hour fixed duration, 10 starting chips
- Capture stations by depositing 1-10 chips (must be physically present)
- Contest opponent's station by depositing their amount + 1 (max 10 = locked)
- All deposited chips consumed (both sides)
- Challenges: fixed reward, variable (guess-based), multiplier (% of bank), steal (% of opponent)
- Full visibility, honor system, most stations held wins
