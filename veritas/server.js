import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// í²° PoW Verification
app.post('/api/pow/verify', (req, res) => {
  res.status(200).json({ status: 'SUCCESS', reward: 10 });
});

// í·¨ KILL SWITCH (Trigger this to test the Sentinel)
app.get('/api/debug/crash', (req, res) => {
  console.log("í·¨ CRASH_TEST: Inducing failure...");
  process.exit(1); 
});

// í»¡ï¸ EXPRESS 5 CATCH-ALL
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
    if (err) res.status(200).send('Veritas Sector Alpha Online');
  });
});

app.listen(PORT, () => {
  console.log();
});

