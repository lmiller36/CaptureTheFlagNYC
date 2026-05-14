import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { GameState } from "../../shared/types";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("game:update", (state: GameState) => setGame(state));
    socket.on("game:reset", () => setGame(null));
    socket.on("error", (msg: string) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const captureStation = useCallback(
    (teamId: string, stationId: string, chips: number) => {
      socketRef.current?.emit("station:capture", { teamId, stationId, chips });
    },
    []
  );

  const completeChallenge = useCallback(
    (teamId: string, challengeId: string, result?: number) => {
      return new Promise<number>((resolve) => {
        socketRef.current?.emit("challenge:complete", { teamId, challengeId, result });
        socketRef.current?.once("challenge:result", (data: { chipsEarned: number }) => {
          resolve(data.chipsEarned);
        });
      });
    },
    []
  );

  return { game, connected, error, captureStation, completeChallenge };
}
