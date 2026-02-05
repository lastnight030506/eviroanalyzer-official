export type ComplianceStatus = "Pass" | "Warning" | "Fail" | "N/A";

export interface QCVNParameter {
  id: string;
  name: string;
  unit: string;
  limit: number;
  type: "max" | "min"; // Simplified for this demo
}

export interface QCVNStandard {
  id: string;
  name: string;
  description: string;
  category: "Water" | "Air" | "Soil";
  parameters: QCVNParameter[];
}

export interface SampleRow {
  id: string;
  parameterId: string;
  parameterName: string;
  unit: string;
  limit: number;
  type: "max" | "min";
  // Dynamic sample columns: "Sample 1": 10.5
  [key: string]: number | string;
}

export interface AssessmentResult {
  parameterId: string;
  parameterName: string;
  unit: string;
  limit: number;
  type: "max" | "min";
  meanValue: number;
  maxValue: number;
  status: ComplianceStatus;
  percentOfLimit: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  limit: number;
  fullMark: number;
}