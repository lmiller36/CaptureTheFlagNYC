import { useState } from "react";
import type { GameState, Challenge } from "../../shared/types";

interface Props {
  game: GameState;
  teamId: string;
  selectedChallengeId: string | null;
  onSelect: (id: string | null) => void;
  onComplete: (teamId: string, challengeId: string, result?: number) => Promise<number>;
}

export default function ChallengePanel({ game, teamId, selectedChallengeId, onSelect, onComplete }: Props) {
  const [variableResult, setVariableResult] = useState<number>(0);
  const [completing, setCompleting] = useState(false);
  const [lastEarned, setLastEarned] = useState<number | null>(null);

  const visibleChallenges = game.challenges;
  const available = visibleChallenges.filter((c) => !c.completedBy.includes(teamId));
  const completed = visibleChallenges.filter((c) => c.completedBy.includes(teamId));

  const selected = selectedChallengeId
    ? game.challenges.find((c) => c.id === selectedChallengeId)
    : null;

  async function handleComplete(challenge: Challenge) {
    setCompleting(true);
    const needsResult = challenge.type === "variable" || !!challenge.resultLabel;
    const earned = await onComplete(
      teamId,
      challenge.id,
      needsResult ? variableResult : undefined
    );
    setLastEarned(earned);
    setCompleting(false);
    setTimeout(() => setLastEarned(null), 3000);
  }

  if (selected && !selected.completedBy.includes(teamId)) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <button onClick={() => onSelect(null)} className="text-indigo-600 text-sm mb-4">&larr; Back</button>

        <div className="bg-white rounded-xl shadow-lg p-5">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-xl font-bold">{selected.name}</h2>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              selected.type === "fixed" ? "bg-green-100 text-green-700" :
              selected.type === "variable" ? "bg-blue-100 text-blue-700" :
              selected.type === "multiplier" ? "bg-purple-100 text-purple-700" :
              "bg-red-100 text-red-700"
            }`}>
              {selected.type}
            </span>
          </div>

          <p className="text-gray-700 mb-4">{selected.description}</p>

          {selected.imageUrl && (
            <img src={selected.imageUrl} alt={selected.name} className="h-20 rounded mb-4" />
          )}

          <p className="text-indigo-600 font-semibold mb-6">{selected.rewardDescription}</p>

          {(selected.type === "variable" || selected.resultLabel) && (
            <div className="mb-4">
              <label className="text-sm text-gray-600 block mb-1">{selected.resultLabel || "Enter your result:"}</label>
              <input
                type="number"
                min={0}
                value={variableResult}
                onChange={(e) => setVariableResult(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          )}

          {selected.type === "steal" && (
            <div className="mb-4 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                This will steal {selected.reward}% from the opponent with the most chips.
              </p>
            </div>
          )}

          {selected.type === "multiplier" && (
            <div className="mb-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700">
                This will multiply your current chip bank by {selected.reward}%.
              </p>
            </div>
          )}

          <button
            onClick={() => handleComplete(selected)}
            disabled={completing}
            className="w-full bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {completing ? "Submitting..." : "Complete Challenge"}
          </button>
        </div>

        {lastEarned !== null && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
            <p className="text-green-700 font-bold text-lg">+{lastEarned} chips earned!</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {lastEarned !== null && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-center">
          <p className="text-green-700 font-bold">+{lastEarned} chips earned!</p>
        </div>
      )}

      <h2 className="text-lg font-bold mb-3">Available ({available.length})</h2>
      {available.length === 0 && (
        <p className="text-gray-500 text-sm mb-4">No challenges available right now. Capture more stations to reveal new ones!</p>
      )}
      <div className="space-y-2 mb-6">
        {available.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="w-full text-left p-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-indigo-300 transition-colors"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">{c.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                c.type === "fixed" ? "bg-green-100 text-green-700" :
                c.type === "variable" ? "bg-blue-100 text-blue-700" :
                c.type === "multiplier" ? "bg-purple-100 text-purple-700" :
                "bg-red-100 text-red-700"
              }`}>
                {c.type}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{c.rewardDescription}</p>
          </button>
        ))}
      </div>

      {completed.length > 0 && (
        <>
          <h2 className="text-lg font-bold mb-3 text-gray-400">Completed ({completed.length})</h2>
          <div className="space-y-2 opacity-60">
            {completed.map((c) => (
              <div key={c.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm line-through">{c.name}</span>
                  <span className="text-xs text-green-600">Done</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
