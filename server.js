// server.js
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// serve static files
app.use(express.static(path.join(__dirname, "Public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "index.html"));
});

app.get("/mobile", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "mobile.html"));
});

// Socket.io
io.on("connection", (socket) => {
  // store operator info on this connection
  socket.on("operator-joined", (payload) => {
    socket.operatorInfo = {
      name: payload.name || "Visitor",
      mode: payload.mode || "Solo",
    };

    // broadcast to all screens so the main display can show the operator
    io.emit("operator-joined", socket.operatorInfo);
  });

  // QR tag scanned on mobile
  socket.on("qr-scanned", (data) => {
    const info = socket.operatorInfo || { name: "Visitor", mode: "Solo" };
    io.emit("qr-scanned", {
      url: data.url,
      operator: info.name,
      mode: info.mode,
    });
  });

  // triage result submitted on the big screen
  socket.on("triage-submitted", (payload) => {
    // broadcast so any other big displays can mirror the leaderboard
    io.emit("triage-submitted", payload);
  });

  // reset leaderboard from any screen
  socket.on("reset-leaderboard", () => {
    io.emit("reset-leaderboard");
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
