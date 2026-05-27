import type {
  GameState,
  GameConfig,
  Station,
  Challenge,
  Team,
  ActivityEntry,
} from "../../shared/types";
import { SEED_CHALLENGES, RESERVE_CHALLENGES } from "./challenges";

const STORAGE_KEY = "capture-the-stations-game";

let stationsCache: Omit<Station, "ownedBy" | "chips">[] | null = null;

export async function getStations(): Promise<Omit<Station, "ownedBy" | "chips">[]> {
  if (stationsCache) return stationsCache;
  const resp = await fetch(import.meta.env.BASE_URL + "manhattan-stations.json");
  const data = await resp.json();
  stationsCache = data.stations.map((s: { id: string; name: string; lat: number; lng: number; lines: string[] }) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    lines: s.lines,
  }));
  return stationsCache!;
}

function save(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const game: GameState = JSON.parse(raw);
  if (game.status === "active" && game.endTime && Date.now() >= game.endTime) {
    game.status = "finished";
    save(game);
  }
  return game;
}

export async function createGame(config: GameConfig): Promise<GameState> {
  const stationData = await getStations();

  const teams: Team[] = config.teamNames.map((name, i) => ({
    id: `team-${i + 1}`,
    name,
    color: config.teamColors[i] || ["#ef4444", "#3b82f6", "#22c55e"][i],
    chips: config.startingChips,
    stationsHeld: 0,
  }));

  const stations: Station[] = stationData.map((s) => ({
    ...s,
    ownedBy: null,
    chips: 0,
  }));

  const challenges: Challenge[] = SEED_CHALLENGES.map((c) => ({
    ...c,
    completedBy: [],
  }));

  const game: GameState = {
    id: crypto.randomUUID(),
    status: "lobby",
    startTime: null,
    endTime: null,
    durationMinutes: config.durationMinutes,
    startingChips: config.startingChips,
    teams,
    stations,
    challenges,
    activityLog: [],
  };

  save(game);
  return game;
}

export function startGame(game: GameState): GameState {
  const now = Date.now();
  game.status = "active";
  game.startTime = now;
  game.endTime = now + game.durationMinutes * 60 * 1000;
  save(game);
  return game;
}

export function captureStation(
  game: GameState,
  teamId: string,
  stationId: string,
  chipAmount: number
): { success: boolean; error?: string } {
  if (game.status !== "active") {
    return { success: false, error: "Game not active" };
  }

  const team = game.teams.find((t) => t.id === teamId);
  if (!team) return { success: false, error: "Team not found" };

  const station = game.stations.find((s) => s.id === stationId);
  if (!station) return { success: false, error: "Station not found" };

  if (chipAmount < 1 || chipAmount > 10) {
    return { success: false, error: "Chip amount must be between 1 and 10" };
  }

  if (chipAmount > team.chips) {
    return { success: false, error: "Not enough chips" };
  }

  if (station.ownedBy === teamId) {
    const newTotal = station.chips + chipAmount;
    if (newTotal > 10) {
      return { success: false, error: "Station cannot exceed 10 chips" };
    }
    team.chips -= chipAmount;
    station.chips = newTotal;
    addActivity(game, teamId, "reinforce", `${team.name} reinforced ${station.name} to ${newTotal} chips`);
    save(game);
    return { success: true };
  }

  if (station.ownedBy === null) {
    team.chips -= chipAmount;
    station.ownedBy = teamId;
    station.chips = chipAmount;
    team.stationsHeld++;
    addActivity(game, teamId, "capture", `${team.name} captured ${station.name} with ${chipAmount} chips`);
    save(game);
    return { success: true };
  }

  const requiredChips = station.chips + 1;
  if (requiredChips > 10) {
    return { success: false, error: "Station is at max (10) and cannot be contested" };
  }
  if (chipAmount < requiredChips) {
    return { success: false, error: `Must deposit at least ${requiredChips} chips to capture` };
  }
  if (chipAmount > 10) {
    return { success: false, error: "Cannot deposit more than 10 chips" };
  }

  const defender = game.teams.find((t) => t.id === station.ownedBy);
  if (defender) {
    defender.stationsHeld--;
  }

  team.chips -= chipAmount;
  station.ownedBy = teamId;
  station.chips = chipAmount;
  team.stationsHeld++;

  addActivity(
    game,
    teamId,
    "capture",
    `${team.name} captured ${station.name} from ${defender?.name || "unknown"} with ${chipAmount} chips`
  );
  save(game);
  return { success: true };
}

