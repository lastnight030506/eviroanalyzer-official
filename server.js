import express from 'express';
import cors from 'cors';
import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Find Rscript executable
function findRscript() {
  // Try using where command on Windows
  try {
    const result = execSync('where Rscript', { encoding: 'utf8', shell: true });
    const lines = result.trim().split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && fs.existsSync(trimmed)) {
        return trimmed;
      }
    }
  } catch (e) {
    // where command failed
  }

  // Common Windows paths
  const possiblePaths = [
    'C:/Program Files/R/R-4.5.2/bin/Rscript.exe',
    'C:/Program Files/R/R-4.4.2/bin/Rscript.exe',
    'C:/Program Files/R/R-4.4.1/bin/Rscript.exe',
    'C:/Program Files/R/R-4.4.0/bin/Rscript.exe',
    'C:/Program Files/R/R-4.3.3/bin/Rscript.exe',
    'C:/Program Files/R/R-4.3.2/bin/Rscript.exe',
    'C:/Program Files/R/R-4.3.1/bin/Rscript.exe',
    'C:/Program Files/R/R-4.3.0/bin/Rscript.exe',
    'C:/Program Files/R/R-4.2.3/bin/Rscript.exe',
    'C:/Program Files/R/R-4.2.2/bin/Rscript.exe',
    'C:/Program Files/R/R-4.2.1/bin/Rscript.exe',
    'C:/Program Files/R/R-4.2.0/bin/Rscript.exe',
    'C:/Program Files/R/R-4.1.3/bin/Rscript.exe',
    'C:/Program Files/R/R-4.1.2/bin/Rscript.exe',
    'C:/Program Files/R/R-4.1.1/bin/Rscript.exe',
    'C:/Program Files/R/R-4.1.0/bin/Rscript.exe',
    'C:/Program Files (x86)/R/R-4.4.2/bin/Rscript.exe',
    'C:/Program Files (x86)/R/R-4.3.3/bin/Rscript.exe',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return 'Rscript'; // fallback to PATH
}

// Scripts directory - relative to project root
const SCRIPTS_DIR = path.join(__dirname, 'src-tauri', 'scripts');
const RSCRIPT_PATH = findRscript();

console.log(`Using Rscript at: ${RSCRIPT_PATH}`);

// Execute R script using execSync (simpler for Windows paths with spaces)
function executeRScript(scriptName, args) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);

  console.log(`Executing: Rscript ${scriptName}`);

  return new Promise((resolve) => {
    try {
      const cmd = `"${RSCRIPT_PATH}" --vanilla "${scriptPath}" ${args.join(' ')}`;
      const stdout = execSync(cmd, {
        cwd: SCRIPTS_DIR,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      });
      resolve({ success: true, output: stdout.trim(), error: null });
    } catch (err) {
      resolve({
        success: false,
        output: err.stdout?.trim() || '',
        error: err.stderr?.trim() || err.message
      });
    }
  });
}

// API endpoint
app.post('/api/rscript', async (req, res) => {
  const { scriptName, args = [] } = req.body;

  if (!scriptName) {
    return res.status(400).json({ error: 'scriptName is required' });
  }

  try {
    const result = await executeRScript(scriptName, args);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, output: '', error: error.message });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await executeRScript('health_check.R', []);
    if (result.success) {
      const data = JSON.parse(result.output);
      res.json(data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`R sidecar server running at http://localhost:${PORT}`);
  console.log(`Scripts directory: ${SCRIPTS_DIR}`);
});
