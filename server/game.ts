import type {
  GameState,
  GameConfig,
  Station,
  Challenge,
  Team,
  ActivityEntry,
} from "../shared/types";
import { MANHATTAN_STATIONS } from "./stations";
import { SEED_CHALLENGES } from "./challenges";

let gameState: GameState | null = null;
let timedRevealTimers: NodeJS.Timeout[] = [];

export function getGame(): GameState | null {
  return gameState;
}

export function createGame(config: GameConfig): GameState {
  clearTimers();

  const teams: Team[] = config.teamNames.map((name, i) => ({
    id: `team-${i + 1}`,
    name,
    color: config.teamColors[i] || ["#ef4444", "#3b82f6", "#22c55e"][i],
    chips: config.startingChips,
    stationsHeld: 0,
  }));

  const stations: Station[] = MANHATTAN_STATIONS.map((s) => ({
    ...s,
    ownedBy: null,
    chips: 0,
  }));

  const challenges: Challenge[] = SEED_CHALLENGES.map((c) => ({
    ...c,
    completedBy: [],
  }));

  gameState = {
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

  return gameState;
}

export function startGame(): GameState | null {
  if (!gameState || gameState.status !== "lobby") return null;

  const now = Date.now();
  gameState.status = "active";
  gameState.startTime = now;
  gameState.endTime = now + gameState.durationMinutes * 60 * 1000;

  scheduleGameEnd();

  return gameState;
}

export function captureStation(
  teamId: string,
  stationId: string,
  chipAmount: number
): { success: boolean; error?: string } {
  if (!gameState || gameState.status !== "active") {
    return { success: false, error: "Game not active" };
  }

  const team = gameState.teams.find((t) => t.id === teamId);
  if (!team) return { success: false, error: "Team not found" };

  const station = gameState.stations.find((s) => s.id === stationId);
  if (!station) return { success: false, error: "Station not found" };

  if (chipAmount < 1 || chipAmount > 10) {
    return { success: false, error: "Chip amount must be between 1 and 10" };
  }

  if (chipAmount > team.chips) {
    return { success: false, error: "Not enough chips" };
  }

  if (station.ownedBy === teamId) {
    // Reinforcing own station
    const newTotal = station.chips + chipAmount;
    if (newTotal > 10) {
      return { success: false, error: "Station cannot exceed 10 chips" };
    }
    team.chips -= chipAmount;
    station.chips = newTotal;

    addActivity(teamId, "reinforce", `${team.name} reinforced ${station.name} to ${newTotal} chips`);
    return { success: true };
  }

  if (station.ownedBy === null) {
    // Capturing unclaimed station
    team.chips -= chipAmount;
    station.ownedBy = teamId;
    station.chips = chipAmount;
    team.stationsHeld++;

    addActivity(teamId, "capture", `${team.name} captured ${station.name} with ${chipAmount} chips`);
    return { success: true };
  }

  // Contesting opponent's station
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

  const defender = gameState.teams.find((t) => t.id === station.ownedBy);
  if (defender) {
    defender.stationsHeld--;
  }

  team.chips -= chipAmount;
  station.ownedBy = teamId;
  station.chips = chipAmount;
  team.stationsHeld++;

  addActivity(
    teamId,
    "capture",
    `${team.name} captured ${station.name} from ${defender?.name || "unknown"} with ${chipAmount} chips`
  );
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
      // 1 chip per item found; they called a number and must hit or exceed it (handled by UI/honor)
      return result * 1;

    case "call-your-shot-statues":
      return result * 1;

    case "call-your-shot-logos":
      // 2 chips each, minimum 30 to score
      return result >= 30 ? result * 2 : 0;

    case "one-leg-stand":
      // 60 for first minute, 10 per additional 10 seconds after (result = total seconds stood)
      if (result < 60) return 0;
      const extraSeconds = result - 60;
      return 60 + Math.floor(extraSeconds / 10) * 10;

    case "steal-apple-store":
      // 20% steal from opponent with most chips
      const target = opponents.sort((a, b) => b.chips - a.chips)[0];
      if (target) {
        const stolen = Math.floor(target.chips * 0.2);
        target.chips -= stolen;
        return stolen;
      }
      return 0;

    case "steal-countdown": {
      // Cover eyes and count to 60. Lose 1% per second off. Result = seconds they counted
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
      // 50% multiplier
      return Math.floor(team.chips * 0.5);

    case "strava-message":
      return 75;

    default:
      return reward;
  }
}

export function completeChallenge(
  teamId: string,
  challengeId: string,
  result?: number
): { success: boolean; chipsEarned?: number; error?: string } {
  if (!gameState || gameState.status !== "active") {
    return { success: false, error: "Game not active" };
  }

  const team = gameState.teams.find((t) => t.id === teamId);
  if (!team) return { success: false, error: "Team not found" };

  const challenge = gameState.challenges.find((c) => c.id === challengeId);
  if (!challenge) return { success: false, error: "Challenge not found" };

  if (challenge.completedBy.includes(teamId)) {
    return { success: false, error: "Challenge already completed by your team" };
  }

  let chipsEarned = 0;

  if (challenge.customScoring) {
    chipsEarned = calculateCustomScoring(challenge.customScoring, challenge.reward, result || 0, team, gameState.teams.filter((t) => t.id !== teamId));
  } else {
    switch (challenge.type) {
      case "fixed":
        chipsEarned = challenge.reward;
        break;

      case "variable":
        const count = result || 0;
        chipsEarned = Math.max(challenge.reward, count * challenge.reward);
        break;

      case "multiplier":
        const multiplier = challenge.reward / 100;
        chipsEarned = Math.floor(team.chips * multiplier);
        break;

      case "steal": {
        const stealPct = challenge.reward / 100;
        const opponents = gameState.teams.filter((t) => t.id !== teamId);
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
    teamId,
    "challenge_complete",
    `${team.name} completed "${challenge.name}" and earned ${chipsEarned} chips`
  );

  return { success: true, chipsEarned };
}

function addActivity(teamId: string, type: ActivityEntry["type"], message: string) {
  if (!gameState) return;
  gameState.activityLog.unshift({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    teamId,
    type,
    message,
  });
  if (gameState.activityLog.length > 100) {
    gameState.activityLog = gameState.activityLog.slice(0, 100);
  }
}

function scheduleGameEnd() {
  if (!gameState) return;
  const timer = setTimeout(() => {
    if (gameState) {
      gameState.status = "finished";
    }
  }, gameState.durationMinutes * 60 * 1000);
  timedRevealTimers.push(timer);
}

function clearTimers() {
  timedRevealTimers.forEach(clearTimeout);
  timedRevealTimers = [];
}

export function resetGame() {
  clearTimers();
  gameState = null;
}

export function debugClearStations() {
  if (!gameState) return;
  gameState.stations.forEach((s) => {
    s.ownedBy = null;
    s.chips = 0;
  });
  gameState.teams.forEach((t) => {
    t.stationsHeld = 0;
  });
}

export function debugClearChallenges() {
  if (!gameState) return;
  gameState.challenges.forEach((c) => {
    c.completedBy = [];
  });
}

export function debugResetChips() {
  if (!gameState) return;
  gameState.teams.forEach((t) => {
    t.chips = gameState!.startingChips;
  });
}

export function debugAddChallenge(challenge: Omit<Challenge, "completedBy">) {
  if (!gameState) return;
  gameState.challenges.push({
    ...challenge,
    completedBy: [],
  });
}
