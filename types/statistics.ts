import type { SampleRow } from '../types';

export interface RawDataRow {
  [variableName: string]: string | number | null;
}

export interface VariableInfo {
  name: string;
  label: string;
  type: 'numeric' | 'factor' | 'character' | 'date';
  levels?: string[];
  missing_count: number;
}

export interface DataLoadResult {
  session_id: string;
  variables: VariableInfo[];
  row_count: number;
  column_count?: number;
  data?: RawDataRow[];
  data_preview?: RawDataRow[];
}

export interface FrequencyResult {
  variable: string;
  counts: { level: string; n: number; percent: number; valid_percent: number }[];
  total_valid: number;
  total_missing: number;
}

export interface ContinuousResult {
  variable: string;
  n: number;
  mean: number;
  median: number;
  sd: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
}

export interface TTestResult {
  test: 'independent' | 'paired';
  formula: string;
  t_statistic: number;
  df: number;
  p_value: number;
  ci_lower: number;
  ci_upper: number;
  effect_size: number;
  mean_difference: number;
}

export interface ANOVAResult {
  between_df: number;
  within_df: number;
  F_statistic: number;
  p_value: number;
  effect_size: number;
  group_means: { group: string; mean: number; n: number; sd: number }[];
  posthoc?: { comparison: string; estimate: number; p_value: number; ci_lower: number; ci_upper: number }[];
}

export interface CorrelationResult {
  method: 'pearson' | 'spearman';
  matrix: { var1: string; var2: string; correlation: number; p_value: number }[];
  n_obs: number;
}

export interface ChiSquareResult {
  statistic: number;
  df: number;
  p_value: number;
  cramers_v: number;
  observed: number[][];
  expected: number[][];
}

export interface LinearRegressionResult {
  formula: string;
  n_obs: number;
  r_squared: number;
  adj_r_squared: number;
  f_statistic: number;
  f_p_value: number;
  coefficients: { term: string; estimate: number; std_error: number; t_statistic: number; p_value: number; ci_lower: number; ci_upper: number }[];
}

export interface LogisticRegressionResult {
  formula: string;
  n_obs: number;
  deviance: number;
  pseudo_r2: number;
  coefficients: { term: string; estimate: number; std_error: number; z_statistic: number; p_value: number; odds_ratio: number; ci_lower: number; ci_upper: number }[];
}

export interface PlotResult {
  plot_type: 'histogram' | 'boxplot' | 'scatter' | 'bar';
  html_content: string;
  dimensions: { width: number; height: number };
}

// Data Import Types
export type CleaningOpType =
  | 'remove_empty'
  | 'handle_na'
  | 'remove_outliers'
  | 'log_transform'
  | 'standardize'
  | 'normalize'
  | 'rename'
  | 'filter'
  | 'convert_type';

export interface CleaningOperation {
  op: CleaningOpType;
  type?: 'rows' | 'cols';
  method?: 'mean' | 'median' | 'mode' | 'remove';
  column?: string;
  columns?: string[];
  threshold?: number;
  old?: string;
  new?: string;
  operator?: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value?: number;
  as?: 'numeric' | 'factor';
}

export interface CleaningConfig {
  session_id: string;
  operations: CleaningOperation[];
}

export interface CleaningResult {
  success: boolean;
  session_id: string;
  cleaned_row_count: number;
  removed_count: number;
  imputed_values?: Record<string, number>;
  message?: string;
}

// Variable Mapping Types
export interface VariableMapping {
  imported_var: string;
  qcvn_param: string | null;
  confidence: number;
  is_manual: boolean;
}

export interface MappingConfig {
  session_id: string;
  mappings: VariableMapping[];
  sample_prefix: string;
  qcvn_params: QCVNParameterRef[];
}

export interface MappingQuality {
  total: number;
  mapped: number;
  auto_mapped: number;
  manually_mapped: number;
  unmapped: number;
}

export interface MappingResult {
  success: boolean;
  sample_rows: SampleRow[];
  unmapped_variables: string[];
  mapping_quality: MappingQuality;
}

export interface QCVNParameterRef {
  id: string;
  name: string;
  unit: string;
  limit: number;
  type: 'max' | 'min';
  aliases?: string[];
}
