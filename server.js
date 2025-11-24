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
// ---------- MASTER DATA: HOSPITALS & TESTS ----------
//

const HOSPITALS = {
  mina: "Mina Emergency Hospital",
  kfmc: "King Fahad Medical City (Level 1 Trauma)",
  alula: "AlUla Field Medical Base",
  dhahran: "Dhahran Trauma Center"
};

const TESTS = {
  fast: "FAST ultrasound",
  lactate: "Serum lactate",
  crossmatch: "Blood typing and crossmatch",
  co: "Carboxyhaemoglobin level (CO)",
  xray: "Plain X-ray",
  burn: "Burn assessment",
  iv: "Intravenous (IV) fluids",
  ct: "CT scan"
};

//
// ---------- SCENARIOS (exact vitals / answers) ----------
//

const scenarios = [
  {
    id: 1,
    name: "Scenario 1 — Hajj Stampede (Red)",
    patientPhoto: "/images/scenario1.jpg", // put your image here
    shortLabel: "Hajj Stampede",
    vitals: {
      hr: "142 bpm",
      bp: "78/45 mmHg",
      rr: "34 / min",
      consciousness: "Unconscious",
      injury: "Severe abdominal bleeding, suspected pelvic fracture"
    },
    droneTestsText: [
      "Thermal imaging – detects major heat loss",
      "FAST scan module – shows internal bleeding",
      "Pallor detection – low perfusion",
      "Vital sensors – HR / RR / BP prediction",
      "Facial recognition – confirms unconsciousness"
    ],
    correct: {
      triage: "Red",
      hospitalId: "mina",
      testIds: ["fast", "lactate", "crossmatch"],
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "Profound hypotension, tachycardia, tachypnoea and unconsciousness after crush injury indicate severe haemorrhagic shock with pelvic and abdominal trauma. This is an Immediate (Red) case.",
      tests:
        "FAST ultrasound rapidly detects intra-abdominal bleeding. Serum lactate reflects tissue hypoperfusion. Blood typing and crossmatch prepare for urgent transfusion.",
      treatment:
        "Rapid haemorrhage control with FAST-guided decision making, blood resuscitation and pelvic / abdominal surgery at a facility with Hajj-capable emergency capacity."
    }
  },
  {
    id: 2,
    name: "Scenario 2 — Industrial Explosion (Yellow)",
    patientPhoto: "/images/scenario2.jpg",
    shortLabel: "Industrial Explosion",
    vitals: {
      hr: "110 bpm",
      bp: "100/70 mmHg",
      rr: "26 / min",
      consciousness: "Alert but confused",
      injury: "Burns, dizziness and chest tightness"
    },
    droneTestsText: [
      "Thermal burn mapping – burn surface and depth",
      "CO poisoning speech analysis – detects dysarthria",
      "Blister / burn depth detection",
      "Pain analysis – facial expression scoring",
      "GCS eye tracking – estimated GCS ≈ 13"
    ],
    correct: {
      triage: "Yellow",
      hospitalId: "kfmc",
      testIds: ["xray", "co", "burn"],
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "Burns and respiratory symptoms are concerning, but the airway, blood pressure and oxygen saturation remain stable. He requires urgent, not immediate, intervention → Yellow.",
      tests:
        "Chest X-ray evaluates blast and inhalation effects. Carboxyhaemoglobin confirms carbon monoxide exposure. Burn assessment defines depth and total burn surface area.",
      treatment:
        "High-flow oxygen, burn dressing, analgesia and close observation in a trauma-capable centre with burns experience."
    }
  },
  {
    id: 3,
    name: "Scenario 3 — Desert Rally (Green)",
    patientPhoto: "/images/scenario3.jpg",
    shortLabel: "Desert Rally",
    vitals: {
      hr: "92 bpm",
      bp: "118/78 mmHg",
      rr: "18 / min",
      consciousness: "Walking",
      injury: "Mild dehydration and heat stress"
    },
    droneTestsText: [
      "Thermal elevation – raised core temperature",
      "Skin dryness scan – reduced skin turgor",
      "Facial flush detection – mild heat stress",
      "Hydration assessment – mouth and eye moisture"
    ],
    // Using the exact combo you requested
    correct: {
      triage: "Green",
      hospitalId: "alula",
      testIds: ["xray", "iv", "fast"],
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "The patient is ambulatory with stable vital signs and only mild dehydration / heat stress → Green (minimal).",
      tests:
        "FAST ultrasound and X-ray are available if trauma or complications are suspected. Intravenous fluids are used if oral hydration is insufficient or symptoms progress.",
      treatment:
        "Cooling, hydration and short observation at the desert medical base, with escalation only if red-flag features appear."
    }
  },
  {
    id: 4,
    name: "Scenario 4 — Highway Collision (Black)",
    patientPhoto: "/images/scenario4.jpg",
    shortLabel: "Highway Collision",
    vitals: {
      hr: "No pulse",
      bp: "Undetectable",
      rr: "No breathing",
      consciousness: "Fixed pupils, unresponsive",
      injury: "Massive head and chest trauma"
    },
    droneTestsText: [
      "No thermal output – absent perfusion",
      "No HR / RR / BP detected",
      "GCS = 3 – deep coma",
      "No reflexes – no blink or pain response"
    ],
    correct: {
      triage: "Black",
      hospitalId: "dhahran",
      testIds: ["ct", "fast", "crossmatch"],
      aiTimeSeconds: 1.2
    },
    explanations: {
      triage:
        "No pulse, no breathing, fixed pupils and catastrophic multi-system trauma indicate non-survivability in a mass-casualty setting → Black (expectant / deceased).",
      tests:
        "If signs of life were present, CT and FAST would define injuries and crossmatch would prepare blood. In this scenario, the focus is documentation rather than intervention.",
      treatment:
        "Confirm death, document findings and redirect resources to salvageable patients while the drone records and tags the scene."
    }
  }
];

