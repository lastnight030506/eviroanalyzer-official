import { invoke } from "@tauri-apps/api/core";

interface RScriptResult {
  success: boolean;
  output: string;
  error: string | null;
}

interface RHealthResponse {
  status: string;
  r_version: string;
  timestamp: string;
  message: string;
  packages?: Record<string, string>;
}

// Detect if we're running in Tauri context
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// API server URL for localhost development
const API_BASE = 'http://localhost:3001';

/**
 * Execute R script via Tauri (desktop) or localhost server (browser)
 */
async function executeRScriptBackend(scriptName: string, args: string[]): Promise<RScriptResult> {
  if (isTauri) {
    // Use Tauri invoke for desktop app
    return invoke<RScriptResult>("run_r_script", { scriptName, args });
  } else {
    // Use localhost API for browser dev
    const response = await fetch(`${API_BASE}/api/rscript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptName, args })
    });
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    return response.json();
  }
}

/**
 * Execute an R script via Tauri sidecar or localhost server.
 * @param scriptName Name of the R script (e.g., "health_check.R")
 * @param args Arguments to pass to the script
 * @returns Parsed JSON result from R script
 */
export async function runRScript<T>(
  scriptName: string,
  args: string[] = []
): Promise<T> {
  const result = await executeRScriptBackend(scriptName, args);

  if (!result.success) {
    throw new Error(result.error || "R script execution failed");
  }

  try {
    return JSON.parse(result.output) as T;
  } catch {
    throw new Error(`Failed to parse R output: ${result.output}`);
  }
}

/**
 * Execute an R script and return raw output (non-JSON).
 * @param scriptName Name of the R script
 * @param args Arguments to pass to the script
 * @returns Raw stdout from R script
 */
export async function runRScriptRaw(
  scriptName: string,
  args: string[] = []
): Promise<string> {
  const result = await executeRScriptBackend(scriptName, args);

  if (!result.success) {
    throw new Error(result.error || "R script execution failed");
  }

  return result.output;
}

/**
 * Check if R sidecar is operational.
 * @returns Health check response from R
 */
export async function checkRHealth(): Promise<RHealthResponse> {
  if (!isTauri) {
    // Use localhost API for browser dev
    const response = await fetch(`${API_BASE}/api/health`);
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    return response.json();
  }
  return runRScript<RHealthResponse>("health_check.R");
}

/**
 * Check if R is available on the system.
 * @returns true if R is installed and accessible
 */
export async function isRAvailable(): Promise<boolean> {
  try {
    await checkRHealth();
    return true;
  } catch {
    return false;
  }
}
