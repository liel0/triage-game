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

// ------------------- PATIENT DATA (CLINICALLY REFINED) -------------------

const patients = [
  {
    id: 1,
    name: "Patient 1 – Crush Injury",
    narrative:
      "Male, 35-year-old pilgrim crushed beneath a metal barrier during crowd movement. Trapped for several minutes before rescue. Arrives pale, cool, and sweaty with suspected internal bleeding.",
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
        "Severe hypotension (80/50 mmHg), tachycardia, tachypnoea, and reduced consciousness after a crush mechanism are classic for haemorrhagic shock (ATLS ≥ class III). In mass-casualty triage this is an IMMEDIATE priority → Red.",
      tests:
        "IV access and fluid resuscitation are the first step. Oxygen treats hypoxia. Chest and limb X-rays help identify major fractures or thoracic injury contributing to blood loss.",
      treatment:
        "Unstable trauma with suspected ongoing bleeding requires rapid damage-control resuscitation and urgent surgical control of bleeding in the operating theatre."
    }
  },
  {
    id: 2,
    name: "Patient 2 – Blunt Chest Trauma (Stable)",
    narrative:
      "Female, 24-year-old involved in a low-speed vehicle collision. Walked to the triage area complaining of localised chest pain but no shortness of breath. No obvious external bleeding.",
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
        "Normal blood pressure, oxygen saturation and mental status with isolated chest pain suggests stable blunt trauma. She cannot be safely discharged immediately but does not need immediate life-saving intervention → Delayed (Yellow).",
      tests:
        "A chest X-ray is appropriate to exclude rib fractures, pneumothorax, or haemothorax. Routine labs and further imaging can be guided by clinical findings.",
      treatment:
        "Adequate analgesia, monitoring of pain and respiratory status, and short-term observation are usually sufficient for stable chest wall injury without red flags."
    }
  },
  {
    id: 3,
    name: "Patient 3 – Minor Ankle Injury",
    narrative:
      "Teenage pilgrim who twisted his ankle while descending stairs. Able to walk with a limp to the triage area. Localised ankle swelling and tenderness, no other injuries.",
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
        "He is ambulating independently with normal vital signs and an isolated limb injury. This fits the 'walking wounded' group → Minor (Green) in mass-casualty triage.",
      tests:
        "In many systems, simple sprains without bony tenderness or concerning features can be managed without immediate imaging, or with outpatient X-ray if needed.",
      treatment:
        "Standard management for uncomplicated ankle sprain is RICE plus oral analgesia, with discharge and clear instructions for follow-up or return if symptoms worsen."
    }
  },
  {
    id: 4,
    name: "Patient 4 – Cardiac Arrest / Collapse",
    narrative:
      "Male, 60-year-old collapsed suddenly near the tents. Found unresponsive, pulseless and not breathing normally (agonal gasps). Bystander CPR just started.",
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
        "In many mass-casualty settings, patients in cardiac arrest with no signs of life are triaged as expectant (Black) so that resources can be focused on salvageable casualties. Local protocols may allow CPR if resources permit.",
      tests:
        "During active arrest the priority is high-quality CPR and defibrillation when indicated; diagnostic tests do not improve outcomes at this stage.",
      treatment:
        "Follow basic life support and ACLS guidelines: continuous chest compressions, early defibrillation for shockable rhythms, airway support, and decide on termination based on response and local policy."
    }
  }
];

// ------------------- GAME STATE / SCORING / SOCKET LOGIC (unchanged from last version) -------------------

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

let currentGame = null;
let leaderboard = [];

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
    achievements.push("🏅 Perfect Triage – Maximum score achieved on this case.");
  }
  if (human.timeSeconds <= 10) {
    achievements.push("⚡ Lightning Hands – Completed triage in under 10 seconds.");
  }
  if (human.timeSeconds < ai.aiTimeSeconds) {
    achievements.push("🤖 AI Slayer – Human team was faster than the AI.");
  }
  if (
    human.triage === ai.triage &&
    human.treatment === ai.treatment &&
    arraysEqualAsSets(human.tests, ai.tests)
  ) {
    achievements.push("🎯 Clinical Sharpshooter – Fully matched the AI triage, tests, and treatment.");
  }
  if (achievements.length === 0) {
    achievements.push("🩺 Trainee Responder – Good effort! Try another case and see if you can improve.");
  }

  return achievements;
}

function broadcastState() {
  io.emit("stateUpdate", {
    currentGame,
    leaderboard
  });
}

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
