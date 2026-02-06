import { describe, it, expect } from 'vitest';
import {
  encodeDatasetToSeed,
  decodeSeedToValues,
  generateMockData,
  seededRandom,
} from './logic';
import { SampleRow, QCVNStandard } from '../types';

describe('Seed Encoding/Decoding', () => {
  const createMockData = (values: number[][], sampleCount: number): SampleRow[] => {
    const sampleColumns = Array.from({ length: sampleCount }, (_, i) => `Sample ${i + 1}`);
    return values.map((rowValues, idx) => {
      const row: SampleRow = {
        id: `param-${idx}`,
        parameterId: `param-${idx}`,
        parameterName: `Parameter ${idx}`,
        unit: 'mg/L',
        limit: 100,
        type: 'max',
      };
      rowValues.forEach((val, i) => {
        if (i < sampleCount) {
          row[sampleColumns[i]] = val;
        }
      });
      return row;
    });
  };

  describe('Basic Encoding/Decoding', () => {
    it('should encode and decode simple values correctly', () => {
      const data = createMockData([[10.5, 20.3, 30.1]], 3);
      const seed = encodeDatasetToSeed(data, 3);
      
      expect(seed).toBeTruthy();
      expect(seed[0]).toBe('2'); // Version 2
      
      const decoded = decodeSeedToValues(seed);
      expect(decoded).not.toBeNull();
      expect(decoded!.sampleCount).toBe(3);
      expect(decoded!.rowCount).toBe(1);
      expect(decoded!.values).toHaveLength(3);
      
      // Check values with 2 decimal precision
      expect(decoded!.values[0]).toBeCloseTo(10.5, 2);
      expect(decoded!.values[1]).toBeCloseTo(20.3, 2);
      expect(decoded!.values[2]).toBeCloseTo(30.1, 2);
    });

    it('should handle multiple rows', () => {
      const data = createMockData([
        [10.5, 20.3],
        [15.2, 25.7],
        [8.1, 18.9],
      ], 2);
      
      const seed = encodeDatasetToSeed(data, 2);
      const decoded = decodeSeedToValues(seed);
      
      expect(decoded).not.toBeNull();
      expect(decoded!.rowCount).toBe(3);
      expect(decoded!.sampleCount).toBe(2);
      expect(decoded!.values).toHaveLength(6);
      
      // Verify all values
      expect(decoded!.values[0]).toBeCloseTo(10.5, 2);
      expect(decoded!.values[1]).toBeCloseTo(20.3, 2);
      expect(decoded!.values[2]).toBeCloseTo(15.2, 2);
      expect(decoded!.values[3]).toBeCloseTo(25.7, 2);
      expect(decoded!.values[4]).toBeCloseTo(8.1, 2);
      expect(decoded!.values[5]).toBeCloseTo(18.9, 2);
    });

    it('should handle negative values', () => {
      const data = createMockData([[-10.5, -20.3, 5.0]], 3);
      const seed = encodeDatasetToSeed(data, 3);
      const decoded = decodeSeedToValues(seed);
      
      expect(decoded).not.toBeNull();
      expect(decoded!.values[0]).toBeCloseTo(-10.5, 2);
      expect(decoded!.values[1]).toBeCloseTo(-20.3, 2);
      expect(decoded!.values[2]).toBeCloseTo(5.0, 2);
    });

    it('should handle zero values', () => {
      const data = createMockData([[0, 0, 0]], 3);
      const seed = encodeDatasetToSeed(data, 3);
      const decoded = decodeSeedToValues(seed);
      
      expect(decoded).not.toBeNull();
      expect(decoded!.values).toEqual([0, 0, 0]);
    });

    it('should handle large values within range', () => {
      const data = createMockData([[327.67, -327.68]], 2);
      const seed = encodeDatasetToSeed(data, 2);
      const decoded = decodeSeedToValues(seed);
      
      expect(decoded).not.toBeNull();
      expect(decoded!.values[0]).toBeCloseTo(327.67, 2);
      expect(decoded!.values[1]).toBeCloseTo(-327.68, 2);
    });

    it('should clamp values outside int16 range', () => {
      const data = createMockData([[1000, -1000]], 2);
      const seed = encodeDatasetToSeed(data, 2);
      const decoded = decodeSeedToValues(seed);
      
      expect(decoded).not.toBeNull();
      // Values should be clamped to int16 range / 100
      expect(decoded!.values[0]).toBeLessThanOrEqual(327.67);
      expect(decoded!.values[1]).toBeGreaterThanOrEqual(-327.68);
    });
  });

  describe('Seed Format Validation', () => {
    it('should return null for invalid version', () => {
      const decoded = decodeSeedToValues('1A03abc'); // Version 1 is invalid now
      expect(decoded).toBeNull();
    });

    it('should return null for too short seed', () => {
      const decoded = decodeSeedToValues('2A0');
      expect(decoded).toBeNull();
    });

    it('should return null for invalid sample count', () => {
      const decoded = decodeSeedToValues('2!03abc'); // Invalid sample char
      expect(decoded).toBeNull();
    });

    it('should return null for invalid base85 characters', () => {
      const decoded = decodeSeedToValues('2A03abc€'); // € is not in base85
      expect(decoded).toBeNull();
    });

    it('should return empty string for empty data', () => {
      const seed = encodeDatasetToSeed([], 3);
      expect(seed).toBe('');
    });
  });

  describe('Round-trip Consistency', () => {
    it('should maintain consistency through multiple encode/decode cycles', () => {
      const originalData = createMockData([
        [12.34, 56.78, 90.12],
        [34.56, 78.90, 12.34],
        [56.78, 12.34, 78.90],
      ], 3);
      
      const seed1 = encodeDatasetToSeed(originalData, 3);
      const decoded1 = decodeSeedToValues(seed1);
      
      // Re-encode the decoded values
      const reconstructedData = createMockData([
        decoded1!.values.slice(0, 3),
        decoded1!.values.slice(3, 6),
        decoded1!.values.slice(6, 9),
      ], 3);
      
      const seed2 = encodeDatasetToSeed(reconstructedData, 3);
      
      // Seeds should be identical
      expect(seed1).toBe(seed2);
    });
  });

  describe('Seed Length Efficiency', () => {
    it('should produce reasonably short seeds', () => {
      const data = createMockData([
        [10.5, 20.3, 30.1, 40.2, 50.3],
        [15.2, 25.7, 35.1, 45.6, 55.2],
        [8.1, 18.9, 28.3, 38.7, 48.4],
      ], 5);
      
      const seed = encodeDatasetToSeed(data, 5);
      
      // 3 rows × 5 samples = 15 values
      // Each value = 2 bytes = 30 bytes
      // Base85: 30 bytes → ~38 characters (30 * 5/4 = 37.5)
      // Plus header: 4 chars (version + sample + 2 hex)
      // Total: ~42 chars
      expect(seed.length).toBeLessThan(50);
      expect(seed.length).toBeGreaterThan(10);
    });
  });
});

