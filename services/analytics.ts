import { runRScript, runRScriptRaw } from './r-sidecar';

// Types for forecasting
export interface ForecastInput {
  values: number[];
  periods: number;
  parameter: string;
  dates?: string[];
  confidence?: number;
}

export interface ARIMAResult {
  success: boolean;
  error?: string;
  parameter: string;
  model: string;
  aic: number;
  bic: number;
  historical: number[];
  fitted: number[];
  residuals: number[];
  forecast: {
    periods: number;
    mean: number[];
    lower: number[];
    upper: number[];
  };
  accuracy: {
    mae: number;
    rmse: number;
    mape: number;
  };
}

export interface ProphetResult {
  success: boolean;
  error?: string;
  parameter: string;
  model: string;
  historical: number[];
  fitted: number[];
  forecast: {
    periods: number;
    dates: string[];
    mean: number[];
    lower: number[];
    upper: number[];
    trend: number[];
  };
}

/**
 * Run ARIMA time series forecasting via R sidecar.
 */
export async function forecastARIMA(input: ForecastInput): Promise<ARIMAResult> {
  const jsonInput = JSON.stringify(input);
  return runRScript<ARIMAResult>('forecast_arima.R', [jsonInput]);
}

/**
 * Run Prophet time series forecasting via R sidecar.
 */
export async function forecastProphet(input: ForecastInput): Promise<ProphetResult> {
  const jsonInput = JSON.stringify(input);
  return runRScript<ProphetResult>('forecast_prophet.R', [jsonInput]);
}

// Types for GIS/Kriging
export interface KrigingPoint {
  lat: number;
  lng: number;
  value: number;
}

export interface KrigingInput {
  points: KrigingPoint[];
  grid_size?: number;
  parameter?: string;
}

export interface KrigingGridPoint {
  lat: number;
  lng: number;
  value: number;
  variance: number;
}

export interface KrigingResult {
  success: boolean;
  error?: string;
  parameter: string;
  grid_size: number;
  bounds: {
    lng_min: number;
    lng_max: number;
    lat_min: number;
    lat_max: number;
  };
  variogram: {
    model: string;
    nugget: number;
    sill: number;
    range: number;
  };
  statistics: {
    min: number;
    max: number;
    mean: number;
    sd: number;
  };
  sample_points: number;
  grid_points: number;
  grid: KrigingGridPoint[];
}

/**
 * Run Kriging spatial interpolation via R sidecar.
 */
export async function runKriging(input: KrigingInput): Promise<KrigingResult> {
  const jsonInput = JSON.stringify(input);
  return runRScript<KrigingResult>('kriging.R', [jsonInput]);
}

// Types for Report Generation
export interface ReportInput {
  title: string;
  regulation: string;
  date: string;
  results: Array<{
    parameterName: string;
    unit: string;
    meanValue: number;
    limit: number;
    status: string;
    percentOfLimit: number;
  }>;
  summary: {
    total: number;
    pass: number;
    warning: number;
    fail: number;
  };
  output_dir?: string;
}

export interface ReportResult {
  success: boolean;
  error?: string;
  format: string;
  output_file: string;
  file_size: number;
  generated_at: string;
}

/**
 * Generate compliance report as PDF or DOCX via R sidecar.
 */
export async function generateReport(
  input: ReportInput,
  format: 'pdf' | 'docx'
): Promise<ReportResult> {
  const jsonInput = JSON.stringify(input);
  return runRScript<ReportResult>('generate_report.R', [jsonInput, format]);
}
