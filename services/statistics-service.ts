import { runRScript } from './r-sidecar';
import type { DataLoadResult, ContinuousResult, FrequencyResult, TTestResult, ANOVAResult, CorrelationResult, ChiSquareResult, LinearRegressionResult, LogisticRegressionResult, PlotResult, VariableInfo } from '../types/statistics';

export async function loadData(filePath: string, fileType: 'csv' | 'excel' | 'sav'): Promise<DataLoadResult> {
  return runRScript<DataLoadResult>('read_data.R', [JSON.stringify({ file_path: filePath, file_type: fileType })]);
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
