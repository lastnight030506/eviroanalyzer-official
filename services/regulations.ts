import { BaseDirectory, readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { QCVNStandard } from "../types";
import { STANDARDS } from "../constants";

const REGULATIONS_FILE = "regulations.json";

/**
 * Load regulations from the JSON file.
 * If the file doesn't exist, creates it with default regulations.
 * @returns Promise<QCVNStandard[]> Array of regulations
 */
export async function loadRegulations(): Promise<QCVNStandard[]> {
  try {
    const fileExists = await exists(REGULATIONS_FILE, {
      baseDir: BaseDirectory.AppData,
    });

    if (!fileExists) {
      // First run - create file with defaults
      await saveRegulations(STANDARDS);
      return STANDARDS;
    }

    const content = await readTextFile(REGULATIONS_FILE, {
      baseDir: BaseDirectory.AppData,
    });

    const regulations: QCVNStandard[] = JSON.parse(content);
    
    // Validate the loaded data
    if (!Array.isArray(regulations)) {
      console.error("Invalid regulations format: expected array");
      return STANDARDS;
    }

    return regulations;
  } catch (error) {
    console.error("Failed to load regulations:", error);
    return STANDARDS;
  }
}

/**
 * Save regulations to the JSON file.
 * @param regulations Array of regulations to save
 * @returns Promise<void>
 */
export async function saveRegulations(regulations: QCVNStandard[]): Promise<void> {
  try {
    const content = JSON.stringify(regulations, null, 2);
    await writeTextFile(REGULATIONS_FILE, content, {
      baseDir: BaseDirectory.AppData,
    });
  } catch (error) {
    console.error("Failed to save regulations:", error);
    throw error;
  }
}

/**
 * Reset regulations to default values.
 * @returns Promise<QCVNStandard[]> Default regulations
 */
export async function resetRegulations(): Promise<QCVNStandard[]> {
  await saveRegulations(STANDARDS);
  return STANDARDS;
}

/**
 * Add a new regulation.
 * @param regulations Current regulations array
 * @param newRegulation New regulation to add
 * @returns Promise<QCVNStandard[]> Updated regulations array
 */
export async function addRegulation(
  regulations: QCVNStandard[],
  newRegulation: QCVNStandard
): Promise<QCVNStandard[]> {
  const updated = [...regulations, newRegulation];
  await saveRegulations(updated);
  return updated;
}

/**
 * Update an existing regulation.
 * @param regulations Current regulations array
 * @param updatedRegulation Regulation with updated values
 * @returns Promise<QCVNStandard[]> Updated regulations array
 */
export async function updateRegulation(
  regulations: QCVNStandard[],
  updatedRegulation: QCVNStandard
): Promise<QCVNStandard[]> {
  const updated = regulations.map((reg) =>
    reg.id === updatedRegulation.id ? updatedRegulation : reg
  );
  await saveRegulations(updated);
  return updated;
}

/**
 * Delete a regulation by ID.
 * @param regulations Current regulations array
 * @param regulationId ID of regulation to delete
 * @returns Promise<QCVNStandard[]> Updated regulations array
 */
export async function deleteRegulation(
  regulations: QCVNStandard[],
  regulationId: string
): Promise<QCVNStandard[]> {
  const updated = regulations.filter((reg) => reg.id !== regulationId);
  await saveRegulations(updated);
  return updated;
}

/**
 * Export regulations to a JSON string for download.
 * @param regulations Regulations to export
 * @returns string JSON string
 */
export function exportRegulationsToJson(regulations: QCVNStandard[]): string {
  return JSON.stringify(regulations, null, 2);
}

/**
 * Import regulations from a JSON string.
 * @param jsonString JSON string to parse
 * @returns QCVNStandard[] Parsed regulations or null if invalid
 */
export function importRegulationsFromJson(jsonString: string): QCVNStandard[] | null {
  try {
    const regulations: QCVNStandard[] = JSON.parse(jsonString);
    
    // Basic validation
    if (!Array.isArray(regulations)) {
      return null;
    }

    // Validate each regulation has required fields
    for (const reg of regulations) {
      if (!reg.id || !reg.name || !reg.category || !Array.isArray(reg.parameters)) {
        return null;
      }
    }

    return regulations;
  } catch {
    return null;
  }
}
