import type { GameState } from "../../shared/types";

interface Props {
  game: GameState;
  teamId: string;
}

export default function Scoreboard({ game, teamId }: Props) {
  const sortedTeams = [...game.teams].sort((a, b) => b.stationsHeld - a.stationsHeld);

  const totalStations = game.stations.length;
  const capturedStations = game.stations.filter((s) => s.ownedBy !== null).length;

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold">{capturedStations}</p>
          <p className="text-xs text-gray-500">Stations Captured</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold">{totalStations - capturedStations}</p>
          <p className="text-xs text-gray-500">Unclaimed</p>
        </div>
      </div>

      {/* Team standings */}
      <h2 className="text-lg font-bold mb-3">Standings</h2>
      <div className="space-y-3 mb-6">
        {sortedTeams.map((team, i) => {
          const isMe = team.id === teamId;
          const totalDeposited = game.stations
            .filter((s) => s.ownedBy === team.id)
            .reduce((sum, s) => sum + s.chips, 0);

          return (
            <div
              key={team.id}
              className={`p-4 rounded-xl shadow-sm ${isMe ? "ring-2 ring-indigo-300" : ""}`}
              style={{ backgroundColor: team.color + "10", borderLeft: `4px solid ${team.color}` }}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-400">#{i + 1}</span>
                  <span className="font-semibold">{team.name}</span>
                  {isMe && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">You</span>}
                </div>
                <span className="text-2xl font-bold">{team.stationsHeld}</span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>{team.chips} chips banked</span>
                <span>{totalDeposited} chips deposited</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity log */}
      <h2 className="text-lg font-bold mb-3">Recent Activity</h2>
      <div className="space-y-2">
        {game.activityLog.slice(0, 20).map((entry) => {
          const team = game.teams.find((t) => t.id === entry.teamId);
          const timeAgo = formatTimeAgo(entry.timestamp);
          return (
            <div key={entry.id} className="flex items-start gap-2 text-sm">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: team?.color || "#999" }} />
              <div className="flex-1">
                <p className="text-gray-700">{entry.message}</p>
                <p className="text-xs text-gray-400">{timeAgo}</p>
              </div>
            </div>
          );
        })}
        {game.activityLog.length === 0 && (
          <p className="text-sm text-gray-400">No activity yet</p>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}
