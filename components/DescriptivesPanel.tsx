import React, { useState, useMemo } from 'react';
import { getDescriptives, getFrequencies } from '../services/statistics-service';
import { syntaxLogger } from '../services/syntax-logger';
import type { ContinuousResult, FrequencyResult, VariableInfo } from '../types/statistics';

interface Props {
  isDarkMode: boolean;
  dataLoaded: boolean;
}

const DescriptivesPanel: React.FC<Props> = ({ isDarkMode, dataLoaded }) => {
  const [selectedVars, setSelectedVars] = useState<string[]>([]);
  const [results, setResults] = useState<ContinuousResult[]>([]);
  const [freqResults, setFreqResults] = useState<FrequencyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  // Get session ID from localStorage (set by DataImporter)
  useMemo(() => {
    const stored = localStorage.getItem('stats_session_id');
    if (stored) setSessionId(stored);
  }, []);

  const toggleVar = (name: string) => {
    setSelectedVars(prev =>
      prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]
    );
  };

  const runDescriptives = async () => {
    if (!sessionId || selectedVars.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const numericVars = selectedVars;
      const results = await getDescriptives(sessionId, numericVars);
      setResults(results);
      syntaxLogger.logOperation('Descriptives', { variables: numericVars },
        `psych::describe(data[c("${numericVars.join('", "')}")])`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = `bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4`;
  const thStyle = `px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900`;
  const tdStyle = `px-4 py-2 text-sm text-slate-700 dark:text-slate-300`;

  if (!dataLoaded) {
    return (
      <div className={`${cardStyle} text-center py-8`}>
        <p className="text-slate-500 dark:text-slate-400">Please load data first in the Data tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cardStyle}>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Select Variables</h3>
        <div className="flex gap-2 flex-wrap mb-4">
          {selectedVars.map(v => (
            <span key={v} className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full text-sm">
              {v}
            </span>
          ))}
        </div>
        <button
          onClick={runDescriptives}
          disabled={loading || selectedVars.length === 0}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? 'Running...' : 'Run Descriptive Statistics'}
        </button>
        {error && <p className="mt-2 text-rose-500 text-sm">{error}</p>}
      </div>

      {results.length > 0 && (
        <div className={cardStyle}>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Descriptive Statistics</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thStyle}>Variable</th>
                  <th className={thStyle}>N</th>
                  <th className={thStyle}>Mean</th>
                  <th className={thStyle}>Median</th>
                  <th className={thStyle}>SD</th>
                  <th className={thStyle}>Skewness</th>
                  <th className={thStyle}>Kurtosis</th>
                  <th className={thStyle}>Min</th>
                  <th className={thStyle}>Max</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.variable} className="border-t border-slate-200 dark:border-slate-700">
                    <td className={`${tdStyle} font-mono font-medium`}>{r.variable}</td>
                    <td className={tdStyle}>{r.n}</td>
                    <td className={tdStyle}>{r.mean?.toFixed(3)}</td>
                    <td className={tdStyle}>{r.median?.toFixed(3)}</td>
                    <td className={tdStyle}>{r.sd?.toFixed(3)}</td>
                    <td className={tdStyle}>{r.skewness?.toFixed(3)}</td>
                    <td className={tdStyle}>{r.kurtosis?.toFixed(3)}</td>
                    <td className={tdStyle}>{r.min?.toFixed(3)}</td>
                    <td className={tdStyle}>{r.max?.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DescriptivesPanel;