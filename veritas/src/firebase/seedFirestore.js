import { initializeApp } from "firebase/app";
import { firebaseConfig } from "./firebase-config";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  Timestamp 
} from "firebase/firestore";
import { firebaseConfig } from "./firebase-config";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Seeds the Veritas Ledger with Production data.
 * Path: /artifacts/veritas-dashboard/public/data/veritas_builds/
 */
export async function createSampleBuild() {
  const appId = "veritas-dashboard";
  
  // Aligning with your specific Firestore path
  const buildsRef = collection(
    db, 
    `artifacts/${appId}/public/data/veritas_builds`
  );

  try {
    // 1. Create the ACTIVE stable build (The Baseline)
    await addDoc(buildsRef, {
      buildId: "build_2025_11_10_001",
      sourceCommit: "8f3a9c1baf72d904abc1d234f",
      status: "ACTIVE",
      // This creates the "10 November 2025" Timestamp format in Firestore
      timestamp: Timestamp.fromDate(new Date("2025-11-10T00:00:00Z")),
      deployedBy: "admin",
      notes: "Initial deployment to production"
    });

    // 2. Create a FAILED build (To test Veritas Self-Healing)
    await addDoc(buildsRef, {
      buildId: "build_2026_03_03_FAIL",
      sourceCommit: "deadbeef404",
      status: "FAIL",
      timestamp: Timestamp.now(), // Current time
      deployedBy: "automated-agent",
      notes: "CRITICAL: Runtime crash detected in production."
    });

    console.log("⚡ [UPLINK_SUCCESS] Production sectors seeded.");
    console.log("📡 Path: /artifacts/veritas-dashboard/public/data/veritas_builds");
  } catch (error) {
    console.error("❌ [UPLINK_FAIL] Error seeding Firestore:", error);
  }
}