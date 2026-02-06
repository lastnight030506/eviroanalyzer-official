import { SampleRow, QCVNStandard, AssessmentResult, ComplianceStatus } from '../types';

export const seededRandom = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const BASE94_CHARS = "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

const encodeBase94 = (data: Uint8Array): string => {
  let result = '';
  
  for (let i = 0; i < data.length; i += 4) {
    let value = 0;
    const chunk = data.slice(i, i + 4);
    const bytesInChunk = chunk.length;
    
    for (let j = 0; j < bytesInChunk; j++) {
      value = value * 256 + chunk[j];
    }
    
    const chars: string[] = [];
    for (let j = 0; j < bytesInChunk + 1; j++) {
      chars.unshift(BASE94_CHARS[value % 94]);
      value = Math.floor(value / 94);
    }
    
    result += chars.join('');
  }
  
  return result;
};

const decodeBase94 = (str: string): Uint8Array | null => {
  const result: number[] = [];
  
  for (let i = 0; i < str.length; i += 5) {
    const chunk = str.slice(i, i + 5);
    const charsInChunk = chunk.length;
    
    if (charsInChunk < 2) return null;
    
    let value = 0;
    for (let j = 0; j < charsInChunk; j++) {
      const index = BASE94_CHARS.indexOf(chunk[j]);
      if (index === -1) return null;
      value = value * 94 + index;
    }
    
    const bytesInChunk = charsInChunk - 1;
    for (let j = bytesInChunk - 1; j >= 0; j--) {
      result.push((value >> (j * 8)) & 0xFF);
    }
  }
  
  return new Uint8Array(result);
};

export const encodeDatasetToSeed = (data: SampleRow[], sampleCount: number): string => {
  if (data.length === 0) return '';
  
  const sampleColumns = Array.from({ length: sampleCount }, (_, i) => `Sample ${i + 1}`);
  const values: number[] = [];
  
  for (const row of data) {
    for (const col of sampleColumns) {
      const val = row[col];
      if (typeof val === 'number') {
        values.push(val);
      } else if (val !== '' && val !== null && val !== undefined) {
        const parsed = parseFloat(String(val));
        if (!isNaN(parsed)) values.push(parsed);
      }
    }
  }
  
  if (values.length === 0) return '';
  
  const buffer = new ArrayBuffer(values.length * 2);
  const view = new DataView(buffer);
  
  for (let i = 0; i < values.length; i++) {
    const clamped = Math.max(-32768, Math.min(32767, Math.round(values[i] * 100)));
    view.setInt16(i * 2, clamped, true);
  }
  
  const bytes = new Uint8Array(buffer);
  const encoded = encodeBase94(bytes);
  
  const version = '2';
  const sampleChar = String.fromCharCode(65 + sampleCount);
  const rowCountHex = data.length.toString(16).padStart(2, '0');
  
  return `${version}${sampleChar}${rowCountHex}${encoded}`;
};

export const decodeSeedToValues = (seed: string): { values: number[]; sampleCount: number; rowCount: number } | null => {
  if (seed.length < 5) return null;
  
  try {
    const version = seed[0];
    if (version !== '2') return null;
    
    const sampleCount = seed.charCodeAt(1) - 65;
    if (sampleCount < 1 || sampleCount > 20) return null;
    
    const rowCount = parseInt(seed.slice(2, 4), 16);
    if (isNaN(rowCount) || rowCount < 1) return null;
    
    const encoded = seed.slice(4);
    const bytes = decodeBase94(encoded);
    if (!bytes) return null;
    
    const view = new DataView(bytes.buffer);
    const values: number[] = [];
    const expectedValues = rowCount * sampleCount;
    
    for (let i = 0; i < expectedValues && i * 2 < bytes.length; i++) {
      const intVal = view.getInt16(i * 2, true);
      values.push(intVal / 100);
    }
    
    return { values, sampleCount, rowCount };
  } catch {
    return null;
  }
};

