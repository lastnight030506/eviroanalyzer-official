import { QCVNStandard } from './types';

export const COLORS = {
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  neutral: "#94a3b8",
  primary: "#3b82f6",
  gridBorder: "#e2e8f0"
};

export const STANDARDS: QCVNStandard[] = [
  {
    id: "qcvn08-mt-2015-b1",
    name: "QCVN 08-MT:2015 (Col B1)",
    description: "National Technical Regulation on Surface Water Quality (Irrigation)",
    category: "Water",
    parameters: [
      { id: "ph", name: "pH", unit: "-", limit: 9, type: "max" }, // Simplified max for demo (actually range 5.5-9)
      { id: "bod5", name: "BOD5", unit: "mg/L", limit: 15, type: "max" },
      { id: "cod", name: "COD", unit: "mg/L", limit: 30, type: "max" },
      { id: "tss", name: "TSS", unit: "mg/L", limit: 50, type: "max" },
      { id: "do", name: "DO", unit: "mg/L", limit: 4, type: "min" },
      { id: "nh4", name: "Ammonium (NH4+)", unit: "mg/L", limit: 0.9, type: "max" },
      { id: "cl", name: "Chloride (Cl-)", unit: "mg/L", limit: 350, type: "max" },
      { id: "f", name: "Fluoride (F-)", unit: "mg/L", limit: 1.5, type: "max" },
      { id: "no2", name: "Nitrite (NO2-)", unit: "mg/L", limit: 0.05, type: "max" },
      { id: "no3", name: "Nitrate (NO3-)", unit: "mg/L", limit: 10, type: "max" },
      { id: "po4", name: "Phosphate (PO4)", unit: "mg/L", limit: 0.3, type: "max" }
    ]
  },
  {
    id: "qcvn14-2008-b",
    name: "QCVN 14:2008/BTNMT (Col B)",
    description: "Domestic Wastewater Discharged into Water Sources used for Navigation",
    category: "Water",
    parameters: [
      { id: "ph", name: "pH", unit: "-", limit: 9, type: "max" },
      { id: "tds", name: "TDS", unit: "mg/L", limit: 1000, type: "max" },
      { id: "sulfide", name: "Sulfide", unit: "mg/L", limit: 4.0, type: "max" },
      { id: "nh4", name: "Ammonium", unit: "mg/L", limit: 10, type: "max" },
      { id: "no3", name: "Nitrate", unit: "mg/L", limit: 50, type: "max" },
      { id: "oil", name: "Oil & Grease", unit: "mg/L", limit: 20, type: "max" },
      { id: "coliform", name: "Coliform", unit: "MPN/100mL", limit: 5000, type: "max" }
    ]
  },
  {
    id: "qcvn05-2013",
    name: "QCVN 05:2013/BTNMT",
    description: "Ambient Air Quality (24h Average)",
    category: "Air",
    parameters: [
      { id: "so2", name: "SO2", unit: "µg/m³", limit: 125, type: "max" },
      { id: "no2", name: "NO2", unit: "µg/m³", limit: 100, type: "max" },
      { id: "co", name: "CO", unit: "µg/m³", limit: 30000, type: "max" },
      { id: "tsp", name: "TSP", unit: "µg/m³", limit: 200, type: "max" },
      { id: "pm10", name: "PM10", unit: "µg/m³", limit: 150, type: "max" },
      { id: "pm25", name: "PM2.5", unit: "µg/m³", limit: 50, type: "max" },
      { id: "pb", name: "Lead (Pb)", unit: "µg/m³", limit: 1.5, type: "max" }
    ]
  }
];