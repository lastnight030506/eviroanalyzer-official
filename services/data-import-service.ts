import { runRScript } from './r-sidecar';
import type {
  DataLoadResult,
  CleaningConfig,
  CleaningResult,
  VariableMapping,
  MappingConfig,
  MappingResult,
  QCVNParameterRef,
  RawDataRow,
} from '../types/statistics';
import type { SampleRow, QCVNStandard } from '../types';
import { STANDARDS } from '../constants';

/**
 * QCVN Aliases for fuzzy matching
 */
const QCVN_ALIASES: Record<string, string[]> = {
  'ph': ['pH', 'ph', 'Ph', 'pH_value', 'ph_value', 'pH_value'],
  'bod5': ['BOD5', 'BOD_5', 'BOD', 'bod', 'BOD5_test', 'BOD_5_test'],
  'cod': ['COD', 'cod', 'COD_test', 'Chemical_Oxygen_Demand'],
  'tss': ['TSS', 'tss', 'Total_Suspended_Solids', 'Suspended_Solids', 'Total_SS'],
  'do': ['DO', 'do', 'Dissolved_Oxygen', 'DO_mgL', 'DO_mgl'],
  'nh4': ['NH4', 'nh4', 'Ammonium', 'NH4+', 'Ammonia_Nitrogen', 'NH4_N'],
  'cl': ['Cl', 'cl', 'Chloride', 'Cl-', 'Chloride_mgL', 'Cl_mgL'],
  'f': ['F', 'f', 'Fluoride', 'F-', 'Fluor', 'F_mgL'],
  'no2': ['NO2', 'no2', 'Nitrite', 'NO2-', 'Nitrite_N', 'NO2_N'],
  'no3': ['NO3', 'no3', 'Nitrate', 'NO3-', 'Nitrate_N', 'NO3_N'],
  'po4': ['PO4', 'po4', 'Phosphate', 'PO4-3', 'Phosphorus', 'PO4_P'],
  'so2': ['SO2', 'so2', 'Sulfur_Dioxide', 'Sulphur_Dioxide'],
  'no': ['NO', 'no', 'Nitric_Oxide'],
  'co': ['CO', 'co', 'Carbon_Monoxide'],
  'tsp': ['TSP', 'tsp', 'Total_Suspended_Particulate'],
  'pm10': ['PM10', 'pm10', 'PM_10'],
  'pm25': ['PM2.5', 'pm25', 'PM_25', 'PM2_5'],
  'pb': ['Pb', 'pb', 'Lead', 'Lead_Pb'],
};

/**
 * Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity between two strings (0 to 1).
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

/**
 * Load data from a file (CSV, Excel, or SPSS).
 * @param filePath - Path to the data file
 * @param fileType - Type of file: 'csv', 'excel', or 'sav'
 * @returns DataLoadResult with full data array
 */
export async function loadDataFull(
  filePath: string,
  fileType: 'csv' | 'excel' | 'sav'
): Promise<DataLoadResult> {
  const jsonInput = JSON.stringify({
    file_path: filePath,
    file_type: fileType,
    return_data: true,
  });
  return runRScript<DataLoadResult>('read_data.R', [jsonInput]);
}

/**
 * Clean data using R-based operations.
 * @param config - Cleaning configuration with operations array
 * @returns CleaningResult with cleaning statistics
 */
export async function cleanData(config: CleaningConfig): Promise<CleaningResult> {
  const jsonInput = JSON.stringify({
    session_id: config.session_id,
    operations: config.operations,
  });
  return runRScript<CleaningResult>('clean_data.R', [jsonInput]);
}

/**
 * Map imported variables to QCVN parameters and transform to SampleRow[].
 * @param config - Mapping configuration with variable mappings and QCVN params
 * @returns MappingResult with sample rows ready for compliance assessment
 */
export async function mapToSampleRows(config: MappingConfig): Promise<MappingResult> {
  // Pass full config as JSON to map_data.R
  const jsonInput = JSON.stringify({
    session_id: config.session_id,
    mappings: config.mappings,
    sample_prefix: config.sample_prefix,
    qcvn_params: config.qcvn_params,
    data: (config as any).data,  // optional direct data
    columns: (config as any).columns
  });
  return runRScript<MappingResult>('map_data.R', [jsonInput]);
}

/**
 * Auto-map imported variable names to QCVN parameters using fuzzy matching.
 * @param importedVariables - List of variable names from imported data
 * @param qcvnParams - List of QCVN parameter references to match against
 * @returns VariableMapping[] with confidence scores and auto-detected QCVN param
 */
export function autoMapVariables(
  importedVariables: string[],
  qcvnParams: QCVNParameterRef[]
): VariableMapping[] {
  const mappings: VariableMapping[] = [];

  for (const importedVar of importedVariables) {
    let bestMatch: { param: QCVNParameterRef; score: number } | null = null;

    for (const param of qcvnParams) {
      // Check direct parameter ID match
      const paramIdScore = similarity(importedVar, param.id);
      if (paramIdScore === 1) {
        bestMatch = { param, score: 1 };
        break;
      }

      // Check parameter name match
      const nameScore = similarity(importedVar, param.name);
      if (nameScore > (bestMatch?.score ?? 0)) {
        bestMatch = { param, score: nameScore };
      }

      // Check aliases match
      const aliases = QCVN_ALIASES[param.id] || [];
      for (const alias of aliases) {
        const aliasScore = similarity(importedVar, alias);
        if (aliasScore > (bestMatch?.score ?? 0)) {
          bestMatch = { param, score: aliasScore };
        }
      }

      // Check against additional provided aliases
      if (param.aliases) {
        for (const alias of param.aliases) {
          const aliasScore = similarity(importedVar, alias);
          if (aliasScore > (bestMatch?.score ?? 0)) {
            bestMatch = { param, score: aliasScore };
          }
        }
      }
    }

    // Threshold for auto-mapping: 0.6 similarity score
    const threshold = 0.6;
    if (bestMatch && bestMatch.score >= threshold) {
      mappings.push({
        imported_var: importedVar,
        qcvn_param: bestMatch.param.id,
        confidence: bestMatch.score,
        is_manual: false,
      });
    } else {
      mappings.push({
        imported_var: importedVar,
        qcvn_param: null,
        confidence: 0,
        is_manual: false,
      });
    }
  }

  return mappings;
}

/**
 * Convert QCVNStandard.parameters to QCVNParameterRef[] with aliases.
 * @param standard - QCVN standard to convert
 * @returns QCVNParameterRef[] with all parameter references
 */
export function getQCVNParameterRefs(standard: QCVNStandard): QCVNParameterRef[] {
  return standard.parameters.map((param) => ({
    id: param.id,
    name: param.name,
    unit: param.unit,
    limit: param.limit,
    type: param.type,
    aliases: QCVN_ALIASES[param.id] || [],
  }));
}