export const generateMockData = (
  standard: QCVNStandard,
  seedStr: string,
  sampleCount: number
): SampleRow[] => {
  const decoded = decodeSeedToValues(seedStr);
  
  if (decoded && decoded.rowCount === standard.parameters.length) {
    const sampleColumns = Array.from({ length: decoded.sampleCount }, (_, i) => `Sample ${i + 1}`);
    let valueIndex = 0;
    
    return standard.parameters.map((param) => {
      const row: SampleRow = {
        id: param.id,
        parameterId: param.id,
        parameterName: param.name,
        unit: param.unit,
        limit: param.limit,
        type: param.type,
      };
      
      for (let i = 0; i < decoded.sampleCount; i++) {
        if (valueIndex < decoded.values.length) {
          row[sampleColumns[i]] = decoded.values[valueIndex++];
        }
      }
      
      return row;
    });
  }
  
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed << 5) - seed + seedStr.charCodeAt(i);
    seed |= 0;
  }
  
  const rand = seededRandom(seed);

  return standard.parameters.map((param) => {
    const row: SampleRow = {
      id: param.id,
      parameterId: param.id,
      parameterName: param.name,
      unit: param.unit,
      limit: param.limit,
      type: param.type,
    };

    for (let i = 1; i <= sampleCount; i++) {
      const scenario = rand();
      let val = 0;
      const limit = param.limit;

      if (param.type === 'max') {
        if (scenario < 0.7) {
            val = limit * (rand() * 0.75);
        } else if (scenario < 0.9) {
            val = limit * (0.8 + rand() * 0.2);
        } else {
            val = limit * (1.01 + rand() * 0.5);
        }
      } else {
         if (scenario < 0.7) {
            val = limit * (1.1 + rand() * 0.5);
        } else if (scenario < 0.9) {
            val = limit * (1.0 + rand() * 0.1);
        } else {
            val = limit * (rand() * 0.99);
        }
      }

      row[`Sample ${i}`] = Math.round(val * 100) / 100;
    }
    return row;
  });
};

export const assessCompliance = (
  data: SampleRow[],
  sampleColumns: string[],
  safetyMargin: number = 0.8
): AssessmentResult[] => {
  return data.map((row) => {
    const values = sampleColumns
      .map((col) => {
        const val = row[col];
        if (typeof val === 'number') return val;
        if (val === '' || val === null || val === undefined) return null;
        const parsed = parseFloat(String(val));
        return isNaN(parsed) ? null : parsed;
      })
      .filter((v): v is number => v !== null);

    if (values.length === 0) {
      return {
        parameterId: row.parameterId,
        parameterName: row.parameterName,
        unit: row.unit,
        limit: row.limit,
        type: row.type,
        meanValue: 0,
        maxValue: 0,
        status: "N/A",
        percentOfLimit: 0,
      };
    }
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = Math.round((sum / values.length) * 100) / 100;
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);

    let status: ComplianceStatus = "Pass";
    const limit = row.limit;
    
    const criticalVal = row.type === 'max' ? maxVal : minVal;
    
    let percent = 0;

    if (row.type === 'max') {
        percent = (criticalVal / limit) * 100;
        if (criticalVal > limit) {
            status = "Fail";
        } else if (criticalVal >= limit * safetyMargin) {
            status = "Warning";
        }
    } else {
        percent = (limit / criticalVal) * 100;
        if (criticalVal < limit) {
            status = "Fail";
        } else if (criticalVal <= limit * (1 + (1 - safetyMargin))) {
            status = "Warning";
        }
    }

    return {
      parameterId: row.parameterId,
      parameterName: row.parameterName,
      unit: row.unit,
      limit: row.limit,
      type: row.type,
      meanValue: mean,
      maxValue: maxVal,
      status,
      percentOfLimit: Math.round(percent),
    };
  });
};

export const getComplianceStats = (results: AssessmentResult[]) => {
  return {
    pass: results.filter(r => r.status === 'Pass').length,
    warning: results.filter(r => r.status === 'Warning').length,
    fail: results.filter(r => r.status === 'Fail').length,
    total: results.length
  };
};
