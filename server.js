// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// serve everything in Public/
app.use(express.static(path.join(__dirname, "Public")));

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Visitor name + mode from mobile
  socket.on("operatorInfo", (info) => {
    io.emit("operatorInfo", info); // broadcast to all screens
  });

  // QR scan from mobile
  socket.on("scan", (payload) => {
    io.emit("scan", payload); // forward to big screen
  });

  // Optional: score events can be broadcast here if you build a global leaderboard
  socket.on("submitScore", (score) => {
    io.emit("submitScore", score);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
