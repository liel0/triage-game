const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const publicPath = path.join(__dirname, "Public");
app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// ------------------- PATIENT DATA -------------------

const patients = [
  {
    id: 1,
    name: "Patient 1 – Crush Injury",
    narrative:
      "Male, 35, Hajj pilgrim crushed under a metal barrier during crowd movement. Trapped for several minutes before rescue.",
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
      treatmentSteps: {
        primary: "Rapid IV Fluids + Oxygen",
        secondary: "Blood transfusion, analgesia",
        disposition: "Emergency OR"
      },
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "Low blood pressure, tachycardia, and reduced consciousness after crush injury indicate hemorrhagic shock → Immediate (Red).",
      tests:
        "X-ray to look for fractures / chest injury, IV access for resuscitation, and oxygen for hypoxia are first-line in unstable trauma.",
      treatment:
        "Suspected internal bleeding from crush injury → definitive source control requires emergency surgery after initial resuscitation."
    }
  },
  {
    id: 2,
    name: "Patient 2 – Stable Trauma",
    narrative:
      "Female, 24, minor vehicle collision. Walked to triage area with chest discomfort but stable vitals.",
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
      treatmentSteps: {
        primary: "Analgesia, basic monitoring",
        secondary: "Chest X-ray, repeat vitals",
        disposition: "Observation ward"
      },
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "Normal blood pressure, normal oxygen saturation, and full consciousness → not immediately life-threatening but needs assessment → Yellow.",
      tests:
        "Chest X-ray is appropriate to exclude fractures or occult lung injury given chest pain, but no need for aggressive tests.",
      treatment:
        "Patient is stable; observation with analgesia and serial exams is safer than unnecessary aggressive intervention."
    }
  },
  {
    id: 3,
    name: "Patient 3 – Minor Injury",
    narrative:
      "Teenage pilgrim with ankle sprain after tripping on stairs. Walking independently to triage.",
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
      treatmentSteps: {
        primary: "RICE (rest, ice, compression, elevation)",
        secondary: "Simple analgesia",
        disposition: "Discharge"
      },
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "Walking wounded with normal vitals and isolated limb pain → safe to classify as Minor (Green).",
      tests:
        "No red-flag features; imaging can be deferred or done outpatient depending on local protocol.",
      treatment:
        "Supportive management with simple analgesia and discharge is appropriate for a stable minor sprain."
    }
  },
  {
    id: 4,
    name: "Patient 4 – Cardiac Arrest",
    narrative:
      "Male, 60, collapsed suddenly near the tents. No response, no breathing, and no palpable pulse.",
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
      treatmentSteps: {
        primary: "Immediate high-quality CPR",
        secondary: "Defibrillation / ACLS algorithm",
        disposition: "Resuscitation bay / consider termination per protocol"
      },
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "No pulse and absent effective breathing in a mass-casualty setting → expectant (Black) unless resources allow full resuscitation.",
      tests:
        "During arrest, focus is on CPR and defibrillation rather than diagnostics.",
      treatment:
        "CPR and adherence to ACLS guidelines are the only meaningful interventions; prognosis is poor but basic life support may be attempted."
    }
  }
];

// ------------------- GAME STATE -------------------

let currentGame = null;
let leaderboard = [];

function findPatient(patientId) {
  return patients.find((p) => p.id === patientId);
}

function arraysEqualAsSets(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  for (const item of setA) if (!setB.has(item)) return false;
  return true;
}

// Returns a breakdown object with per-component scores + total
function scoreGame(human, ai, humanTime) {
  const breakdown = {
    triage: 0,
    treatment: 0,
    tests: 0,
    fasterThanAI: 0,
    under30: 0,
    total: 0
  };

  if (human.triage === ai.triage) breakdown.triage = 5;
  if (human.treatment === ai.treatment) breakdown.treatment = 3;
  if (arraysEqualAsSets(human.tests, ai.tests)) breakdown.tests = 2;
  if (humanTime < ai.aiTimeSeconds) breakdown.fasterThanAI = 2;
  if (humanTime <= 30) breakdown.under30 = 2;

  breakdown.total =
    breakdown.triage +
    breakdown.treatment +
    breakdown.tests +
    breakdown.fasterThanAI +
    breakdown.under30;

  return breakdown;
}

function computeAchievements(human, ai, breakdown) {
  const achievements = [];

  if (breakdown.total === 12) {
    achievements.push("🏅 Perfect Triage – Max score achieved");
  }
  if (human.timeSeconds <= 10) {
    achievements.push("⚡ Lightning Hands – Decision under 10 seconds");
  }
  if (human.timeSeconds < ai.aiTimeSeconds) {
    achievements.push("🤖 AI Slayer – Faster than the AI");
  }
  if (
    human.triage === ai.triage &&
    human.treatment === ai.treatment &&
    arraysEqualAsSets(human.tests, ai.tests)
  ) {
    achievements.push("🎯 Clinical Sharpshooter – Fully matched AI plan");
  }
  if (breakdown.triage === 5 && breakdown.treatment === 3 && breakdown.tests === 0) {
    achievements.push("🧪 Minimalist – Got triage & treatment right with extra tests");
  }

  if (achievements.length === 0) {
    achievements.push("🩺 Trainee Responder – Good effort! Try another case.");
  }

  return achievements;
}

function broadcastState() {
  io.emit("stateUpdate", {
    currentGame,
    leaderboard
  });
}

// ------------------- SOCKET LOGIC -------------------

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Send current state to new client
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
      patientNarrative: patient.narrative,
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

    const { triage, tests, treatment, treatmentSteps } = data;
    const patient = findPatient(currentGame.patientId);
    if (!patient) return;

    const now = Date.now();
    const humanTimeSeconds =
      (now - currentGame.triagePhaseStartedAt) / 1000;

    const humanDecision = {
      triage,
      tests: tests || [],
      treatment,
      treatmentSteps: treatmentSteps || {
        primary: "",
        secondary: "",
        disposition: ""
      },
      timeSeconds: humanTimeSeconds
    };

    const breakdown = scoreGame(
      humanDecision,
      patient.aiDecision,
      humanTimeSeconds
    );

    const achievements = computeAchievements(
      humanDecision,
      patient.aiDecision,
      breakdown
    );

    const result = {
      playerName: currentGame.playerName,
      mode: currentGame.mode,
      patientName: patient.name,
      patientNarrative: patient.narrative,
      human: humanDecision,
      ai: patient.aiDecision,
      scoreBreakdown: breakdown,
      points: breakdown.total,
      explanations: patient.explanations,
      achievements
    };

    currentGame.humanDecision = humanDecision;
    currentGame.result = result;

    leaderboard.push({
      playerName: currentGame.playerName,
      mode: currentGame.mode,
      points: breakdown.total,
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

// ------------------- START SERVER -------------------

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
