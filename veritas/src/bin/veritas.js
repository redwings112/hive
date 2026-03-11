import chalk from "chalk";
import { spawn } from "child_process";
import {
  logToVeritas,
  sendHeartbeat,
  reportFailure,
  analyzeCrash
} from "../firebase/node-protocol.js"; // you may update to use admin SDK functions if needed

// Admin SDK initialization
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from "./serviceAccountKey.json"; // path to your downloaded key
import { logToVeritas, sendHeartbeat, reportFailure, analyzeCrash } from "../firebase/node-protocol.js";

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app); // Use this db for your logging functions

// --- AGENT CONFIG ---
const BUILD_ID = "veritas_" + Date.now();
const APP_ID = process.env.VERITAS_APP_ID || "Veritas-Demo-Alpha";

let child;

const startSentinel = async () => {
  console.log(chalk.blue.bold("\n⚡ VERITAS_PROTOCOL // AGENT_ACTIVE"));
  console.log(`PROJECT: ${APP_ID} | BUILD: ${BUILD_ID}`);
  console.log("Launching Server...\n");

  // Launch your server
  child = spawn("npm", ["run", "dev"], { stdio: "inherit", shell: true });

  // Log build to Firestore using Admin SDK
  try {
    await db.collection("veritas_builds").add({
      buildId: BUILD_ID,
      status: "ACTIVE",
      notes: "Server boot initiated",
      appId: APP_ID,
      timestamp: new Date(),
    });
    console.log(chalk.green("✅ Build logged to Firestore (Admin SDK)"));
  } catch (err) {
    console.error(chalk.red("❌ Failed to log build:"), err);
  }

  // Heartbeat interval
  setInterval(async () => {
    try {
      await db.collection("veritas_status").doc(APP_ID).set(
        {
          current_build: BUILD_ID,
          status: "ACTIVE",
          last_pulse: new Date(),
          protocol_version: "v2.6"
        },
        { merge: true }
      );
      console.log(chalk.cyan("💓 Heartbeat sent"));
    } catch (err) {
      console.error(chalk.red("❌ Heartbeat failed:"), err);
    }
  }, 10000);

  // Handle server exit
  child.on("exit", async (code) => {
    if (code !== 0 && code !== null) {
      console.log(
        chalk.bgRed.white.bold("\n🚨 SERVER CRASHED // CONSULTING GEMINI...")
      );

      const aiSuggestion = await analyzeCrash(`Process exited with code ${code}`);

      // Report failure
      try {
        await db.collection("veritas_builds").add({
          buildId: BUILD_ID,
          status: "FAIL",
          notes: `Exit Code: ${code} | AI Suggestion: ${aiSuggestion}`,
          appId: APP_ID,
          timestamp: new Date(),
        });
        console.log(chalk.yellow("💡 AI Crash Suggestion:"), aiSuggestion);
      } catch (err) {
        console.error(chalk.red("❌ Failed to report failure:"), err);
      }

      // Restart sentinel after short delay
      setTimeout(startSentinel, 3000);
    }
  });
};

startSentinel();