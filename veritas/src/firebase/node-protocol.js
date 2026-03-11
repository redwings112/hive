import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* Resolve directory in ESM */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Load Firebase Service Account */
const servicePath = path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(servicePath)) {
  console.error("❌ serviceAccountKey.json missing in src/firebase/");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(servicePath, "utf8"));

/* Initialize Firebase Admin */
let app;

if (!getApps().length) {
  app = initializeApp({
    credential: cert(serviceAccount)
  });

  console.log("🔥 Firebase Admin Initialized");
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

/* -----------------------------
VERITAS LEDGER FUNCTIONS
----------------------------- */

/* Build Log */
export async function logToVeritas(data) {
  try {
    await db.collection("veritas_builds").doc(data.buildId).set({
      ...data,
      time: Timestamp.now()
    });

    console.log("📜 Build logged");
  } catch (err) {
    console.error("❌ LEDGER_ERROR:", err.message);
  }
}

/* Heartbeat */
export async function sendHeartbeat(buildId, appId) {
  try {
    await db.collection("veritas_status").doc(appId).set({
      buildId,
      status: "ACTIVE",
      lastPulse: Timestamp.now()
    });

    console.log("💓 Heartbeat sent");
  } catch (err) {
    console.error("❌ HEARTBEAT_ERROR:", err.message);
  }
}

/* Failure Reporter */
export async function reportFailure(buildId, logs) {
  try {
    await db.collection("veritas_builds").doc(buildId).update({
      status: "FAIL",
      logs,
      time: Timestamp.now()
    });

    console.log("🚨 Failure recorded");
  } catch (err) {
    console.error("❌ FAILURE_LOG_ERROR:", err.message);
  }
}

/* AI Crash Analyzer (Gemini placeholder) */
export async function analyzeCrash(error) {

  console.log("🤖 AI analyzing crash...");

  /* simple fallback suggestion */
  return `Investigate server logs. Crash detected: ${error}`;
}

export { db };