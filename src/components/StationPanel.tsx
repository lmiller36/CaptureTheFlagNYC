import { useState } from "react";
import { ROUTE_COLORS } from "../constants";
import type { GameState, Station } from "../../shared/types";

interface Props {
  station: Station;
  game: GameState;
  teamId: string;
  onCapture: (teamId: string, stationId: string, chips: number) => void;
  onClose: () => void;
}

export default function StationPanel({ station, game, teamId, onCapture, onClose }: Props) {
  const myTeam = game.teams.find((t) => t.id === teamId)!;
  const ownerTeam = station.ownedBy ? game.teams.find((t) => t.id === station.ownedBy) : null;
  const isMine = station.ownedBy === teamId;
  const isMaxed = station.chips >= 10;
  const minRequired = station.ownedBy && !isMine ? station.chips + 1 : 1;
  const maxDeposit = isMine ? 10 - station.chips : 10;

  const [chips, setChips] = useState(Math.min(minRequired, myTeam.chips, maxDeposit));

  const canCapture = chips >= minRequired && chips <= myTeam.chips && chips <= maxDeposit && !isMaxed;

  function handleCapture() {
    if (!canCapture) return;
    onCapture(teamId, station.id, chips);
    onClose();
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-4 z-[1000]">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">{station.name}</h3>
          <div className="flex gap-1 mt-1 flex-wrap">
            {station.lines.map((line) => (
              <span
                key={line}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: ROUTE_COLORS[line] ?? "#808183",
                  color: ["N", "Q", "R", "W"].includes(line) ? "#000" : "#fff",
                }}
              >
                {line}
              </span>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 text-xl leading-none">&times;</button>
      </div>

      {/* Status */}
      <div className="mb-4 p-3 rounded-lg bg-gray-50">
        {ownerTeam ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ownerTeam.color }} />
            <span className="text-sm font-medium">{ownerTeam.name}</span>
            <span className="text-sm text-gray-500">- {station.chips} chips deposited</span>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Uncaptured</p>
        )}
      </div>

      {/* Action */}
      {isMaxed && !isMine && (
        <p className="text-sm text-red-600 font-medium">This station is at max (10) and cannot be contested.</p>
      )}

      {isMaxed && isMine && (
        <p className="text-sm text-green-600 font-medium">Your station is fully fortified!</p>
      )}

      {!isMaxed && (
        <>
          <div className="mb-3">
            <label className="text-sm text-gray-600 block mb-1">
              {isMine ? "Reinforce with:" : station.ownedBy ? `Capture (need ${minRequired}+ chips):` : "Deposit chips:"}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={minRequired}
                max={Math.min(myTeam.chips, maxDeposit)}
                value={chips}
                onChange={(e) => setChips(Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-mono text-lg font-bold w-8 text-center">{chips}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">You have {myTeam.chips} chips available</p>
          </div>

          <button
            onClick={handleCapture}
            disabled={!canCapture}
            className={`w-full rounded-lg py-3 font-semibold text-white ${
              isMine
                ? "bg-green-600 hover:bg-green-700"
                : station.ownedBy
                ? "bg-red-600 hover:bg-red-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            } disabled:opacity-50`}
          >
            {isMine ? "Reinforce" : station.ownedBy ? "Capture!" : "Claim Station"}
          </button>
        </>
      )}
    </div>
  );
}
