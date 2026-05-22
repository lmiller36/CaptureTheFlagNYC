import { useState, useCallback, useEffect } from "react";
import type { GameState } from "../../shared/types";
import * as store from "../store/gameStore";

export function useGame() {
  const [game, setGame] = useState<GameState | null>(() => store.loadGame());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!game) return;
    if (game.status !== "active" || !game.endTime) return;
    const remaining = game.endTime - Date.now();
    if (remaining <= 0) {
      game.status = "finished";
      setGame({ ...game });
      return;
    }
    const timer = setTimeout(() => {
      game.status = "finished";
      setGame({ ...game });
    }, remaining);
    return () => clearTimeout(timer);
  }, [game?.status, game?.endTime]);

  const refresh = (g: GameState) => setGame({ ...g });

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  };

  const createGame = useCallback(async (config: Parameters<typeof store.createGame>[0]) => {
    const g = await store.createGame(config);
    setGame(g);
  }, []);

  const startGame = useCallback(() => {
    if (!game) return;
    const g = store.startGame(game);
    refresh(g);
  }, [game]);

  const captureStation = useCallback(
    (teamId: string, stationId: string, chips: number) => {
      if (!game) return;
      const result = store.captureStation(game, teamId, stationId, chips);
      if (result.success) {
        refresh(game);
      } else {
        showError(result.error || "Capture failed");
      }
    },
    [game]
  );

  const completeChallenge = useCallback(
    (teamId: string, challengeId: string, result?: number): Promise<number> => {
      if (!game) return Promise.resolve(0);
      const res = store.completeChallenge(game, teamId, challengeId, result);
      if (res.success) {
        refresh(game);
        return Promise.resolve(res.chipsEarned || 0);
      } else {
        showError(res.error || "Challenge failed");
        return Promise.resolve(0);
      }
    },
    [game]
  );

  const resetGame = useCallback(() => {
    store.resetGame();
    setGame(null);
  }, []);

  return {
    game,
    connected: true,
    error,
    createGame,
    startGame,
    captureStation,
    completeChallenge,
    resetGame,
  };
}
