import React, { useState, useMemo } from 'react';
import { runCorrelation } from '../services/statistics-service';
import { syntaxLogger } from '../services/syntax-logger';
import type { CorrelationResult } from '../types/statistics';

interface Props {
  isDarkMode: boolean;
  dataLoaded: boolean;
}

const CorrelationPanel: React.FC<Props> = ({ isDarkMode, dataLoaded }) => {
  const [selectedVars, setSelectedVars] = useState<string[]>([]);
  const [method, setMethod] = useState<'pearson' | 'spearman'>('pearson');
  const [result, setResult] = useState<CorrelationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useMemo(() => {
    const stored = localStorage.getItem('stats_session_id');
    if (stored) setSessionId(stored);
  }, []);

  const toggleVar = (name: string) => {
    setSelectedVars(prev =>
      prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]
    );
  };

  const runCorr = async () => {
    if (!sessionId || selectedVars.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await runCorrelation(sessionId, selectedVars, method);
      setResult(res);
      syntaxLogger.logOperation('Correlation', { variables: selectedVars, method },
        `psych::corr.test(data[c("${selectedVars.join('", "')}")], method = "${method}")`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = `bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4`;
  const inputStyle = `w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent`;

  const formatR = (r: number) => {
    const stars = Math.abs(r) >= 0.7 ? '***' : Math.abs(r) >= 0.5 ? '**' : Math.abs(r) >= 0.3 ? '*' : '';
    return `${r.toFixed(3)}${stars}`;
  };

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
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Correlation Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Method</label>
            <select value={method} onChange={e => setMethod(e.target.value as typeof method)} className={inputStyle}>
              <option value="pearson">Pearson</option>
              <option value="spearman">Spearman</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Variables (select 2+)</label>
            <p className="text-xs text-slate-500 dark:text-slate-400">Use Data tab to view available variables</p>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Variable Names (comma-separated)</label>
          <input
            type="text"
            value={selectedVars.join(', ')}
            onChange={e => setSelectedVars(e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
            placeholder="e.g., BOD5, COD, pH, DO"
            className={inputStyle}
          />
        </div>
        <button
          onClick={runCorr}
          disabled={loading || selectedVars.length < 2}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? 'Running...' : 'Run Correlation'}
        </button>
        {error && <p className="mt-2 text-rose-500 text-sm">{error}</p>}
      </div>

      {result && (
        <div className={cardStyle}>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
            Correlation Matrix ({method.charAt(0).toUpperCase() + method.slice(1)})
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">n = {result.n_obs}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900">Variable 1</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900">Variable 2</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900">r</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900">p-value</th>
                </tr>
              </thead>
              <tbody>
                {result.matrix.map((entry, i) => (
                  <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300 font-mono">{entry.var1}</td>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300 font-mono">{entry.var2}</td>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{formatR(entry.correlation)}</td>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{entry.p_value < 0.001 ? '< .001' : entry.p_value.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">* p &lt; .05, ** p &lt; .01, *** p &lt; .001</p>
        </div>
      )}
    </div>
  );
};

export default CorrelationPanel;