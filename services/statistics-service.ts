import { runRScript, uploadFile } from './r-sidecar';
import type { DataLoadResult, ContinuousResult, FrequencyResult, TTestResult, ANOVAResult, CorrelationResult, ChiSquareResult, LinearRegressionResult, LogisticRegressionResult, PlotResult, VariableInfo, RawDataRow } from '../types/statistics';

export async function loadData(filePath: string, fileType: 'csv' | 'excel' | 'sav', fileContent?: ArrayBuffer): Promise<DataLoadResult> {
  // For Excel/SPSS, upload file first to server
  if ((fileType === 'excel' || fileType === 'sav') && fileContent) {
    const uploadResult = await uploadFile(filePath, fileContent);
    if (!uploadResult.success || !uploadResult.filePath) {
      throw new Error(uploadResult.error || 'File upload failed');
    }
    return runRScript<DataLoadResult>('read_data.R', [JSON.stringify({ file_path: uploadResult.filePath, file_type: fileType })]);
  }
  // For CSV, percent-encode the filepath to handle Unicode characters
  const encodedPath = encodeURIComponent(filePath);
  return runRScript<DataLoadResult>('read_data.R', [JSON.stringify({ file_path: encodedPath, file_type: fileType, original_name: filePath })]);
}

export async function getDescriptives(sessionId: string, variables: string[]): Promise<ContinuousResult[]> {
  return runRScript<ContinuousResult[]>('desc_stats.R', [JSON.stringify({ session_id: sessionId, variables })]);
}

export async function getFrequencies(sessionId: string, variables: string[]): Promise<FrequencyResult[]> {
  return runRScript<FrequencyResult[]>('desc_freq.R', [JSON.stringify({ session_id: sessionId, variables })]);
}

export async function runTTestIndependent(sessionId: string, formula: string): Promise<TTestResult> {
  return runRScript<TTestResult>('ttest_independent.R', [JSON.stringify({ session_id: sessionId, formula })]);
}

export async function runTTestPaired(sessionId: string, var1: string, var2: string): Promise<TTestResult> {
  return runRScript<TTestResult>('ttest_paired.R', [JSON.stringify({ session_id: sessionId, var1, var2 })]);
}

export async function runANOVA(sessionId: string, formula: string, posthoc: 'tukey' | 'games-howell' | 'none'): Promise<ANOVAResult> {
  return runRScript<ANOVAResult>('anova_oneway.R', [JSON.stringify({ session_id: sessionId, formula, posthoc })]);
}

export async function runCorrelation(sessionId: string, variables: string[], method: 'pearson' | 'spearman'): Promise<CorrelationResult> {
  return runRScript<CorrelationResult>('correlation.R', [JSON.stringify({ session_id: sessionId, variables, method })]);
}

export async function runChiSquare(sessionId: string, var1: string, var2: string): Promise<ChiSquareResult> {
  return runRScript<ChiSquareResult>('chi_square.R', [JSON.stringify({ session_id: sessionId, var1, var2 })]);
}

export async function runLinearRegression(sessionId: string, formula: string): Promise<LinearRegressionResult> {
  return runRScript<LinearRegressionResult>('regression_linear.R', [JSON.stringify({ session_id: sessionId, formula })]);
}

export async function runLogisticRegression(sessionId: string, formula: string): Promise<LogisticRegressionResult> {
  return runRScript<LogisticRegressionResult>('regression_logistic.R', [JSON.stringify({ session_id: sessionId, formula })]);
}

export async function generatePlot(sessionId: string, plotType: 'histogram' | 'boxplot' | 'scatter' | 'bar', xVar: string, yVar?: string, groupBy?: string): Promise<PlotResult> {
  return runRScript<PlotResult>('plot_generator.R', [JSON.stringify({ session_id: sessionId, plot_type: plotType, x_var: xVar, y_var: yVar, group_by: groupBy })]);
}

export async function loadDirectDataToSession(variables: VariableInfo[], data: RawDataRow[]): Promise<string> {
  const { loadDirectData } = await import('./stats-data-service');
  const result = await loadDirectData({ variables, data });
  return result.session_id;
}
