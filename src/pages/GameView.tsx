import { useState, useRef, useCallback } from "react";
import type { GameState, Challenge, ChallengeType } from "../../shared/types";
import MapView from "../components/MapView";
import StationPanel from "../components/StationPanel";
import GameTimer from "../components/GameTimer";
import * as store from "../store/gameStore";

const CHALLENGE_LEGEND: { type: ChallengeType; label: string; color: string; symbol: string }[] = [
  { type: "fixed", label: "Fixed", color: "#f59e0b", symbol: "$" },
  { type: "variable", label: "Variable", color: "#2563eb", symbol: "?" },
  { type: "multiplier", label: "Multiplier", color: "#9333ea", symbol: "×" },
  { type: "steal", label: "Steal", color: "#dc2626", symbol: "!" },
];

type ActiveTab = "scores" | "challenges" | null;

interface Props {
  game: GameState;
  teamId: string;
  onCapture: (teamId: string, stationId: string, chips: number) => void;
  onChallenge: (teamId: string, challengeId: string, result?: number) => Promise<number>;
}

export default function GameView({ game, teamId, onCapture, onChallenge }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [variableResult, setVariableResult] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [challengeStarted, setChallengeStarted] = useState(false);
  const [lastEarned, setLastEarned] = useState<number | null>(null);
  const [hiddenChallengeTypes, setHiddenChallengeTypes] = useState<Set<string>>(new Set());
  const [hoveredChallengeId, setHoveredChallengeId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [revealAll, setRevealAll] = useState(false);
  const [reserveChallenges, setReserveChallenges] = useState<{ id: string; name: string; type: string; rewardDescription: string }[]>([]);

  const handleChallengeHover = useCallback((id: string | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (id) {
      setHoveredChallengeId(id);
    } else {
      hoverTimeoutRef.current = setTimeout(() => setHoveredChallengeId(null), 100);
    }
  }, []);

  const myTeam = game.teams.find((t) => t.id === teamId)!;
  const selectedStation = selectedStationId
    ? game.stations.find((s) => s.id === selectedStationId) || null
    : null;
  const selectedChallenge = selectedChallengeId
    ? game.challenges.find((c) => c.id === selectedChallengeId) || null
    : null;

  const visibleChallenges = game.challenges;
  const availableChallenges = visibleChallenges.filter((c) => !c.completedBy.includes(teamId));

  const toggleTab = (tab: "scores" | "challenges") => {
    setDragOffset(0);
    handleChallengeHover(null);
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  async function handleCompleteChallenge(challenge: Challenge) {
    setCompleting(true);
    const needsResult = challenge.type === "variable" || !!challenge.resultLabel;
    const earned = await onChallenge(
      teamId,
      challenge.id,
      needsResult ? variableResult : undefined
    );
    setLastEarned(earned);
    setCompleting(false);
    setSelectedChallengeId(null);
    setTimeout(() => setLastEarned(null), 3000);
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Map area */}
      <div className="flex-1 relative overflow-hidden">
        <MapView
          game={game}
          teamId={teamId}
          hiddenChallengeTypes={hiddenChallengeTypes}
          hoveredChallengeId={hoveredChallengeId}
          selectedChallengeId={selectedChallengeId}
          revealAll={revealAll}
          onSelectStation={(id) => {
            setSelectedStationId(id);
            setSelectedChallengeId(null);
            setActiveTab(null);
          }}
          onSelectChallenge={(id) => {
            setSelectedChallengeId(id);
            setSelectedStationId(null);
            setChallengeStarted(false);
            setActiveTab(null);
          }}
        />

        {/* Top HUD — timer + my chips */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
          <div className="bg-black/75 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2">
            <GameTimer game={game} />
            <span className="text-white/30 text-xs">·</span>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: myTeam.color }} />
            <span className="text-white text-xs font-bold">{myTeam.chips} chips</span>
          </div>
        </div>

        {/* Debug gear icon */}
        <button
          onClick={() => setShowDebug(!showDebug)}
          className={`absolute top-3 left-3 z-[999] w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            showDebug ? "bg-white text-gray-800" : "bg-black/60 text-white/60 hover:text-white"
          }`}
          title="Debug menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>

        {/* Debug panel */}
        {showDebug && (
          <div className="absolute top-14 left-3 z-[999] bg-black/90 backdrop-blur-sm rounded-lg border border-white/10 p-3 w-72 max-h-[80vh] overflow-y-auto">
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Debug</h3>
            <div className="space-y-2 mb-4">
              <button
                onClick={() => { store.debugClearStations(game); window.location.reload(); }}
                className="w-full text-left px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10"
              >
                Clear all claimed stations
              </button>
              <button
                onClick={() => { store.debugClearChallenges(game); window.location.reload(); }}
                className="w-full text-left px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10"
              >
                Clear all completed challenges
              </button>
              <button
                onClick={() => { store.debugResetChips(game); window.location.reload(); }}
                className="w-full text-left px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10"
              >
                Reset chips to starting amount
              </button>
              <button
                onClick={() => setRevealAll(!revealAll)}
                className={`w-full text-left px-3 py-2 rounded text-xs border transition-colors ${
                  revealAll ? "bg-yellow-600/30 border-yellow-500/50 text-yellow-300" : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                }`}
              >
                {revealAll ? "Hide challenge details" : "Reveal ALL challenges"}
              </button>
            </div>
            <h4 className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-2">Add from Reserve</h4>
            {reserveChallenges.length === 0 ? (
              <button
                onClick={() => {
                  const activeIds = new Set(game.challenges.map((c) => c.id));
                  const available = store.RESERVE_CHALLENGES.filter((c) => !activeIds.has(c.id));
                  setReserveChallenges(available.map(c => ({ id: c.id, name: c.name, type: c.type, rewardDescription: c.rewardDescription })));
                }}
                className="w-full px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10"
              >
                Load reserve challenges
              </button>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {reserveChallenges.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      const challenge = store.RESERVE_CHALLENGES.find((r) => r.id === c.id);
                      if (challenge) {
                        store.debugAddChallenge(game, challenge);
                        setReserveChallenges(reserveChallenges.filter(r => r.id !== c.id));
                        window.location.reload();
                      }
                    }}
                    className="w-full text-left p-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white text-xs font-medium">{c.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        c.type === "fixed" ? "bg-green-900/50 text-green-300" :
                        c.type === "variable" ? "bg-blue-900/50 text-blue-300" :
                        c.type === "multiplier" ? "bg-purple-900/50 text-purple-300" :
                        "bg-red-900/50 text-red-300"
                      }`}>{c.type}</span>
                    </div>
                    <span className="text-white/40 text-[10px]">{c.rewardDescription}</span>
                  </button>
                ))}
                {reserveChallenges.length === 0 && (
                  <p className="text-white/30 text-[10px] text-center py-2">All reserve challenges deployed!</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Earned chips toast */}
        {lastEarned !== null && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[2000] bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg font-bold">
            +{lastEarned} chips!
          </div>
        )}

        {/* Bottom sheet — Scores or Challenges */}
        <div
          className="absolute left-0 right-0 bottom-0 z-[900] bg-zinc-900/97 backdrop-blur-md border-t border-white/10 flex flex-col"
          style={{
            maxHeight: "60vh",
            transform: activeTab ? `translateY(${dragOffset}px)` : "translateY(100%)",
            transition: isDragging ? "none" : "transform 300ms ease-out",
          }}
        >
          {/* Drag handle — touch target for swipe-to-dismiss */}
          <div
            className="flex justify-center pt-2.5 pb-3 shrink-0 touch-none"
            onTouchStart={(e) => {
              dragStartY.current = e.touches[0].clientY;
              setIsDragging(true);
            }}
            onTouchMove={(e) => {
              if (dragStartY.current === null) return;
              const delta = e.touches[0].clientY - dragStartY.current;
              if (delta > 0) setDragOffset(delta);
            }}
            onTouchEnd={() => {
              if (dragOffset > 80) {
                handleChallengeHover(null);
                setActiveTab(null);
              }
              setDragOffset(0);
              setIsDragging(false);
              dragStartY.current = null;
            }}
          >
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Scores sheet */}
          {activeTab === "scores" && (
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {/* Standings */}
              <div className="space-y-3 py-3 border-b border-white/10">
                {[...game.teams].sort((a, b) => b.stationsHeld - a.stationsHeld).map((team, i) => (
                  <div key={team.id} className="flex items-center gap-3">
                    <span className="text-white/30 text-xs w-4 text-right">{i + 1}</span>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="text-white text-sm font-semibold truncate">
                          {team.name}
                          {team.id === teamId && <span className="text-white/40 ml-1 text-xs font-normal">(you)</span>}
                        </span>
                        <span className="text-white font-bold ml-2">{team.stationsHeld}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div
                          className="h-1 rounded-full bg-current opacity-40 transition-all"
                          style={{
                            width: `${Math.min(100, (team.stationsHeld / Math.max(1, game.stations.length)) * 100)}%`,
                            color: team.color,
                            backgroundColor: team.color,
                            minWidth: team.stationsHeld > 0 ? "4px" : "0",
                          }}
                        />
                        <span className="text-white/30 text-[10px]">{team.chips} chips</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Activity feed */}
              <div className="pt-3">
                <span className="text-white/40 text-[10px] uppercase font-semibold tracking-wider">Activity</span>
                <div className="mt-2 space-y-2">
                  {game.activityLog.map((entry) => {
                    const team = game.teams.find((t) => t.id === entry.teamId);
                    return (
                      <div key={entry.id} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: team?.color || "#666" }} />
                        <span className="text-white/60 text-xs leading-snug">{entry.message}</span>
                      </div>
                    );
                  })}
                  {game.activityLog.length === 0 && (
                    <span className="text-white/30 text-xs">No activity yet</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Challenges sheet */}
          {activeTab === "challenges" && (
            <div className="flex-1 overflow-y-auto pb-4">
              {/* Challenge type filters */}
              <div className="flex gap-2 px-4 py-3 border-b border-white/10 shrink-0">
                {CHALLENGE_LEGEND.map(({ type, label, color, symbol }) => {
                  const hidden = hiddenChallengeTypes.has(type);
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        const next = new Set(hiddenChallengeTypes);
                        if (hidden) next.delete(type);
                        else next.add(type);
                        setHiddenChallengeTypes(next);
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all ${
                        hidden ? "border-white/10 opacity-40" : "border-white/20 opacity-100"
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-sm flex items-center justify-center text-white text-[8px] font-bold"
                        style={{ backgroundColor: color, transform: "rotate(45deg)" }}
                      >
                        <span style={{ transform: "rotate(-45deg)" }}>{symbol}</span>
                      </div>
                      <span className="text-white text-[10px] font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="px-4 pt-3 space-y-2">
                {availableChallenges.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      handleChallengeHover(null);
                      setSelectedChallengeId(c.id);
                      setSelectedStationId(null);
                      setChallengeStarted(false);
                      setActiveTab(null);
                    }}
                    onMouseEnter={() => handleChallengeHover(c.id)}
                    onMouseLeave={() => handleChallengeHover(null)}
                    className="w-full text-left p-3 rounded-xl border border-white/10 active:border-white/30 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-white text-sm font-medium leading-tight">
                        {revealAll ? c.name : c.type.charAt(0).toUpperCase() + c.type.slice(1) + " Challenge"}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                        c.type === "fixed" ? "bg-amber-900/60 text-amber-300" :
                        c.type === "variable" ? "bg-blue-900/60 text-blue-300" :
                        c.type === "multiplier" ? "bg-purple-900/60 text-purple-300" :
                        "bg-red-900/60 text-red-300"
                      }`}>
                        {c.type}
                      </span>
                    </div>
                    {(revealAll || !c.customScoring?.startsWith("call-your-shot")) && (
                      <p className="text-white/40 text-xs mt-1">{c.rewardDescription}</p>
                    )}
                  </button>
                ))}

                {availableChallenges.length === 0 && (
                  <p className="text-white/30 text-sm text-center py-6">No challenges available yet</p>
                )}

                {visibleChallenges.filter((c) => c.completedBy.includes(teamId)).length > 0 && (
                  <>
                    <div className="pt-3 pb-1">
                      <span className="text-white/30 text-[10px] uppercase font-semibold tracking-wider">Completed</span>
                    </div>
                    {visibleChallenges.filter((c) => c.completedBy.includes(teamId)).map((c) => (
                      <div key={c.id} className="p-3 rounded-xl border border-white/5 opacity-40">
                        <span className="text-white text-sm line-through">{c.name}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Station capture panel */}
        {selectedStation && (
          <StationPanel
            station={selectedStation}
            game={game}
            teamId={teamId}
            onCapture={onCapture}
            onClose={() => setSelectedStationId(null)}
          />
        )}

        {/* Challenge detail panel */}
        {selectedChallenge && (
          <div className={`absolute z-[1000] ${
            challengeStarted || revealAll
              ? "bottom-4 left-3 right-3 bg-zinc-800 rounded-xl p-4 shadow-2xl max-h-[50vh] overflow-y-auto border border-white/10"
              : "bottom-4 left-3 right-3 bg-zinc-800 rounded-full px-3 py-3 shadow-2xl flex items-center gap-2 border border-white/10"
          }`}>
            {selectedChallenge.completedBy.includes(teamId) ? (
              <div className="flex items-center gap-3 w-full">
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  selectedChallenge.type === "multiplier" ? "bg-purple-500 shadow-[0_0_8px_#9333ea]" :
                  selectedChallenge.type === "steal" ? "bg-red-500 shadow-[0_0_8px_#dc2626]" :
                  selectedChallenge.type === "variable" ? "bg-blue-500 shadow-[0_0_8px_#2563eb]" :
                  "bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                }`} />
                <span className="text-green-400 text-sm font-semibold flex-1">Completed!</span>
                <button onClick={() => setSelectedChallengeId(null)} className="text-zinc-400 text-sm font-medium px-3 py-1">&times;</button>
              </div>
            ) : !challengeStarted && !revealAll ? (
              <>
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  selectedChallenge.type === "multiplier" ? "bg-purple-500 shadow-[0_0_8px_#9333ea]" :
                  selectedChallenge.type === "steal" ? "bg-red-500 shadow-[0_0_8px_#dc2626]" :
                  selectedChallenge.type === "variable" ? "bg-blue-500 shadow-[0_0_8px_#2563eb]" :
                  "bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold">
                    {selectedChallenge.type.charAt(0).toUpperCase() + selectedChallenge.type.slice(1)}
                  </div>
                  {!selectedChallenge.customScoring?.startsWith("call-your-shot") && (
                    <div className="text-zinc-400 text-xs leading-tight">{selectedChallenge.rewardDescription}</div>
                  )}
                </div>
                <button
                  onClick={() => setChallengeStarted(true)}
                  className="bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-full shrink-0"
                >
                  Start
                </button>
                <button onClick={() => setSelectedChallengeId(null)} className="text-zinc-500 text-lg shrink-0">&times;</button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold text-base">{selectedChallenge.name}</h3>
                  <button onClick={() => setSelectedChallengeId(null)} className="text-zinc-500 text-xl leading-none">&times;</button>
                </div>
                <p className="text-zinc-300 text-sm mb-2">{selectedChallenge.description}</p>
                {selectedChallenge.imageUrl && (
                  <img src={selectedChallenge.imageUrl} alt={selectedChallenge.name} className="h-20 rounded mb-3" />
                )}
                <p className="text-blue-400 text-sm font-semibold mb-3">{selectedChallenge.rewardDescription}</p>
                {(selectedChallenge.type === "variable" || selectedChallenge.resultLabel) && (
                  <div className="mb-3">
                    <label className="text-xs text-zinc-400 block mb-1">{selectedChallenge.resultLabel || "Enter your result:"}</label>
                    <input
                      type="number"
                      min={0}
                      value={variableResult}
                      onChange={(e) => setVariableResult(Number(e.target.value))}
                      className="w-full rounded-lg bg-zinc-700 border border-zinc-600 text-white px-3 py-2"
                    />
                  </div>
                )}
                <button
                  onClick={() => handleCompleteChallenge(selectedChallenge)}
                  disabled={completing}
                  className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
                >
                  {completing ? "Submitting..." : "Complete Challenge"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <div
        className="shrink-0 flex bg-black/95 backdrop-blur-sm border-t border-white/10"
        style={{ height: "calc(56px + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          onClick={() => toggleTab("scores")}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activeTab === "scores" ? "text-white" : "text-white/40"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span className="text-[10px] font-medium">Scores</span>
        </button>

        <button
          onClick={() => toggleTab("challenges")}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
            activeTab === "challenges" ? "text-white" : "text-white/40"
          }`}
        >
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            {availableChallenges.length > 0 && activeTab !== "challenges" && (
              <span className="absolute -top-1 -right-2 bg-yellow-500 text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {availableChallenges.length > 9 ? "9+" : availableChallenges.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Challenges</span>
        </button>
      </div>
    </div>
  );
}
