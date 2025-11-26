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
  socket.on("operator-joined", (payload) => {
    socket.operatorInfo = {
      name: payload.name || "Visitor",
      mode: payload.mode || "Solo",
    };
    // notify big screen(s)
    io.emit("operator-info", socket.operatorInfo);
  });

  socket.on("qr-scanned", (data) => {
    const info = socket.operatorInfo || { name: "Visitor", mode: "Solo" };
    io.emit("qr-scanned", {
      url: data.url,
      operator: info.name,
      mode: info.mode,
    });
  });

  // leaderboard + results sharing between screens
  socket.on("triage-submitted", (data) => {
    io.emit("triage-submitted", data);
  });

  socket.on("reset-leaderboard", () => {
    io.emit("reset-leaderboard");
  });

  // kept for future use if needed
  socket.on("final-score", (data) => {
    io.emit("final-score", data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