describe('generateMockData with Seed', () => {
  const mockStandard: QCVNStandard = {
    id: 'test-std',
    name: 'Test Standard',
    description: 'For testing',
    category: 'Water',
    parameters: [
      { id: 'p1', name: 'Param1', unit: 'mg/L', limit: 100, type: 'max' },
      { id: 'p2', name: 'Param2', unit: 'mg/L', limit: 50, type: 'max' },
      { id: 'p3', name: 'Param3', unit: 'mg/L', limit: 200, type: 'min' },
    ],
  };

  it('should reconstruct exact dataset from encoded seed', () => {
    // First generate some data
    const data1 = generateMockData(mockStandard, 'test-seed-1', 3);
    
    // Encode it
    const encodedSeed = encodeDatasetToSeed(data1, 3);
    
    // Reconstruct from encoded seed
    const data2 = generateMockData(mockStandard, encodedSeed, 3);
    
    // Should be identical
    expect(data2).toHaveLength(data1.length);
    
    for (let i = 0; i < data1.length; i++) {
      expect(data2[i].parameterId).toBe(data1[i].parameterId);
      expect(data2[i]['Sample 1']).toBe(data1[i]['Sample 1']);
      expect(data2[i]['Sample 2']).toBe(data1[i]['Sample 2']);
      expect(data2[i]['Sample 3']).toBe(data1[i]['Sample 3']);
    }
  });

  it('should fall back to random generation for non-encoded seeds', () => {
    const data1 = generateMockData(mockStandard, 'my-random-seed', 3);
    const data2 = generateMockData(mockStandard, 'my-random-seed', 3);
    
    // Same seed should produce same random data
    expect(data1[0]['Sample 1']).toBe(data2[0]['Sample 1']);
    expect(data1[1]['Sample 2']).toBe(data2[1]['Sample 2']);
  });

  it('should handle encoded seed with different sample count than requested', () => {
    const data = generateMockData(mockStandard, 'test', 3);
    const encodedSeed = encodeDatasetToSeed(data, 3);
    
    // Try to decode with different sample count - should use encoded count
    const decoded = decodeSeedToValues(encodedSeed);
    expect(decoded!.sampleCount).toBe(3);
  });
});

describe('seededRandom', () => {
  it('should produce deterministic values', () => {
    const rand1 = seededRandom(12345);
    const rand2 = seededRandom(12345);
    
    const values1 = Array.from({ length: 10 }, () => rand1());
    const values2 = Array.from({ length: 10 }, () => rand2());
    
    expect(values1).toEqual(values2);
  });

  it('should produce different values for different seeds', () => {
    const rand1 = seededRandom(12345);
    const rand2 = seededRandom(54321);
    
    const val1 = rand1();
    const val2 = rand2();
    
    expect(val1).not.toBe(val2);
  });

  it('should produce values between 0 and 1', () => {
    const rand = seededRandom(12345);
    
    for (let i = 0; i < 100; i++) {
      const val = rand();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});
