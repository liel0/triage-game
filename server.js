// server.js
// Simple Express + Socket.IO relay for the AI Triage Drone booth.

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "Public")));

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Operator joins from mobile (name + mode)
  socket.on("operator-joined", (payload) => {
    io.emit("operator-joined", payload); // broadcast to all, including big screen
  });

  // QR scanned on mobile
  socket.on("qr-scanned", (payload) => {
    io.emit("qr-scanned", payload); // { url }
  });

  // Human triage decision submitted on big screen (for leaderboard)
  socket.on("triage-submitted", (payload) => {
    io.emit("triage-submitted", payload);
  });

  // Reset leaderboard if needed
  socket.on("reset-leaderboard", () => {
    io.emit("reset-leaderboard");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
