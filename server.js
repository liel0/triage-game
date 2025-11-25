// server.js
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "Public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "index.html"));
});

app.get("/mobile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "mobile.html"));
});

// Simple in-memory leaderboard
let leaderboard = [];
const MAX_LEADERBOARD = 20;

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Send current leaderboard to new client
  socket.emit("leaderboardUpdate", leaderboard);

  // 🔹 Every QR scan from any phone arrives here
  socket.on("scanVital", (payload = {}) => {
    const { qrData = null } = payload;

    // Broadcast a generic "tag scanned" event to all big screens.
    // We NO LONGER check what the QR value is.
    io.emit("tagScanned", {
      qrData,
      at: Date.now(),
    });
  });

  // Start simulation (e.g. new team, new scenario)
  socket.on("startSimulation", (data) => {
    io.emit("startSimulation", data);
  });

  // Human decision submitted from big screen
  socket.on("submitDecision", (result) => {
    // result should contain: { teamName, scenarioId, score, timeSeconds, ... }

    leaderboard.push(result);
    leaderboard.sort((a, b) => {
      // Higher score first
      if (b.score !== a.score) return b.score - a.score;
      // If same score, faster time first
      return a.timeSeconds - b.timeSeconds;
    });
    leaderboard = leaderboard.slice(0, MAX_LEADERBOARD);

    io.emit("leaderboardUpdate", leaderboard);
    io.emit("decisionResult", result);
  });

  // Reset leaderboard from admin button
  socket.on("resetLeaderboard", () => {
    leaderboard = [];
    io.emit("leaderboardUpdate", leaderboard);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Triage game server listening on port ${PORT}`);
});
