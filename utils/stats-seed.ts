import type { VariableInfo, RawDataRow } from '../types/statistics';

// Base94 character set for encoding (same as compliance seed)
const BASE94_CHARS = "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

function base94Encode(bytes: Uint8Array): string {
  let result = '';

  for (let i = 0; i < bytes.length; i += 4) {
    let value = 0;
    const chunk = bytes.slice(i, i + 4);
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
}

function base94Decode(str: string): Uint8Array | null {
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
}

// Type codes for variable types
const TYPE_CODES: Record<string, number> = {
  numeric: 1,
  factor: 2,
  character: 3,
  date: 4,
};

const TYPE_DECODE: Record<number, string> = {
  1: 'numeric',
  2: 'factor',
  3: 'character',
  4: 'date',
};

export function encodeStatsData(variables: VariableInfo[], data: RawDataRow[]): string {
  try {
    if (variables.length === 0 || data.length === 0) return '';

    // Build byte array
    const parts: Uint8Array[] = [];

    // 1. Version byte (0x01)
    parts.push(new Uint8Array([0x01]));

    // 2. Number of variables (2 bytes, big-endian uint16)
    const varCount = variables.length;
    parts.push(new Uint8Array([(varCount >> 8) & 0xff, varCount & 0xff]));

    // 3. For each variable: name length (1 byte) + name bytes, type (1 byte), label length (1 byte) + label bytes
    const encoder = new TextEncoder();
    for (const v of variables) {
      const nameBytes = encoder.encode(v.name);
      parts.push(new Uint8Array([nameBytes.length]));
      parts.push(nameBytes);

      const typeCode = TYPE_CODES[v.type] || 1;
      parts.push(new Uint8Array([typeCode]));

      const labelBytes = encoder.encode(v.label);
      parts.push(new Uint8Array([labelBytes.length]));
      parts.push(labelBytes);

      // Levels for factor type
      if (v.type === 'factor' && v.levels && v.levels.length > 0) {
        parts.push(new Uint8Array([v.levels.length]));
        for (const level of v.levels) {
          const levelBytes = encoder.encode(level);
          parts.push(new Uint8Array([levelBytes.length]));
          parts.push(levelBytes);
        }
      } else {
        parts.push(new Uint8Array([0]));
      }
    }

    // 4. Number of rows (4 bytes, big-endian uint32)
    const rowCount = data.length;
    parts.push(
      new Uint8Array([
        (rowCount >> 24) & 0xff,
        (rowCount >> 16) & 0xff,
        (rowCount >> 8) & 0xff,
        rowCount & 0xff,
      ])
    );

    // 5. Number of columns (2 bytes, big-endian uint16)
    const colCount = variables.length;
    parts.push(new Uint8Array([(colCount >> 8) & 0xff, colCount & 0xff]));

    // 6. All values as uint16 (multiply by 100 for 2 decimal precision, offset by 32768 for negatives)
    // For factor levels, store the level index
    // Null/missing values as 0xFFFF
    const valueBuffer = new ArrayBuffer(data.length * colCount * 2);
    const valueView = new DataView(valueBuffer);
    let valueIdx = 0;

    for (const row of data) {
      for (const v of variables) {
        const val = row[v.name];
        if (val === null || val === undefined || val === '') {
          valueView.setUint16(valueIdx * 2, 0xffff, false);
        } else if (v.type === 'factor' && typeof val === 'string') {
          const levelIdx = v.levels ? v.levels.indexOf(val) : -1;
          const encoded = levelIdx >= 0 ? levelIdx + 1 : 0;
          valueView.setUint16(valueIdx * 2, encoded, false);
        } else if (typeof val === 'number') {
          const scaled = Math.round(val * 100);
          const offset = scaled + 32768;
          valueView.setUint16(valueIdx * 2, offset, false);
        } else {
          // Try to parse string as number
          const parsed = parseFloat(String(val));
          if (isNaN(parsed)) {
            valueView.setUint16(valueIdx * 2, 0xffff, false);
          } else {
            const scaled = Math.round(parsed * 100);
            const offset = scaled + 32768;
            valueView.setUint16(valueIdx * 2, offset, false);
          }
        }
        valueIdx++;
      }
    }

    parts.push(new Uint8Array(valueBuffer));

    // Concatenate all parts
    const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of parts) {
      result.set(p, offset);
      offset += p.length;
    }

    return base94Encode(result);
  } catch {
    return '';
  }
}

