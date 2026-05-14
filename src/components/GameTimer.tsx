import { useState, useEffect } from "react";
import type { GameState } from "../../shared/types";

export default function GameTimer({ game }: { game: GameState }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (game.status !== "active") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [game.status]);

  if (game.status === "finished") {
    return <span className="text-xs font-bold text-red-400">GAME OVER</span>;
  }

  if (!game.endTime) {
    return <span className="text-xs text-white/50">Not started</span>;
  }

  const remaining = Math.max(0, game.endTime - now);
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  const timeStr = hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;

  const isUrgent = remaining < 30 * 60 * 1000;

  return (
    <span className={`text-xs font-mono font-bold ${isUrgent ? "text-red-400" : "text-white"}`}>
      {timeStr}
    </span>
  );
}
