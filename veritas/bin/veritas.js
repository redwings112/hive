import { spawn } from 'child_process';
import chalk from 'chalk';
import 'dotenv/config';
import { reportFailure, sendHeartbeat, logToVeritas, analyzeCrash } from '../src/firebase/node-protocol.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const projectName = "Veritas-Demo-Alpha"; 
const BUILD_ID = `veritas_${Date.now()}`;

async function startSentinel() {
  console.clear();
  console.log(chalk.magentaBright.bold(`\n⚡ VERITAS_PROTOCOL // AGENT_ACTIVE`));
  console.log(chalk.cyan(`🛰️  PROJECT: ${projectName} | BUILD: ${BUILD_ID}`));

  // 1. Background Heartbeat (Doesn't block start)
  sendHeartbeat(BUILD_ID, projectName).catch(() => console.log(chalk.red("Ledger Sync Wait...")));

  // 2. Launch Server with inherit to see logs immediately
  console.log(chalk.grey(`🚀 Launching Server...`));

  const child = spawn('node', ['server.js'], {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  child.on('error', (err) => {
    console.log(chalk.red(`❌ CRITICAL_SPAWN_ERROR: ${err.message}`));
  });

  child.on('exit', async (code) => {
    if (code !== 0 && code !== null) {
      console.log(chalk.bgRed.white.bold('\n🚨 SERVER CRASHED // CONSULTING GEMINI... '));

      // --- AI Crash Analysis ---
      let aiSuggestion = "No suggestion available";
      try {
        aiSuggestion = await analyzeCrash(`Process exited with code ${code}`);
      } catch (err) {
        console.log(chalk.red("❌ AI analysis failed:", err.message));
      }

      // Log failure with AI suggestion
      await reportFailure(BUILD_ID, `Exit Code: ${code} | AI Suggestion: ${aiSuggestion}`);

      console.log(chalk.yellow(`💡 AI Crash Suggestion: ${aiSuggestion}`));

      // Restart after brief pause
      setTimeout(startSentinel, 3000);
    }
  });
}

if (process.argv[2] === 'start') {
  startSentinel();
} else {
  console.log(chalk.yellow(`Usage: node bin/veritas.js start`));
}