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
// -------------- MASS CASUALTY SCENARIOS --------------
//

const patients = [
  {
    id: 1,
    name: "Scenario 1 – Hajj Stampede (Red)",
    narrative:
      "Male, 58-year-old pilgrim in Mina during peak Hajj movement. Crushed in a stampede. Found unconscious, pale, with shallow breathing. There is severe bleeding from the lower abdomen and an unstable pelvis, raising strong suspicion of pelvic fracture and internal haemorrhage. Past history of type 2 diabetes and hypertension.",
    vitals: {
      consciousness: "Unconscious, no verbal response",
      respiratoryRate: "34 / min (shallow, laboured)",
      pulse: "142 bpm (weak, thready)",
      bloodPressure: "78/45 mmHg",
      oxygenSaturation: "86%"
    },
    aiDecision: {
      triage: "Red",
      tests: ["IV Fluids", "X-ray", "Oxygen"],
      treatment: "Emergency Surgery",
      treatmentSteps: {
        primary: "Rapid IV Fluids + Oxygen",
        secondary: "Blood transfusion, pelvic stabilisation, analgesia",
        disposition: "Emergency OR"
      },
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "Profound hypotension (78/45 mmHg), tachycardia (142 bpm), tachypnoea and unresponsiveness after a crush mechanism indicate severe haemorrhagic shock. Combined with comorbidities, this places him at very high risk of death → IMMEDIATE (Red) triage.",
      tests:
        "Drone thermal imaging and FAST-style ultrasound help localise internal bleeding and pelvic injury. The AI recommends rapid IV access with fluid resuscitation and oxygen. In the ED, FAST ultrasound, CBC, lactate and blood typing guide massive transfusion and operative planning.",
      treatment:
        "This patient requires damage-control resuscitation and emergency surgery for suspected pelvic and intra-abdominal bleeding. Pelvic stabilisation, massive transfusion protocol and airway management should be prepared before arrival."
    }
  },
  {
    id: 2,
    name: "Scenario 2 – Riyadh Industrial Explosion (Yellow)",
    narrative:
      "Male, 42-year-old worker in an industrial zone near Riyadh. Exposed to an explosion with burns to the arms and face. He is alert but disoriented, complaining of chest tightness and dizziness. There is concern for inhalational injury and carbon monoxide exposure. History of smoking, mild asthma and penicillin allergy.",
    vitals: {
      consciousness: "Alert but disoriented (GCS ≈ 13)",
      respiratoryRate: "26 / min",
      pulse: "110 bpm",
      bloodPressure: "100/70 mmHg",
      oxygenSaturation: "95%"
    },
    aiDecision: {
      triage: "Yellow",
      tests: ["Oxygen", "X-ray", "CT Scan"],
      treatment: "Observation",
      treatmentSteps: {
        primary: "High-flow oxygen, burn dressing, analgesia",
        secondary: "Carboxyhaemoglobin level, ECG, chest X-ray",
        disposition: "Observation ward / burns unit"
      },
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "He has significant burns and respiratory symptoms but maintains blood pressure, oxygen saturation and airway. He is unwell but not in immediate extremis → Urgent but Delayed (Yellow).",
      tests:
        "The drone uses thermal and skin-texture imaging to estimate burn depth and facial analysis to estimate pain and GCS. AI recommends high-flow oxygen for possible CO poisoning, followed by carboxyhaemoglobin level, chest X-ray and ECG in the ED to assess inhalational injury and cardiac stress.",
      treatment:
        "Initial management focuses on oxygen therapy, cooling and dressing the burns, analgesia and close monitoring. Depending on burn extent and gas exposure, he should be admitted for observation or to a burns unit for serial assessment."
    }
  },
  {
    id: 3,
    name: "Scenario 3 – AlUla Desert Rally Dehydration (Green)",
    narrative:
      "Female, 27-year-old rally participant at an AlUla desert checkpoint. Complains of dry mouth, fatigue and headache after prolonged heat exposure. She is walking independently with mild clinical signs of dehydration but no red-flag features. Past history: otherwise healthy, occasional migraines.",
    vitals: {
      consciousness: "Alert, walking without assistance",
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
        secondary: "Monitor symptoms; consider electrolytes if no improvement",
        disposition: "Discharge from checkpoint with advice"
      },
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "She is haemodynamically stable with normal vital signs and is able to walk. Symptoms are consistent with mild dehydration and heat stress without systemic compromise → Minimal (Green).",
      tests:
        "The drone uses thermal imaging and facial/skin analysis to suggest mild heat stress and dehydration. In this scenario, laboratory tests are usually unnecessary; simple clinical reassessment after fluids is sufficient.",
      treatment:
        "Oral hydration, rest in a shaded cool area and monitoring are appropriate. She can be discharged from the checkpoint with clear advice to return if symptoms worsen or fail to improve."
    }
  },
  {
    id: 4,
    name: "Scenario 4 – Highway Collision (Black)",
    narrative:
      "Male, 35-year-old driver involved in a high-speed multi-vehicle collision on an Eastern Province highway. On drone and paramedic arrival he has severe head and chest trauma, no signs of life and no spontaneous movement.",
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
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "No pulse, no breathing, fixed pupils and catastrophic trauma are compatible with death at the scene. In mass-casualty conditions this patient is triaged as Black (expectant/deceased) so that resources can be directed to salvageable patients.",
      tests:
        "Drone thermal imaging and vital-sign sensors confirm absence of cardiac activity and heat signature. No further diagnostic testing is indicated once death is confirmed.",
      treatment:
        "Local policy may allow a brief attempt at CPR/ACLS if there is any doubt, but priority should rapidly shift to living casualties. The drone records the scene, confirms identity when possible and logs time of death for documentation."
    }
  }
];

//
// -------------- GAME LOGIC (unchanged) --------------
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
    achievements.push("🎯 Clinical Sharpshooter – Matched AI triage, tests and treatment plan.");
  }
  if (achievements.length === 0) {
    achievements.push("🩺 Trainee Responder – Good effort! Try another scenario to improve your score.");
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