function calculateCustomScoring(
  rule: string,
  reward: number,
  result: number,
  team: Team,
  opponents: Team[]
): number {
  switch (rule) {
    case "call-your-shot-bus":
    case "call-your-shot-vendors":
    case "call-your-shot-water-towers":
      return result * 1;

    case "call-your-shot-statues":
      return result * 1;

    case "call-your-shot-logos":
      return result >= 30 ? result * 2 : 0;

    case "one-leg-stand":
      if (result < 60) return 0;
      const extraSeconds = result - 60;
      return 60 + Math.floor(extraSeconds / 10) * 10;

    case "steal-apple-store": {
      const target = opponents.sort((a, b) => b.chips - a.chips)[0];
      if (target) {
        const stolen = Math.floor(target.chips * 0.2);
        target.chips -= stolen;
        return stolen;
      }
      return 0;
    }

    case "steal-countdown": {
      const diff = Math.abs(result - 60);
      const pct = Math.max(0, 20 - diff) / 100;
      const victim = opponents.sort((a, b) => b.chips - a.chips)[0];
      if (victim && pct > 0) {
        const stolen = Math.floor(victim.chips * pct);
        victim.chips -= stolen;
        return stolen;
      }
      return 0;
    }

    case "multiplier-5-stops":
    case "multiplier-other-river":
    case "multiplier-rat":
      return Math.floor(team.chips * 0.5);

    case "strava-message":
      return 75;

    default:
      return reward;
  }
}

export function completeChallenge(
  game: GameState,
  teamId: string,
  challengeId: string,
  result?: number
): { success: boolean; chipsEarned?: number; error?: string } {
  if (game.status !== "active") {
    return { success: false, error: "Game not active" };
  }

  const team = game.teams.find((t) => t.id === teamId);
  if (!team) return { success: false, error: "Team not found" };

  const challenge = game.challenges.find((c) => c.id === challengeId);
  if (!challenge) return { success: false, error: "Challenge not found" };

  if (challenge.completedBy.includes(teamId)) {
    return { success: false, error: "Challenge already completed by your team" };
  }

  let chipsEarned = 0;

  if (challenge.customScoring) {
    chipsEarned = calculateCustomScoring(
      challenge.customScoring,
      challenge.reward,
      result || 0,
      team,
      game.teams.filter((t) => t.id !== teamId)
    );
  } else {
    switch (challenge.type) {
      case "fixed":
        chipsEarned = challenge.reward;
        break;
      case "variable":
        chipsEarned = Math.max(challenge.reward, (result || 0) * challenge.reward);
        break;
      case "multiplier":
        chipsEarned = Math.floor(team.chips * (challenge.reward / 100));
        break;
      case "steal": {
        const stealPct = challenge.reward / 100;
        const opponents = game.teams.filter((t) => t.id !== teamId);
        const target = opponents.sort((a, b) => b.chips - a.chips)[0];
        if (target) {
          chipsEarned = Math.floor(target.chips * stealPct);
          target.chips -= chipsEarned;
        }
        break;
      }
    }
  }

  team.chips += chipsEarned;
  challenge.completedBy.push(teamId);

  addActivity(
    game,
    teamId,
    "challenge_complete",
    `${team.name} completed "${challenge.name}" and earned ${chipsEarned} chips`
  );

  save(game);
  return { success: true, chipsEarned };
}

function addActivity(game: GameState, teamId: string, type: ActivityEntry["type"], message: string) {
  game.activityLog.unshift({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    teamId,
    type,
    message,
  });
  if (game.activityLog.length > 100) {
    game.activityLog = game.activityLog.slice(0, 100);
  }
}

export function resetGame() {
  localStorage.removeItem(STORAGE_KEY);
}

export function debugClearStations(game: GameState) {
  game.stations.forEach((s) => {
    s.ownedBy = null;
    s.chips = 0;
  });
  game.teams.forEach((t) => {
    t.stationsHeld = 0;
  });
  save(game);
}

export function debugClearChallenges(game: GameState) {
  game.challenges.forEach((c) => {
    c.completedBy = [];
  });
  save(game);
}

export function debugResetChips(game: GameState) {
  game.teams.forEach((t) => {
    t.chips = game.startingChips;
  });
  save(game);
}

export function debugAddChallenge(game: GameState, challenge: Omit<Challenge, "completedBy">) {
  game.challenges.push({ ...challenge, completedBy: [] });
  save(game);
}

export { RESERVE_CHALLENGES };
