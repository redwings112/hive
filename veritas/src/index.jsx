// backend/index.js
import express from "express";
import cors from "cors";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, serverTimestamp } from "firebase-admin/firestore";
import serviceAccount from "./serviceAccountKey.json";

const app = express();
app.use(cors());
app.use(express.json());

const adminApp = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(adminApp);

const BUILD_COLLECTION = "veritas_builds";
const STATUS_COLLECTION = "veritas_status";

// Heal action
app.post("/api/veritas/heal", async (req, res) => {
  try {
    const { buildId } = req.body;

    // Add a FAIL entry (simulate recovery)
    await db.collection(BUILD_COLLECTION).add({
      buildId,
      status: "HEALING",
      notes: "Healing triggered by operator",
      timestamp: serverTimestamp(),
      appId: process.env.VITE_VERITAS_APP_ID || "Veritas-Demo-Alpha"
    });

    res.json({ success: true, action: "heal", buildId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Promote action
app.post("/api/veritas/promote", async (req, res) => {
  try {
    const { buildId } = req.body;

    // Update veritas_status to mark build as ACTIVE
    const statusRef = db.collection(STATUS_COLLECTION).doc(process.env.VITE_VERITAS_APP_ID || "Veritas-Demo-Alpha");
    await statusRef.set({
      current_build: buildId,
      status: "ACTIVE",
      last_pulse: serverTimestamp(),
      protocol_version: "v2.6"
    }, { merge: true });

    // Add ACTIVE entry in ledger
    await db.collection(BUILD_COLLECTION).add({
      buildId,
      status: "ACTIVE",
      notes: "Promoted by operator",
      timestamp: serverTimestamp(),
      appId: process.env.VITE_VERITAS_APP_ID || "Veritas-Demo-Alpha"
    });

    res.json({ success: true, action: "promote", buildId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Veritas backend running on port 3000"));