# Capture the Stations: Manhattan

A real-world strategy game inspired by Jet Lag: The Game (Korea season), played across the NYC subway system.

---

## Overview

Teams race across Manhattan capturing subway stations by depositing earned chips. The team holding the most stations when time runs out wins.

---

## Teams & Players

- **Default:** 2 teams
- **Large groups (10+):** Either 3 teams, or 2 teams each split into sub-groups that collaborate
- Each team acts as a single unit with a shared chip pool

---

## Game Duration

- Fixed duration, configured at game start (default: 8 hours)
- Game ends at the set time; winner is the team holding the most stations
- Tiebreaker: total chips deposited across all held stations

---

## Stations

- **All Manhattan subway stations** are in play (~150 stations)
- Each station can be held by one team at a time
- Stations start uncaptured

---

## Chips

### Starting Pool
- Each team begins with a configurable starting number of chips (default: 10)
- Additional chips are earned exclusively through challenges

### Depositing Chips
- A team must be **physically at the station** to deposit chips
- To capture an **uncaptured station**: deposit at least 1 chip (up to 10)
- To capture an **opponent's station**: deposit (opponent's deposit + 1) chips
  - Maximum deposit on any station: **10 chips**
  - A station with 10 chips deposited **cannot be contested**
- All deposited chips are **consumed** (spent permanently) — both the attacker's new deposit and the defender's original deposit are gone
- A team can add more chips to a station they already hold (reinforcing), up to the max of 10

### Visibility
- Full visibility: all teams can see all station ownership, deposit amounts, and opponent chip balances at all times

---

## Challenges

Challenges are the primary way to earn chips. They are pinned to specific locations on the map — a team must physically go to the challenge location to complete it.

### Challenge Discovery
- **Starting challenges:** A set of challenges visible to all teams from game start
- **Capture-triggered:** New challenges appear as stations are captured (near captured stations)
- **Timed reveals:** Additional challenges appear on a schedule throughout the game

### Challenge Types

| Type | Description | Example |
|------|-------------|---------|
| **Fixed reward** | Complete the challenge, receive a set number of chips | "Take a photo at the Charging Bull" → 5 chips |
| **Variable reward** | Reward depends on a guess or observation | "How many buses pass in 1 minute? Earn 3x your count in chips" |
| **Multiplier** | Multiplies your team's current banked (undeposited) chips by a percentage | "Complete this challenge to earn a 50% chip multiplier" (50 chips → 75 chips) |
| **Chip steal** | Steal a percentage of an opponent's banked (undeposited) chips | "Steal 25% of an opponent's chips" |

### Challenge Rules
- Results are **self-reported** (honor system)
- Each challenge can only be completed once per team
- Multipliers apply to the team's **entire current chip balance** (banked, undeposited chips)
- Steals take from the opponent's **undeposited chip pool** (not from chips already locked in stations)

---

## Win Condition

- **Most stations held** when the timer expires
- Tiebreaker: highest total chips deposited across held stations

---

## Webapp Requirements

### Views
1. **Map view** — Interactive map of Manhattan showing:
   - All subway stations (colored by team ownership or neutral)
   - Chip deposit amount on each station
   - Challenge locations (with type icon)
   - Team locations (optional, honor system)

2. **Team dashboard** — Shows:
   - Current chip balance
   - Stations held (count + list)
   - Available challenges
   - Game timer / countdown

3. **Challenge detail** — For a selected challenge:
   - Description and rules
   - Reward type and amount
   - "Complete" button with result input (for variable challenges)

4. **Scoreboard** — Live standings:
   - Stations held per team
   - Chip balances
   - Recent activity feed (captures, challenge completions)

### Core Features
- Real-time updates (all teams see changes immediately)
- Mobile-first design (players are walking around NYC)
- Game creation with configurable parameters (duration, starting chips, team count)
- Admin panel for initial challenge setup
- Automatic timed challenge reveals

### Tech Considerations
- Webapp should work well on mobile browsers
- Real-time sync between teams (WebSockets or polling)
- No authentication complexity needed (team codes or simple join links)
- Map integration (Leaflet/Mapbox with subway station data)

---

## Game Flow

1. **Setup:** Game master creates game, sets duration, configures starting challenges and timed reveals
2. **Join:** Teams join via link/code
3. **Start:** Timer begins, starting challenges appear, teams receive starting chips
4. **Play:** Teams navigate Manhattan completing challenges and capturing stations
5. **Mid-game:** New challenges appear as stations are captured + on timed schedule
6. **End:** Timer expires, team with most stations wins

---

## Open Questions / Future Enhancements

- Should there be "power" stations worth bonus points?
- Could we add a "last 30 minutes" event where all deposits are doubled?
- Multi-day variant?
- Spectator mode for friends not playing?
