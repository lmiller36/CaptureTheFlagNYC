import { Routes, Route, Navigate } from "react-router-dom";
import { useGame } from "./hooks/useGame";
import { useState } from "react";
import Lobby from "./pages/Lobby";
import GameView from "./pages/GameView";

export default function App() {
  const { game, error, createGame, startGame, captureStation, completeChallenge, resetGame } = useGame();
  const [teamId, setTeamId] = useState<string | null>(
    () => localStorage.getItem("teamId")
  );

  const selectTeam = (id: string) => {
    setTeamId(id);
    localStorage.setItem("teamId", id);
  };

  return (
    <div className="h-dvh w-screen flex flex-col overflow-hidden">
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {error}
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={
            game && game.status !== "lobby" && teamId ? (
              <Navigate to="/game" replace />
            ) : (
              <Lobby
                game={game}
                teamId={teamId}
                onSelectTeam={selectTeam}
                onCreateGame={createGame}
                onStartGame={startGame}
                onResetGame={resetGame}
              />
            )
          }
        />
        <Route
          path="/game"
          element={
            game && teamId ? (
              <GameView
                game={game}
                teamId={teamId}
                onCapture={captureStation}
                onChallenge={completeChallenge}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </div>
  );
}
