const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ⭐ IMPORTANT: Your GitHub folder is "Public", not "public"
const publicPath = path.join(__dirname, "Public");

// Serve static files
app.use(express.static(publicPath));

// Route for "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// ---------------------------------------------
//   YOUR GAME LOGIC (unchanged)
// ---------------------------------------------

const patients = [
  {
    id: 1,
    name: "Patient 1 – Crush Injury",
    vitals: {
      consciousness: "Responds to pain",
      respiratoryRate: "28 / min",
      pulse: "135 bpm (weak, thready)",
      bloodPressure: "80/50 mmHg",
      oxygenSaturation: "88%"
    },
    aiDecision: {
      triage: "Red",
      tests: ["IV Fluids", "X-ray", "Oxygen"],
      treatment: "Emergency Surgery",
      aiTimeSeconds: 1.2
    }
  },
  {
    id: 2,
    name: "Patient 2 – Stable Trauma",
    vitals: {
      consciousness: "Alert, oriented",
      respiratoryRate: "20 / min",
      pulse: "96 bpm",
      bloodPressure: "120/75 mmHg",
      oxygenSaturation: "98%"
    },
    aiDecision: {
      triage: "Yellow",
      tests: ["X-ray"],
      treatment: "Observation",
      aiTimeSeconds: 1.2
    }
  },
  {
    id: 3,
    name: "Patient 3 – Minor Injury",
    vitals: {
      consciousness: "Alert, walking",
      respiratoryRate: "18 / min",
      pulse: "88 bpm",
      bloodPressure: "125/80 mmHg",
      oxygenSaturation: "99%"
    },
    aiDecision: {
      triage: "Green",
      tests: [],
      treatment: "Discharge with analgesia",
      aiTimeSeconds: 1.2
    }
  },
  {
    id: 4,
    name: "Patient 4 – Cardiac Arrest",
    vitals: {
      consciousness: "Unresponsive",
      respiratoryRate: "Agonal / none",
      pulse: "No palpable pulse",
      bloodPressure: "Undetectable",
      oxygenSaturation: "70%"
    },
    aiDecision: {
      triage: "Black",
      tests: [],
      treatment: "CPR / ACLS as appropriate",
      aiTimeSeconds: 1.2
    }
  }
];

let currentGame = null;
let leaderboard = [];

// Utility functions
function findPatient(patientId) {
  return patients.find((p) => p.id === patientId);
}

function arraysEqualAsSets(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}

function scoreGame(human, ai, humanTime) {
  let score = 0;
  if (human.triage === ai.triage) score += 5;
  if (human.treatment === ai.treatment) score += 3;
  if (arraysEqualAsSets(human.tests, ai.tests)) score += 2;
  if (humanTime < ai.aiTimeSeconds) score += 2;
  if (humanTime <= 30) score += 2;
  return score;
}

function broadcastState() {
  io.emit("stateUpdate", {
    currentGame,
    leaderboard
  });
}

// Socket.IO
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  if (currentGame || leaderboard.length > 0) {
    socket.emit("stateUpdate", {
      currentGame,
      leaderboard
    });
  }

  socket.on("registerPlayer", (data) => {
    const { playerName, mode, patientId } = data;
    const patient = findPatient(patientId);

    if (!patient) {
      socket.emit("errorMessage", "Selected patient not found.");
      return;
    }

    currentGame = {
      id: Date.now(),
      playerName,
      mode,
      patientId: patient.id,
      patientName: patient.name,
      vitalsScanned: [],
      allVitalsCollected: false,
      triagePhaseStartedAt: null,
      humanDecision: null,
      result: null
    };

    io.emit("gameRegistered", currentGame);
    broadcastState();
  });

  socket.on("scanVital", (data) => {
    if (!currentGame) return;

    const { vitalKey } = data;
    const patient = findPatient(currentGame.patientId);
    if (!patient || !patient.vitals[vitalKey]) return;

    if (!currentGame.vitalsScanned.includes(vitalKey)) {
      currentGame.vitalsScanned.push(vitalKey);
    }

    const total = Object.keys(patient.vitals).length;
    const count = currentGame.vitalsScanned.length;

    const payload = {
      vitalKey,
      vitalValue: patient.vitals[vitalKey],
      count,
      total
    };

    io.emit("vitalScanned", payload);

    if (count === total && !currentGame.allVitalsCollected) {
      currentGame.allVitalsCollected = true;
      currentGame.triagePhaseStartedAt = Date.now();
      io.emit("allVitalsCollected", {
        message: "All vitals collected! Proceed to the triage screen.",
        triageTimerSeconds: 60
      });
    }

    broadcastState();
  });

  socket.on("submitHumanDecision", (data) => {
    if (!currentGame || !currentGame.allVitalsCollected) return;

    const { triage, tests, treatment } = data;
    const patient = findPatient(currentGame.patientId);
    if (!patient) return;

    const now = Date.now();
    const humanTimeSeconds = (now - currentGame.triagePhaseStartedAt) / 1000;

    const humanDecision = {
      triage,
      tests,
      treatment,
      timeSeconds: humanTimeSeconds
    };

    currentGame.humanDecision = humanDecision;

    const points = scoreGame(humanDecision, patient.aiDecision, humanTimeSeconds);

    const result = {
      playerName: currentGame.playerName,
      mode: currentGame.mode,
      patientName: patient.name,
      human: humanDecision,
      ai: patient.aiDecision,
      points
    };

    currentGame.result = result;

    leaderboard.push({
      playerName: currentGame.playerName,
      mode: currentGame.mode,
      points,
      timeSeconds: humanTimeSeconds
    });

    leaderboard.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.timeSeconds - b.timeSeconds;
    });

    io.emit("resultsReady", result);
    broadcastState();
  });

  socket.on("resetGame", () => {
    currentGame = null;
    broadcastState();
  });

  socket.on("resetLeaderboard", () => {
    leaderboard = [];
    broadcastState();
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
