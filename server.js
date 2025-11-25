// server.js
// Express backend for AI Triage Drone 2040 booth

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "Public")));

/**
 * Scenario configuration (static clinical logic)
 */
const scenariosConfig = {
  s1: {
    id: "s1",
    label: "Scenario 1 — Hajj Stampede (Red)",
    ai: {
      triage: "red",
      hospital: "mina",
      tests: ["fast", "lactate", "crossmatch"],
      aiTimeSeconds: 1.2,
    },
    bodyParts: {
      head: {
        label: "Head",
        vitalLabel: "Consciousness",
        vitalValue: "Unconscious",
        droneText: "Facial analysis active – assessing consciousness & pallor",
      },
      chest: {
        label: "Chest",
        vitalLabel: "Respiratory rate (RR)",
        vitalValue: "34 / min",
        droneText: "Respiratory module active – measuring RR",
      },
      abdomen: {
        label: "Abdomen",
        vitalLabel: "Heart rate (HR)",
        vitalValue: "142 bpm",
        droneText: "FAST ultrasound active – looking for bleeding",
      },
      arms: {
        label: "Arms",
        vitalLabel: "Blood pressure (BP)",
        vitalValue: "78/45 mmHg",
        droneText:
          "Circulatory sensors active – blood pressure and peripheral perfusion",
      },
      legs: {
        label: "Legs",
        vitalLabel: "Key injury / problem",
        vitalValue:
          "Severe abdominal bleeding and suspected pelvic fracture",
        droneText: "Injury map active – classifying key trauma",
      },
    },
  },
  s2: {
    id: "s2",
    label: "Scenario 2 — Industrial Explosion (Yellow)",
    ai: {
      triage: "yellow",
      hospital: "kfmc",
      tests: ["xray", "co", "burn"],
      aiTimeSeconds: 1.3,
    },
    bodyParts: {
      head: {
        label: "Head",
        vitalLabel: "Consciousness",
        vitalValue: "Alert but confused",
        droneText: "Facial expression and GCS analysis – confusion detected",
      },
      chest: {
        label: "Chest",
        vitalLabel: "Respiratory rate (RR)",
        vitalValue: "26 / min",
        droneText: "Respiratory pattern and chest movement monitoring",
      },
      abdomen: {
        label: "Abdomen",
        vitalLabel: "Heart rate (HR)",
        vitalValue: "110 bpm",
        droneText: "Cardiac strain estimation from motion and colour changes",
      },
      arms: {
        label: "Arms / Face",
        vitalLabel: "Burn severity",
        vitalValue: "Partial-thickness burns to arms and face",
        droneText:
          "Thermal mapping and blister depth assessment for burn severity",
      },
      legs: {
        label: "Legs / Systemic",
        vitalLabel: "Key problem",
        vitalValue: "Possible CO exposure with chest tightness and dizziness",
        droneText: "Speech and perfusion analysis for CO poisoning",
      },
    },
  },
  s3: {
    id: "s3",
    label: "Scenario 3 — Desert Rally (Green)",
    ai: {
      triage: "green",
      hospital: "alula",
      tests: ["xray", "iv", "fast"],
      aiTimeSeconds: 1.1,
    },
    bodyParts: {
      head: {
        label: "Head",
        vitalLabel: "Consciousness",
        vitalValue: "Alert and walking",
        droneText: "Facial tracking – normal consciousness and orientation",
      },
      chest: {
        label: "Chest",
        vitalLabel: "Respiratory rate (RR)",
        vitalValue: "18 / min",
        droneText: "Breathing pattern – normal effort",
      },
      abdomen: {
        label: "Abdomen",
        vitalLabel: "Heart rate (HR)",
        vitalValue: "92 bpm",
        droneText: "Mild tachycardia – likely due to heat and dehydration",
      },
      arms: {
        label: "Arms / Skin",
        vitalLabel: "Hydration status",
        vitalValue: "Dry mucosa and mildly reduced skin turgor",
        droneText:
          "Skin texture and colour analysis – mild dehydration and heat stress",
      },
      legs: {
        label: "Legs / Overall",
        vitalLabel: "Key problem",
        vitalValue: "Heat fatigue and mild dehydration",
        droneText:
          "Movement and posture analysis – still mobile, low-risk injuries",
      },
    },
  },
  s4: {
    id: "s4",
    label: "Scenario 4 — Highway Collision (Black)",
    ai: {
      triage: "black",
      hospital: "dhahran",
      tests: ["ct", "fast", "crossmatch"],
      aiTimeSeconds: 1.0,
    },
    bodyParts: {
      head: {
        label: "Head",
        vitalLabel: "Consciousness",
        vitalValue: "Unresponsive, fixed and dilated pupils",
        droneText: "No blink reflex – severe head trauma",
      },
      chest: {
        label: "Chest",
        vitalLabel: "Respiratory status",
        vitalValue: "No spontaneous respirations",
        droneText: "Chest wall motion absent – apnoea",
      },
      abdomen: {
        label: "Abdomen",
        vitalLabel: "Circulation",
        vitalValue: "No palpable pulse",
        droneText:
          "No perfusion signal – cardiac arrest and profound shock",
      },
      arms: {
        label: "Arms",
        vitalLabel: "GCS",
        vitalValue: "GCS 3 (deep coma)",
        droneText: "No purposeful movement or response to pain",
      },
      legs: {
        label: "Legs / Overall",
        vitalLabel: "Key problem",
        vitalValue:
          "Multiple life-incompatible injuries – expectant / deceased",
        droneText: "Overall trauma burden consistent with non-survivable injury",
      },
    },
  },
};

