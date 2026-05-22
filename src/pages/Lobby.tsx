import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GameState, GameConfig } from "../../shared/types";

interface Props {
  game: GameState | null;
  teamId: string | null;
  onSelectTeam: (id: string) => void;
  onCreateGame: (config: GameConfig) => Promise<void>;
  onStartGame: () => void;
  onResetGame: () => void;
}

export default function Lobby({ game, teamId, onSelectTeam, onCreateGame, onStartGame, onResetGame }: Props) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [duration, setDuration] = useState(480);
  const [startingChips, setStartingChips] = useState(10);
  const [team1Name, setTeam1Name] = useState("Red Team");
  const [team2Name, setTeam2Name] = useState("Blue Team");

  async function handleCreate() {
    setCreating(true);
    await onCreateGame({
      durationMinutes: duration,
      startingChips,
      teamNames: [team1Name, team2Name],
      teamColors: ["#ef4444", "#3b82f6"],
    });
    setCreating(false);
  }

  function handleStart() {
    onStartGame();
    navigate("/game");
  }

  function handleReset() {
    onResetGame();
  }

  if (!game) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <h1 className="text-3xl font-bold text-center">Capture the Stations</h1>
          <p className="text-center text-gray-600">Manhattan Edition</p>

          <div className="space-y-4 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold">Create Game</h2>

            <label className="block">
              <span className="text-sm text-gray-600">Duration (minutes)</span>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-600">Starting chips per team</span>
              <input
                type="number"
                value={startingChips}
                onChange={(e) => setStartingChips(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-600">Team 1 Name</span>
              <input
                type="text"
                value={team1Name}
                onChange={(e) => setTeam1Name(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-600">Team 2 Name</span>
              <input
                type="text"
                value={team2Name}
                onChange={(e) => setTeam2Name(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Game"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-center">Capture the Stations</h1>
        <p className="text-center text-gray-600">
          {game.status === "lobby" ? "Waiting to start..." : "Game in progress"}
        </p>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Select Your Team</h2>
          <div className="grid grid-cols-2 gap-3">
            {game.teams.map((team) => (
              <button
                key={team.id}
                onClick={() => onSelectTeam(team.id)}
                className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                  teamId === team.id
                    ? "border-gray-900 shadow-md scale-105"
                    : "border-gray-200 hover:border-gray-400"
                }`}
                style={{
                  backgroundColor: teamId === team.id ? team.color + "20" : undefined,
                  borderColor: teamId === team.id ? team.color : undefined,
                }}
              >
                <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: team.color }} />
                {team.name}
              </button>
            ))}
          </div>
        </div>

        {game.status === "lobby" && (
          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={!teamId}
              className="flex-1 bg-green-600 text-white rounded-lg py-3 font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              Start Game
            </button>
            <button
              onClick={handleReset}
              className="bg-red-100 text-red-700 rounded-lg px-4 py-3 font-semibold hover:bg-red-200"
            >
              Reset
            </button>
          </div>
        )}

        {game.status !== "lobby" && teamId && (
          <button
            onClick={() => navigate("/game")}
            className="w-full bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700"
          >
            Enter Game
          </button>
        )}
      </div>
    </div>
  );
}
