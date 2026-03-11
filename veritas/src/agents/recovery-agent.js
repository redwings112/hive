import { GoogleGenerativeAI } from "@google/generative-ai";
import { logToVeritas } from "../firebase/node-protocol.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeAndRecover = async (errorLog, currentBuildId, previousBuildId) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    You are the Veritas Recovery Agent. 
    The application crashed with this error: "${errorLog}".
    Current Build: ${currentBuildId}.
    Last Known Stable Build: ${previousBuildId}.
    
    If this is a fatal code error, respond with "ACTION: ROLLBACK".
    If it's a minor environmental fluke, respond with "ACTION: RESTART".
    Provide a 10-word explanation.
  `;

  const result = await model.generateContent(prompt);
  const decision = result.response.text();

  if (decision.includes("ROLLBACK")) {
    console.log("🤖 Gemini: Fatal error detected. Initiating Rollback...");
    
    // Update Firestore to point back to the stable build
    await logToVeritas({
      buildId: previousBuildId,
      status: "ACTIVE",
      notes: `Gemini Rolled back from ${currentBuildId} due to crash.`
    });
    
    return previousBuildId;
  }
  
  return currentBuildId;
};