# Capture the Stations: Manhattan

A real-world strategy game inspired by [Jet Lag: The Game](https://www.youtube.com/jetlagthegame), played across the NYC subway system. Teams race across Manhattan capturing subway stations by depositing earned chips. The team holding the most stations when time runs out wins.

## How It Works

- 2+ teams start with 10 chips each and an 8-hour game clock
- Capture subway stations by physically visiting them and depositing 1-10 chips
- Contest an opponent's station by depositing their amount + 1 (a station with 10 chips is locked)
- All deposited chips are consumed permanently (both attacker's and defender's)
- Earn more chips by completing challenges scattered across the map (fixed rewards, variable/guess-based, multipliers, steals)
- Full visibility: everyone sees all station ownership, deposits, and chip balances
- Most stations held when the timer expires wins

See [GAME_SPEC.md](GAME_SPEC.md) for the complete ruleset.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, React Router, Tailwind CSS 4, Leaflet |
| Backend | Express 5, Socket.io (real-time sync) |
| Build | Vite 8, TypeScript 6, tsx (dev server) |
| Data | In-memory game state (no database required) |

## Getting Started

```bash
npm install
npm run dev
```

This starts both the backend (port 3001) and the Vite dev client (port 5173) via `concurrently`.

For production:

```bash
npm run build
npm start
```

## Project Structure

```
server/
  index.ts          Express + Socket.io server
  game.ts           Game logic (create, join, capture, challenges)
  stations.ts       123 Manhattan subway stations
  challenges.ts     20 seed challenges
  subway-lines.ts   Subway line path data
shared/
  types.ts          TypeScript types shared between client and server
src/
  App.tsx           Router setup
  pages/
    Lobby.tsx       Game creation and team join
    GameView.tsx    Main game screen
  components/
    MapView.tsx     Leaflet map with station markers
    StationPanel.tsx    Station detail / capture UI
    ChallengePanel.tsx  Challenge list and completion
    Scoreboard.tsx      Live standings + activity feed
    GameTimer.tsx       Countdown clock
  hooks/
    useSocket.ts    Socket.io connection hook
```

## Game Flow

1. **Create** - Game master sets duration, starting chips, and initial challenges
2. **Join** - Teams join via link or code
3. **Play** - Teams navigate Manhattan, complete challenges, and capture stations
4. **End** - Timer expires, team with the most stations wins (tiebreaker: total chips deposited)
