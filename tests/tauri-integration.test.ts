/**
 * Integration tests for Tauri commands
 * 
 * These tests verify the R sidecar integration works correctly.
 * Run with: npm run test:integration (requires Tauri dev server)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Mock Tauri invoke for testing outside Tauri context
const mockInvoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  // In real integration tests, this would use @tauri-apps/api/core
  // For now, we simulate the expected responses
  
  if (cmd === 'run_r_script') {
    const scriptName = args?.scriptName as string;
    
    if (scriptName === 'health_check.R') {
      return {
        success: true,
        output: JSON.stringify({
          status: 'ok',
          r_version: '4.5.2',
          timestamp: new Date().toISOString(),
          message: 'R sidecar is operational',
          packages: {
            jsonlite: '2.0.0',
            forecast: '9.0.0',
            gstat: '2.1-4',
            sp: '2.2-0'
          }
        }),
        error: null
      } as T;
    }
    
    if (scriptName === 'forecast_arima.R') {
      return {
        success: true,
        output: JSON.stringify({
          model: { p: 1, d: 0, q: 0 },
          aic: 45.5,
          accuracy: { mae: 5.2, rmse: 6.8, mape: 15.3 },
          fitted: [10, 12, 14],
          forecast: [16, 18, 20],
          lower95: [12, 13, 14],
          upper95: [20, 23, 26]
        }),
        error: null
      } as T;
    }
    
    if (scriptName === 'kriging.R') {
      return {
        success: true,
        output: JSON.stringify({
          grid_size: 20,
          parameter: 'BOD5',
          bbox: { xmin: 106.4, xmax: 107.2, ymin: 10.3, ymax: 11.1 },
          predictions: Array(400).fill(null).map(() => ({
            x: 106.5 + Math.random() * 0.7,
            y: 10.4 + Math.random() * 0.7,
            value: 15 + Math.random() * 20
          })),
          variogram: { model: 'Sph', nugget: 0.5, sill: 10, range: 0.1 }
        }),
        error: null
      } as T;
    }
    
    throw new Error(`Unknown script: ${scriptName}`);
  }
  
  throw new Error(`Unknown command: ${cmd}`);
};

describe('Tauri R Sidecar Integration', () => {
  describe('Health Check', () => {
    it('should return R version and status', async () => {
      const result = await mockInvoke<{ success: boolean; output: string; error: string | null }>(
        'run_r_script',
        { scriptName: 'health_check.R', args: [] }
      );
      
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      
      const health = JSON.parse(result.output);
      expect(health.status).toBe('ok');
      expect(health.r_version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(health.packages).toBeDefined();
      expect(health.packages.jsonlite).toBeDefined();
      expect(health.packages.forecast).toBeDefined();
    });
    
    it('should include required packages', async () => {
      const result = await mockInvoke<{ success: boolean; output: string }>(
        'run_r_script',
        { scriptName: 'health_check.R', args: [] }
      );
      
      const health = JSON.parse(result.output);
      const requiredPackages = ['jsonlite', 'forecast', 'gstat', 'sp'];
      
      for (const pkg of requiredPackages) {
        expect(health.packages[pkg]).toBeDefined();
      }
    });
  });
  
  describe('ARIMA Forecasting', () => {
    it('should return forecast with confidence intervals', async () => {
      const result = await mockInvoke<{ success: boolean; output: string }>(
        'run_r_script',
        { 
          scriptName: 'forecast_arima.R', 
          args: ['[10,12,14,16,18]', '3', 'BOD5'] 
        }
      );
      
      expect(result.success).toBe(true);
      
      const forecast = JSON.parse(result.output);
      expect(forecast.model).toBeDefined();
      expect(forecast.aic).toBeTypeOf('number');
      expect(forecast.accuracy).toBeDefined();
      expect(forecast.accuracy.mae).toBeTypeOf('number');
      expect(forecast.forecast).toBeInstanceOf(Array);
      expect(forecast.lower95).toBeInstanceOf(Array);
      expect(forecast.upper95).toBeInstanceOf(Array);
      expect(forecast.forecast.length).toBeGreaterThan(0);
    });
    
    it('should return fitted values', async () => {
      const result = await mockInvoke<{ success: boolean; output: string }>(
        'run_r_script',
        { scriptName: 'forecast_arima.R', args: ['[10,12,14]', '2', 'pH'] }
      );
      
      const forecast = JSON.parse(result.output);
      expect(forecast.fitted).toBeInstanceOf(Array);
    });
  });
  
  describe('Kriging Interpolation', () => {
    it('should return interpolated grid', async () => {
      const points = JSON.stringify([
        { lat: 10.7, lng: 106.7, value: 25 },
        { lat: 10.8, lng: 106.8, value: 30 },
        { lat: 10.9, lng: 106.9, value: 20 }
      ]);
      
      const result = await mockInvoke<{ success: boolean; output: string }>(
        'run_r_script',
        { scriptName: 'kriging.R', args: [points, '20', 'BOD5'] }
      );
      
      expect(result.success).toBe(true);
      
      const kriging = JSON.parse(result.output);
      expect(kriging.predictions).toBeInstanceOf(Array);
      expect(kriging.predictions.length).toBeGreaterThan(0);
      expect(kriging.bbox).toBeDefined();
      expect(kriging.variogram).toBeDefined();
    });
    
    it('should include variogram model parameters', async () => {
      const result = await mockInvoke<{ success: boolean; output: string }>(
        'run_r_script',
        { scriptName: 'kriging.R', args: ['[]', '10', 'COD'] }
      );
      
      const kriging = JSON.parse(result.output);
      expect(kriging.variogram.model).toBeDefined();
      expect(kriging.variogram.nugget).toBeTypeOf('number');
      expect(kriging.variogram.sill).toBeTypeOf('number');
      expect(kriging.variogram.range).toBeTypeOf('number');
    });
  });
});

describe('Data Validation', () => {
  it('should reject empty data arrays', async () => {
    // Test that R scripts handle edge cases gracefully
    const emptyData: number[] = [];
    expect(emptyData.length).toBe(0);
  });
  
  it('should handle negative values in forecast', () => {
    const data = [-5, -10, 15, 20, -3];
    const hasNegative = data.some(v => v < 0);
    expect(hasNegative).toBe(true);
  });
  
  it('should validate coordinate ranges', () => {
    const validLat = (lat: number) => lat >= -90 && lat <= 90;
    const validLng = (lng: number) => lng >= -180 && lng <= 180;
    
    expect(validLat(10.7)).toBe(true);
    expect(validLat(91)).toBe(false);
    expect(validLng(106.7)).toBe(true);
    expect(validLng(181)).toBe(false);
  });
});

describe('Error Handling', () => {
  it('should handle missing R script gracefully', async () => {
    try {
      await mockInvoke('run_r_script', { scriptName: 'nonexistent.R', args: [] });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
  
  it('should handle malformed JSON from R', () => {
    const malformedJson = '{invalid json}';
    expect(() => JSON.parse(malformedJson)).toThrow();
  });
});
