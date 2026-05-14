export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
  ownedBy: string | null;
  chips: number;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  chips: number;
  stationsHeld: number;
}

export type ChallengeType = "fixed" | "variable" | "multiplier" | "steal";
export type ChallengeStatus = "available" | "completed" | "locked";

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  lat: number;
  lng: number;
  reward: number; // fixed chips, multiplier %, steal %, or base multiplier for variable
  rewardDescription: string;
  customScoring?: string; // named scoring rule for non-standard calculations
  resultLabel?: string; // label for the input field when customScoring requires input
  imageUrl?: string; // optional image or gif URL to display with the challenge
  completedBy: string[]; // team ids that have completed this
}

export interface GameState {
  id: string;
  status: "lobby" | "active" | "finished";
  startTime: number | null;
  endTime: number | null;
  durationMinutes: number;
  startingChips: number;
  teams: Team[];
  stations: Station[];
  challenges: Challenge[];
  activityLog: ActivityEntry[];
}

export interface ActivityEntry {
  id: string;
  timestamp: number;
  teamId: string;
  type: "capture" | "reinforce" | "challenge_complete";
  message: string;
}

export interface GameConfig {
  durationMinutes: number;
  startingChips: number;
  teamNames: string[];
  teamColors: string[];
}
