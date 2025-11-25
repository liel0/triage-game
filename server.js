// server.js
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Serve static files from /Public
app.use(express.static(path.join(__dirname, "Public")));

const PORT = process.env.PORT || 3000;

// Simple broadcast relays – no complex rooms (1 screen + 1 mobile in booth)
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Operator joined (from mobile)
  socket.on("operatorInfo", (payload) => {
    io.emit("operatorInfo", payload);
  });

  // QR scan result (from mobile)
  socket.on("scanVital", (payload) => {
    io.emit("scanVital", payload);
  });

  // Human triage decision (from big screen)
  socket.on("triageDecision", (payload) => {
    io.emit("triageDecision", payload);
  });

  // Reset simulation (from big screen)
  socket.on("resetSimulation", () => {
    io.emit("resetSimulation");
  });

  // Reset leaderboard (from big screen)
  socket.on("resetLeaderboard", () => {
    io.emit("resetLeaderboard");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