//
// ---------- VITAL ORDER (for sequential filling) ----------
//

const VITAL_ORDER = ["hr", "bp", "rr", "consciousness", "injury"];

//
// ---------- GAME STATE & HELPERS ----------
//

let currentGame = null;
let leaderboard = [];

function getScenario(id) {
  return scenarios.find(s => s.id === id);
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

function scoreGame(human, correct) {
  const breakdown = {
    triage: 0,
    hospital: 0,
    tests: 0,
    fasterThanAI: 0,
    total: 0
  };

  if (human.triage === correct.triage) breakdown.triage = 5;
  if (human.hospitalId === correct.hospitalId) breakdown.hospital = 3;
  if (arraysEqualAsSets(human.testIds, correct.testIds)) breakdown.tests = 3;
  if (human.timeSeconds < correct.aiTimeSeconds) breakdown.fasterThanAI = 1;

  breakdown.total =
    breakdown.triage +
    breakdown.hospital +
    breakdown.tests +
    breakdown.fasterThanAI;

  return breakdown;
}

function broadcastState() {
  io.emit("stateUpdate", {
    currentGame,
    leaderboard,
    scenarios: scenarios.map(s => ({
      id: s.id,
      name: s.name,
      shortLabel: s.shortLabel
    })),
    hospitals: HOSPITALS
  });
}

//
// ---------- SOCKET.IO FLOW ----------
//

io.on("connection", socket => {
  console.log("Client connected:", socket.id);

  broadcastState();

  // Start a new scenario / team from the big screen
  socket.on("registerPlayer", data => {
    const { playerName, mode, scenarioId } = data;
    const scenario = getScenario(scenarioId);
    if (!scenario) {
      socket.emit("errorMessage", "Scenario not found.");
      return;
    }

    currentGame = {
      id: Date.now(),
      playerName: playerName || "Guest Team",
      mode: mode || "Group",
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      patientPhoto: scenario.patientPhoto,
      droneTestsText: scenario.droneTestsText,
      vitalsScanned: [],      // which vital keys we’ve filled
      scannedQrValues: [],    // raw QR contents to block duplicates
      allVitalsCollected: false,
      triagePhaseStartedAt: null,
      humanDecision: null,
      result: null
    };

    io.emit("gameRegistered", currentGame);
    broadcastState();
  });

  // QR scan from mobile (accept ANY QR text)
  socket.on("scanVital", data => {
    if (!currentGame) {
      socket.emit(
        "errorMessage",
        "No active scenario. Ask staff to start a case on the main screen."
      );
      return;
    }

    const scenario = getScenario(currentGame.scenarioId);
    if (!scenario) return;

    const qrData = (data.qrData || "").trim();

    currentGame.vitalsScanned = currentGame.vitalsScanned || [];
    currentGame.scannedQrValues = currentGame.scannedQrValues || [];

    // prevent scanning the exact same QR twice
    if (qrData && currentGame.scannedQrValues.includes(qrData)) {
      socket.emit(
        "errorMessage",
        "This tag has already been scanned. Try another tag on the mannequin."
      );
      return;
    }
    if (qrData) currentGame.scannedQrValues.push(qrData);

    const alreadyCount = currentGame.vitalsScanned.length;
    const total = VITAL_ORDER.length;

    if (alreadyCount >= total) {
      socket.emit("errorMessage", "All vitals are already uploaded for this patient.");
      return;
    }

    // assign next vital in order
    const vitalKey = VITAL_ORDER[alreadyCount];

    if (!scenario.vitals[vitalKey]) {
      socket.emit(
        "errorMessage",
        "Scenario vitals are not configured correctly for this patient."
      );
      return;
    }

    currentGame.vitalsScanned.push(vitalKey);
    const count = currentGame.vitalsScanned.length;

    io.emit("vitalScanned", {
      vitalKey,
      vitalValue: scenario.vitals[vitalKey],
      count,
      total
    });

    // First vital triggers drone loading
    if (count === 1 && !currentGame.triagePhaseStartedAt) {
      io.emit("droneLoading", { scenarioId: scenario.id });
    }

    // All vitals collected -> unlock triage
    if (count === total && !currentGame.allVitalsCollected) {
      currentGame.allVitalsCollected = true;
      currentGame.triagePhaseStartedAt = Date.now();
      io.emit("allVitalsCollected", {
        triageTimerSeconds: 60
      });
    }

    broadcastState();
  });

  // Final human decision from big screen
  socket.on("submitHumanDecision", data => {
    if (!currentGame || !currentGame.allVitalsCollected) return;

    const scenario = getScenario(currentGame.scenarioId);
    if (!scenario) return;

    const now = Date.now();
    const humanTimeSeconds =
      (now - currentGame.triagePhaseStartedAt) / 1000;

    const humanDecision = {
      triage: data.triage,
      hospitalId: data.hospitalId,
      testIds: data.testIds || [],
      timeSeconds: humanTimeSeconds
    };

    const breakdown = scoreGame(humanDecision, scenario.correct);

    const result = {
      playerName: currentGame.playerName,
      mode: currentGame.mode,
      scenarioName: scenario.name,
      scenarioShort: scenario.shortLabel,
      human: {
        ...humanDecision,
        hospitalLabel: HOSPITALS[humanDecision.hospitalId] || "Not selected",
        testLabels: (humanDecision.testIds || []).map(id => TESTS[id])
      },
      ai: {
        triage: scenario.correct.triage,
        hospitalId: scenario.correct.hospitalId,
        hospitalLabel: HOSPITALS[scenario.correct.hospitalId],
        testIds: scenario.correct.testIds,
        testLabels: scenario.correct.testIds.map(id => TESTS[id]),
        aiTimeSeconds: scenario.correct.aiTimeSeconds
      },
      scoreBreakdown: breakdown,
      points: breakdown.total,
      explanations: scenario.explanations
    };

    currentGame.humanDecision = humanDecision;
    currentGame.result = result;

    leaderboard.push({
      playerName: currentGame.playerName,
      mode: currentGame.mode,
      points: breakdown.total,
      timeSeconds: humanTimeSeconds,
      scenarioShort: scenario.shortLabel
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
