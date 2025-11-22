const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// --- SAMPLE PATIENT DATA ---
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

// ----- Utility functions -----
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

  // +5 correct triage
  if (human.triage === ai.triage) score += 5;

  // +3 correct treatment
  if (human.treatment === ai.treatment) score += 3;

  // +2 tests match as a set
  if (arraysEqualAsSets(human.tests, ai.tests)) score += 2;

  // +2 faster than AI AND +2 under 30s
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

// ----- Socket.IO -----
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // send current state on connect
  if (currentGame || leaderboard.length > 0) {
    socket.emit("stateUpdate", {
      currentGame,
      leaderboard
    });
  }

  // player registers from mobile
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

    console.log("New game registered:", currentGame);
    io.emit("gameRegistered", currentGame);
    broadcastState();
  });

  // mobile "scan" vital
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

  // big screen submits human decision
  socket.on("submitHumanDecision", (data) => {
    if (!currentGame || !currentGame.allVitalsCollected) return;

    const { triage, tests, treatment } = data;
    const patient = findPatient(currentGame.patientId);
    if (!patient) return;

    const now = Date.now();
    const humanTimeSeconds = currentGame.triagePhaseStartedAt
      ? (now - currentGame.triagePhaseStartedAt) / 1000
      : 60;

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

    // update leaderboard
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

  // reset only current game
  socket.on("resetGame", () => {
    currentGame = null;
    broadcastState();
  });

  // ⭐ NEW: reset leaderboard completely
  socket.on("resetLeaderboard", () => {
    leaderboard = [];
    broadcastState();
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
