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

//
// -------------- MASS CASUALTY SCENARIOS (WITH HOSPITALS & NEW TESTS) --------------
//

const patients = [
  {
    id: 1,
    name: "Scenario 1 – Hajj Stampede (Red Triage)",
    narrative:
      "Patient: Male, 58. Location: Mina, during peak Hajj movement. Crushed in a stampede. Unconscious, pale, shallow breathing with severe bleeding from the lower abdomen and suspected pelvic fracture. High risk of shock due to major trauma and comorbidities (type 2 diabetes, hypertension, previous knee surgery).",
    vitals: {
      consciousness: "Unconscious",
      respiratoryRate: "34 / min",
      pulse: "142 bpm",
      bloodPressure: "78/45 mmHg",
      oxygenSaturation: "≈85% (low)"
    },
    aiDecision: {
      triage: "Red",
      // ER tests the AI expects for this patient
      tests: [
        "FAST ultrasound",
        "CT scan",
        "Intravenous fluids",
        "Blood typing and crossmatch",
        "Serum lactate"
      ],
      treatment: "Emergency Surgery",
      treatmentSteps: {
        primary: "Rapid IV fluids and oxygen",
        secondary: "Blood transfusion, pelvic stabilisation, analgesia",
        disposition: "Emergency operating theatre"
      },
      // AI hospital choice for comparison
      hospital: "Mina Emergency Hospital — Hajj Priority Centre",
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "Profound hypotension (78/45 mmHg), tachycardia (142 bpm), tachypnoea and unconsciousness after crush injury indicate severe haemorrhagic shock. Comorbid diabetes and hypertension further increase risk of poor perfusion → Red (Immediate) triage.",
      tests:
        "A focused assessment with sonography for trauma (FAST ultrasound) and CT scan are used to detect intra-abdominal and pelvic bleeding. Intravenous fluids, blood typing and crossmatch and serum lactate guide resuscitation, transfusion and operative planning.",
      treatment:
        "Immediate damage-control resuscitation with oxygen, rapid IV fluids and blood products, pelvic stabilisation and emergency surgery for suspected pelvic and intra-abdominal haemorrhage."
    }
  },
  {
    id: 2,
    name: "Scenario 2 – Riyadh Industrial Explosion (Yellow Triage)",
    narrative:
      "Patient: Male, 42. Location: Industrial zone near Riyadh after an explosion. Alert but disoriented with burns on the arms and face. Complains of chest tightness and dizziness. Suspected smoke or carbon monoxide exposure. Past history: smoker, mild asthma, allergic to penicillin.",
    vitals: {
      consciousness: "Alert but disoriented (GCS ≈ 13)",
      respiratoryRate: "26 / min",
      pulse: "110 bpm",
      bloodPressure: "100/70 mmHg",
      oxygenSaturation: "95%"
    },
    aiDecision: {
      triage: "Yellow",
      tests: [
        "Carboxyhaemoglobin level",
        "Plain X-ray",
        "Burn depth assessment",
        "Intravenous fluids"
      ],
      treatment: "Observation",
      treatmentSteps: {
        primary: "High-flow oxygen, burn dressing, analgesia",
        secondary: "Carboxyhaemoglobin level, ECG, chest X-ray",
        disposition: "Observation ward / burns unit"
      },
      hospital: "King Fahad Medical City — Level 1 Trauma Centre",
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "Burns and respiratory symptoms are concerning, but airway, blood pressure and oxygen saturation remain stable. He requires urgent care but not immediate life-saving intervention → Yellow (Urgent but delayed).",
      tests:
        "Carboxyhaemoglobin level assesses carbon monoxide poisoning. A plain chest X-ray evaluates inhalational injury and blast effects. Burn depth assessment defines the severity and surface area. Intravenous fluids support circulation and help manage burn-related fluid loss.",
      treatment:
        "Initial management focuses on high-flow oxygen for CO exposure, appropriate burn cooling and dressing, analgesia and continuous monitoring. Admission to an observation area or burns unit is recommended for serial respiratory and cardiovascular assessment."
    }
  },
  {
    id: 3,
    name: "Scenario 3 – Desert Rally Dehydration (Green Triage)",
    narrative:
      "Patient: Female, 27. Location: AlUla Desert Rally checkpoint. Alert and walking, complaining of dry mouth, fatigue and headache after prolonged heat exposure. Mild clinical signs of dehydration only. Past history: healthy, occasional migraines.",
    vitals: {
      consciousness: "Alert, walking",
      respiratoryRate: "18 / min",
      pulse: "92 bpm",
      bloodPressure: "118/78 mmHg",
      oxygenSaturation: "99%"
    },
    aiDecision: {
      triage: "Green",
      tests: [],
      treatment: "Hydration and rest",
      treatmentSteps: {
        primary: "Oral rehydration solution, shade and cooling",
        secondary: "Monitor symptoms; consider blood tests if no improvement",
        disposition: "Discharge from checkpoint with advice"
      },
      hospital: "AlUla Field Medical Base — Desert Response",
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "Mild dehydration and fatigue with normal vital signs and the ability to walk independently → Green (Minimal) triage.",
      tests:
        "Drone thermal imaging, skin-texture analysis and facial flush detection suggest mild heat stress and dehydration. No immediate laboratory testing is required; response to oral fluids is usually sufficient.",
      treatment:
        "Oral fluids, shade, cooling and short-term observation. She can be discharged from the checkpoint with instructions to seek help if symptoms worsen or fail to improve."
    }
  },
  {
    id: 4,
    name: "Scenario 4 – Highway Collision (Black Triage)",
    narrative:
      "Patient: Male, 35. Location: Eastern Province highway, multi-vehicle crash. No pulse or respiratory effort, fixed dilated pupils, massive head and chest trauma. No signs of life at the scene. Medical history unknown.",
    vitals: {
      consciousness: "Unresponsive, no response to pain",
      respiratoryRate: "No respiratory effort",
      pulse: "No palpable pulse",
      bloodPressure: "Undetectable",
      oxygenSaturation: "0% (no measurable signal)"
    },
    aiDecision: {
      triage: "Black",
      tests: [],
      treatment: "CPR / ACLS as appropriate",
      treatmentSteps: {
        primary: "Confirm absence of signs of life",
        secondary: "If local policy allows, brief CPR / ACLS attempt",
        disposition: "Expectant / deceased; document and prioritise other casualties"
      },
      hospital: "Dhahran Trauma Center — Highway Critical Care",
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "No pulse, no breathing, fixed pupils and catastrophic trauma indicate death at the scene. In a mass-casualty incident this patient is triaged as Black (Expectant/Deceased) so that resources can be directed to salvageable patients.",
      tests:
        "Drone thermal imaging and vital-sign sensors confirm the absence of cardiac activity and no heat signature. No further emergency investigations are required once death is confirmed.",
      treatment:
        "Local policy may allow a brief attempt at CPR/ACLS if there is any doubt, but priority quickly shifts to living casualties. The drone records the scene, helps confirm identity when possible and logs the time of death for documentation."
    }
  }
];

//
// -------------- GAME LOGIC (unchanged scoring + new hospital field) --------------
//

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
    achievements.push("🏅 Perfect Triage – Maximum score achieved on this scenario.");
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
    achievements.push("🎯 Clinical Sharpshooter – Matched AI triage, tests and treatment.");
  }
  if (achievements.length === 0) {
    achievements.push(
      "🩺 Trainee Responder – Good effort! Try another scenario to improve your score."
    );
  }

  return achievements;
}

function broadcastState() {
  io.emit("stateUpdate", { currentGame, leaderboard });
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  if (currentGame || leaderboard.length > 0) {
    socket.emit("stateUpdate", { currentGame, leaderboard });
  }

  socket.on("registerPlayer", (data) => {
    const { playerName, mode, patientId } = data;
    const patient = findPatient(patientId);

    if (!patient) {
      socket.emit("errorMessage", "Selected scenario not found.");
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

    const { triage, tests, treatment, treatmentSteps, hospital } = data;
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
      hospital: hospital || "",
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
