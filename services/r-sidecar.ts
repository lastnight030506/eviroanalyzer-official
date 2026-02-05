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

/**
 * Execute an R script via Tauri sidecar.
 * @param scriptName Name of the R script (e.g., "health_check.R")
 * @param args Arguments to pass to the script
 * @returns Parsed JSON result from R script
 */
export async function runRScript<T>(
  scriptName: string,
  args: string[] = []
): Promise<T> {
  const result = await invoke<RScriptResult>("run_r_script", {
    scriptName,
    args,
  });

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
  const result = await invoke<RScriptResult>("run_r_script", {
    scriptName,
    args,
  });

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
