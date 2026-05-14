import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import {
  getGame,
  createGame,
  startGame,
  captureStation,
  completeChallenge,
  resetGame,
  debugClearStations,
  debugClearChallenges,
  debugResetChips,
  debugAddChallenge,
} from "./game";
import type { GameConfig } from "../shared/types";
import { SUBWAY_LINES } from "./subway-lines";
import { RESERVE_CHALLENGES } from "./challenges";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.json());

// Serve static files
const __dirname = new URL(".", import.meta.url).pathname;
app.use(express.static(path.join(__dirname, "../public")));
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist")));
}

// REST API
app.get("/api/subway-lines", (_req, res) => {
  res.json(SUBWAY_LINES);
});

app.get("/api/game", (_req, res) => {
  const game = getGame();
  if (!game) return res.status(404).json({ error: "No game exists" });
  res.json(game);
});

app.post("/api/game", (req, res) => {
  const config: GameConfig = req.body;
  const game = createGame(config);
  io.emit("game:update", game);
  res.json(game);
});

app.post("/api/game/start", (_req, res) => {
  const game = startGame();
  if (!game) return res.status(400).json({ error: "Cannot start game" });
  io.emit("game:update", game);

  // Broadcast game end
  setTimeout(() => {
    const current = getGame();
    if (current) io.emit("game:update", current);
  }, game.durationMinutes * 60 * 1000);

  res.json(game);
});

app.post("/api/game/reset", (_req, res) => {
  resetGame();
  io.emit("game:reset");
  res.json({ success: true });
});

// Debug endpoints
app.post("/api/debug/clear-stations", (_req, res) => {
  debugClearStations();
  io.emit("game:update", getGame());
  res.json({ success: true });
});

app.post("/api/debug/clear-challenges", (_req, res) => {
  debugClearChallenges();
  io.emit("game:update", getGame());
  res.json({ success: true });
});

app.post("/api/debug/reset-chips", (_req, res) => {
  debugResetChips();
  io.emit("game:update", getGame());
  res.json({ success: true });
});

app.get("/api/debug/reserve-challenges", (_req, res) => {
  const game = getGame();
  const activeIds = new Set(game?.challenges.map((c) => c.id) || []);
  const available = RESERVE_CHALLENGES.filter((c) => !activeIds.has(c.id));
  res.json(available);
});

app.post("/api/debug/add-challenge", (req, res) => {
  const { id } = req.body;
  const challenge = RESERVE_CHALLENGES.find((c) => c.id === id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found in reserve" });
  debugAddChallenge(challenge);
  io.emit("game:update", getGame());
  res.json({ success: true });
});

// Socket.io
io.on("connection", (socket) => {
  const game = getGame();
  if (game) {
    socket.emit("game:update", game);
  }

  socket.on("station:capture", (data: { teamId: string; stationId: string; chips: number }) => {
    const result = captureStation(data.teamId, data.stationId, data.chips);
    if (result.success) {
      io.emit("game:update", getGame());
    } else {
      socket.emit("error", result.error);
    }
  });

  socket.on(
    "challenge:complete",
    (data: { teamId: string; challengeId: string; result?: number }) => {
      const result = completeChallenge(data.teamId, data.challengeId, data.result);
      if (result.success) {
        io.emit("game:update", getGame());
        socket.emit("challenge:result", { chipsEarned: result.chipsEarned });
      } else {
        socket.emit("error", result.error);
      }
    }
  );
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
