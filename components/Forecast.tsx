import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { SampleRow, AssessmentResult } from '../types';
import { forecastARIMA, ARIMAResult } from '../services/analytics';
import { COLORS } from '../constants';

interface ForecastProps {
  data: SampleRow[];
  results: AssessmentResult[];
  sampleColumns: string[];
  isDarkMode: boolean;
}

const Forecast: React.FC<ForecastProps> = ({ data, results, sampleColumns, isDarkMode }) => {
  const [selectedParameter, setSelectedParameter] = useState<string>('');
  const [forecastPeriods, setForecastPeriods] = useState<number>(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastResult, setForecastResult] = useState<ARIMAResult | null>(null);

  // Get available parameters
  const parameters = useMemo(() => {
    return data.map(row => ({
      id: row.parameterId,
      name: row.parameterName,
    }));
  }, [data]);

  // Get values for selected parameter
  const getParameterValues = (parameterId: string): number[] => {
    const row = data.find(r => r.parameterId === parameterId);
    if (!row) return [];
    
    return sampleColumns.map(col => {
      const val = row[col];
      return typeof val === 'number' ? val : 0;
    });
  };

  // Run forecast
  const handleForecast = async () => {
    if (!selectedParameter) {
      setError('Please select a parameter');
      return;
    }

    const values = getParameterValues(selectedParameter);
    if (values.length < 3) {
      setError('Need at least 3 data points for forecasting');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const row = data.find(r => r.parameterId === selectedParameter);
      const result = await forecastARIMA({
        values,
        periods: forecastPeriods,
        parameter: row?.parameterName || selectedParameter,
      });

      if (result.success) {
        setForecastResult(result);
      } else {
        setError(result.error || 'Forecast failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run forecast. Is R installed with forecast package?');
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!forecastResult) return [];

    const data: Array<{
      period: string;
      actual?: number;
      fitted?: number;
      forecast?: number;
      lower?: number;
      upper?: number;
    }> = [];

    // Historical data
    forecastResult.historical.forEach((val, i) => {
      data.push({
        period: `S${i + 1}`,
        actual: val,
        fitted: forecastResult.fitted[i],
      });
    });

    // Forecast data
    forecastResult.forecast.mean.forEach((val, i) => {
      data.push({
        period: `F${i + 1}`,
        forecast: val,
        lower: forecastResult.forecast.lower[i],
        upper: forecastResult.forecast.upper[i],
      });
    });

    return data;
  }, [forecastResult]);

  // Get limit for reference line
  const parameterLimit = useMemo(() => {
    const row = data.find(r => r.parameterId === selectedParameter);
    return row?.limit;
  }, [data, selectedParameter]);

  const styles = {
    card: `bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6`,
    label: `text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2`,
    select: `w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-sm`,
    input: `w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-sm`,
    button: `px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-md text-sm font-medium transition-colors`,
    statCard: `p-4 rounded-lg bg-slate-50 dark:bg-slate-900`,
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-auto">
      {/* Controls */}
      <div className={styles.card}>
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Time Series Forecasting (ARIMA)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={styles.label}>Parameter</label>
            <select
              value={selectedParameter}
              onChange={(e) => setSelectedParameter(e.target.value)}
              className={styles.select}
            >
              <option value="">Select parameter...</option>
              {parameters.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={styles.label}>Forecast Periods</label>
            <input
              type="number"
              min={1}
              max={20}
              value={forecastPeriods}
              onChange={(e) => setForecastPeriods(parseInt(e.target.value) || 5)}
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>Data Points</label>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-900 rounded-md text-sm font-mono">
              {selectedParameter ? getParameterValues(selectedParameter).length : 0}
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleForecast}
              disabled={isLoading || !selectedParameter}
              className={styles.button}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running...
                </span>
              ) : (
                'Run Forecast'
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-md text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {forecastResult && (
        <>
          {/* Model Info */}
          <div className={styles.card}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className={styles.statCard}>
                <div className="text-xs text-slate-500 dark:text-slate-400">Model</div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{forecastResult.model}</div>
              </div>
              <div className={styles.statCard}>
                <div className="text-xs text-slate-500 dark:text-slate-400">AIC</div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{forecastResult.aic}</div>
              </div>
              <div className={styles.statCard}>
                <div className="text-xs text-slate-500 dark:text-slate-400">MAE</div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{forecastResult.accuracy.mae}</div>
              </div>
              <div className={styles.statCard}>
                <div className="text-xs text-slate-500 dark:text-slate-400">RMSE</div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{forecastResult.accuracy.rmse}</div>
              </div>
              <div className={styles.statCard}>
                <div className="text-xs text-slate-500 dark:text-slate-400">MAPE</div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{forecastResult.accuracy.mape}%</div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className={`${styles.card} flex-1 min-h-[400px]`}>
            <h4 className="text-sm font-semibold mb-4 dark:text-white">
              Forecast: {forecastResult.parameter}
            </h4>
            <ResponsiveContainer width="100%" height="90%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                <XAxis 
                  dataKey="period" 
                  tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                
                {/* Upper Bound line */}
                <Line
                  type="monotone"
                  dataKey="upper"
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#f97316', r: 3 }}
                  name="Upper Bound"
                  connectNulls={false}
                />
                
                {/* Lower Bound line */}
                <Line
                  type="monotone"
                  dataKey="lower"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#8b5cf6', r: 3 }}
                  name="Lower Bound"
                  connectNulls={false}
                />

                {/* Actual values */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary, r: 4 }}
                  name="Actual"
                />

                {/* Fitted values */}
                <Line
                  type="monotone"
                  dataKey="fitted"
                  stroke={COLORS.success}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Fitted"
                />

                {/* Forecast values */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke={COLORS.warning}
                  strokeWidth={2}
                  dot={{ fill: COLORS.warning, r: 4 }}
                  name="Forecast"
                />

                {/* Limit reference line */}
                {parameterLimit && (
                  <ReferenceLine
                    y={parameterLimit}
                    stroke={COLORS.danger}
                    strokeDasharray="3 3"
                    label={{ value: `Limit: ${parameterLimit}`, fill: COLORS.danger, fontSize: 12 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast Table */}
          <div className={styles.card}>
            <h4 className="text-sm font-semibold mb-4 dark:text-white">Forecast Values</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-slate-400">Period</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400">Forecast</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400">Lower 95%</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400">Upper 95%</th>
                    {parameterLimit && (
                      <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400">% of Limit</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {forecastResult.forecast.mean.map((val, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 px-3 dark:text-slate-300">Period {i + 1}</td>
                      <td className="py-2 px-3 text-right font-mono dark:text-slate-300">{val.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">{forecastResult.forecast.lower[i].toFixed(3)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">{forecastResult.forecast.upper[i].toFixed(3)}</td>
                      {parameterLimit && (
                        <td className={`py-2 px-3 text-right font-mono ${
                          (val / parameterLimit) > 1 ? 'text-rose-500' : 
                          (val / parameterLimit) > 0.8 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {((val / parameterLimit) * 100).toFixed(1)}%
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!forecastResult && !isLoading && (
        <div className={`${styles.card} flex-1 flex items-center justify-center`}>
          <div className="text-center text-slate-400 dark:text-slate-500">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-lg font-medium">No Forecast Data</p>
            <p className="text-sm mt-1">Select a parameter and click "Run Forecast" to generate predictions</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forecast;