export function decodeStatsData(
  seed: string
): { variables: VariableInfo[]; data: RawDataRow[] } | null {
  try {
    if (!seed || seed.length < 10) return null;

    const bytes = base94Decode(seed);
    if (!bytes) return null;

    const view = new DataView(bytes.buffer);
    let offset = 0;

    // 1. Version byte
    if (offset >= bytes.length) return null;
    const version = view.getUint8(offset);
    offset++;
    if (version !== 0x01) return null;

    // 2. Number of variables
    if (offset + 1 >= bytes.length) return null;
    const varCount = view.getUint16(offset, false);
    offset += 2;

    // 3. Read variables
    const decoder = new TextDecoder();
    const variables: VariableInfo[] = [];

    for (let i = 0; i < varCount; i++) {
      // Name
      if (offset >= bytes.length) return null;
      const nameLen = view.getUint8(offset);
      offset++;
      if (offset + nameLen > bytes.length) return null;
      const name = decoder.decode(bytes.slice(offset, offset + nameLen));
      offset += nameLen;

      // Type
      if (offset >= bytes.length) return null;
      const typeCode = view.getUint8(offset);
      offset++;
      const type = TYPE_DECODE[typeCode] || 'numeric';

      // Label
      if (offset >= bytes.length) return null;
      const labelLen = view.getUint8(offset);
      offset++;
      if (offset + labelLen > bytes.length) return null;
      const label = decoder.decode(bytes.slice(offset, offset + labelLen));
      offset += labelLen;

      // Levels (for factor type)
      if (offset >= bytes.length) return null;
      const levelsCount = view.getUint8(offset);
      offset++;
      const levels: string[] = [];
      for (let j = 0; j < levelsCount; j++) {
        if (offset >= bytes.length) return null;
        const levelLen = view.getUint8(offset);
        offset++;
        if (offset + levelLen > bytes.length) return null;
        const level = decoder.decode(bytes.slice(offset, offset + levelLen));
        offset += levelLen;
        levels.push(level);
      }

      variables.push({
        name,
        label,
        type: type as VariableInfo['type'],
        levels: levels.length > 0 ? levels : undefined,
        missing_count: 0,
      });
    }

    // 4. Number of rows
    if (offset + 3 >= bytes.length) return null;
    const rowCount = view.getUint32(offset, false);
    offset += 4;

    // 5. Number of columns
    if (offset + 1 >= bytes.length) return null;
    const colCount = view.getUint16(offset, false);
    offset += 2;

    // 6. Read values
    const data: RawDataRow[] = [];
    const expectedValues = rowCount * colCount;

    for (let r = 0; r < rowCount; r++) {
      const row: RawDataRow = {};
      for (let c = 0; c < colCount; c++) {
        if (offset + 1 >= bytes.length) break;
        const encoded = view.getUint16(offset, false);
        offset += 2;

        const varInfo = variables[c];
        if (encoded === 0xffff) {
          row[varInfo.name] = null;
        } else if (varInfo.type === 'factor') {
          const levelIdx = encoded - 1;
          row[varInfo.name] = varInfo.levels && levelIdx >= 0 && levelIdx < varInfo.levels.length
            ? varInfo.levels[levelIdx]
            : null;
        } else {
          const scaled = encoded - 32768;
          row[varInfo.name] = scaled / 100;
        }
      }
      data.push(row);
    }

    return { variables, data };
  } catch {
    return null;
  }
}