/**
 * In-memory game state
 */
let gameState = {
  currentScenarioId: "s1",
  operatorName: "Visitor",
  operatorMode: "solo", // 'solo' or 'group'
  scans: {
    head: null,
    chest: null,
    abdomen: null,
    arms: null,
    legs: null,
  },
  timerStartedAt: null,
  timerStoppedAt: null,
  lastResult: null,
  leaderboard: [],
};

function resetScans() {
  gameState.scans = {
    head: null,
    chest: null,
    abdomen: null,
    arms: null,
    legs: null,
  };
  gameState.timerStartedAt = null;
  gameState.timerStoppedAt = null;
  gameState.lastResult = null;
}

/**
 * Helper: parse QR payload to scenario + body part + image URL
 * Expects filenames such as: s1_head.jpg, s1_chest.png, etc.
 */
function parseScanPayload(payload) {
  if (typeof payload !== "string") return null;
  const lower = payload.toLowerCase();

  const partMatch = /(head|chest|abdomen|arms?|legs?)/.exec(lower);
  if (!partMatch) return null;

  let part = partMatch[1];
  if (part.startsWith("arm")) part = "arms";
  if (part.startsWith("leg")) part = "legs";

  const scenMatch = /s([1-4])_/.exec(lower);
  const scenarioId = scenMatch ? `s${scenMatch[1]}` : gameState.currentScenarioId;

  return {
    scenarioId,
    part,
    imageUrl: payload,
  };
}

/**
 * API ROUTES
 */

// Get full state for the big screen
app.get("/api/state", (req, res) => {
  res.json({
    scenarios: scenariosConfig,
    gameState,
  });
});

// Change scenario from the big screen dropdown
app.post("/api/scenario", (req, res) => {
  const { scenarioId } = req.body;
  if (!scenarioId || !scenariosConfig[scenarioId]) {
    return res.status(400).json({ error: "Invalid scenario" });
  }
  gameState.currentScenarioId = scenarioId;
  resetScans();
  res.json({ ok: true });
});

// Set operator details from mobile (name + mode)
app.post("/api/operator", (req, res) => {
  const { name, mode } = req.body;
  if (name && typeof name === "string") {
    gameState.operatorName = name.trim().slice(0, 40) || "Visitor";
  }
  if (mode === "solo" || mode === "group") {
    gameState.operatorMode = mode;
  }
  res.json({ ok: true, operatorName: gameState.operatorName, operatorMode: gameState.operatorMode });
});

// QR scan from mobile
app.post("/api/scan", (req, res) => {
  const { payload } = req.body;
  const parsed = parseScanPayload(payload);

  if (!parsed) {
    return res.json({
      ok: false,
      message:
        "Tag received but not recognised. Make sure this tag filename includes head, chest, abdomen, arms or legs.",
    });
  }

  // Enforce scenario (if QR mentions a different scenario, we still respect the
  // currently selected one on the big screen)
  const { part, imageUrl } = parsed;
  const scenarioId = gameState.currentScenarioId;

  if (!scenariosConfig[scenarioId].bodyParts[part]) {
    return res.json({ ok: false, message: "Body part not valid for this scenario." });
  }

  const already = gameState.scans[part];
  gameState.scans[part] = {
    imageUrl,
    scannedAt: Date.now(),
  };

  // Start timer on first scan
  const totalScanned = Object.values(gameState.scans).filter(Boolean).length;
  if (!gameState.timerStartedAt) {
    gameState.timerStartedAt = Date.now();
  }
  if (totalScanned === 5 && !gameState.timerStoppedAt) {
    // vitals complete, but we still measure final decision time separately
  }

  res.json({
    ok: true,
    scenarioId,
    part,
    imageUrl,
    totalScanned,
    message: already
      ? `${scenariosConfig[scenarioId].bodyParts[part].label} tag updated. (${totalScanned}/5 vitals)`
      : `${scenariosConfig[scenarioId].bodyParts[part].label} tag received. (${totalScanned}/5 vitals)`,
  });
});

// Submit human decision
app.post("/api/decision", (req, res) => {
  const { triage, hospital, tests, elapsedSeconds } = req.body;
  const scenario = scenariosConfig[gameState.currentScenarioId];

  const selectedTests = Array.isArray(tests) ? tests : [];

  // scoring
  let score = 0;
  const details = {
    triageCorrect: false,
    hospitalCorrect: false,
    testsCorrect: false,
    fasterThanAI: false,
  };

  if (triage === scenario.ai.triage) {
    score += 5;
    details.triageCorrect = true;
  }

  if (hospital === scenario.ai.hospital) {
    score += 3;
    details.hospitalCorrect = true;
  }

  const required = new Set(scenario.ai.tests);
  const humanSet = new Set(selectedTests);
  const extra = [...humanSet].filter((t) => !required.has(t));
  const missing = [...required].filter((t) => !humanSet.has(t));

  if (extra.length === 0 && missing.length === 0) {
    score += 3;
    details.testsCorrect = true;
  }

  const humanTime = typeof elapsedSeconds === "number" ? elapsedSeconds : null;
  if (humanTime !== null && humanTime <= scenario.ai.aiTimeSeconds) {
    score += 1;
    details.fasterThanAI = true;
  }

  gameState.timerStoppedAt = Date.now();
  const result = {
    scenarioId: scenario.id,
    triage,
    hospital,
    tests: selectedTests,
    score,
    details,
    humanTime,
    aiTime: scenario.ai.aiTimeSeconds,
    operatorName: gameState.operatorName,
    operatorMode: gameState.operatorMode,
    finishedAt: new Date().toISOString(),
  };
  gameState.lastResult = result;

  gameState.leaderboard.push({
    name: gameState.operatorName + (gameState.operatorMode === "group" ? " (Group)" : " (Solo)"),
    scenario: scenario.label,
    score,
    time: humanTime,
  });

  // keep only top 20
  gameState.leaderboard = gameState.leaderboard
    .sort((a, b) => b.score - a.score || a.time - b.time)
    .slice(0, 20);

  res.json({ ok: true, result, leaderboard: gameState.leaderboard });
});

// Reset current simulation (but keep leaderboard)
app.post("/api/reset", (req, res) => {
  resetScans();
  res.json({ ok: true });
});

// Reset leaderboard
app.post("/api/reset-leaderboard", (req, res) => {
  gameState.leaderboard = [];
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
