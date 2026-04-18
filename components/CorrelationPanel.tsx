import React, { useState, useMemo } from 'react';
import { runCorrelation } from '../services/statistics-service';
import { syntaxLogger } from '../services/syntax-logger';
import { useStats } from './StatsContext';
import type { CorrelationResult } from '../types/statistics';

interface Props {
  isDarkMode: boolean;
  dataLoaded: boolean;
}

const CorrelationPanel: React.FC<Props> = ({ isDarkMode, dataLoaded }) => {
  const { sessionId, variables, addOutput } = useStats();
  const [selectedVars, setSelectedVars] = useState<string[]>([]);
  const [method, setMethod] = useState<'pearson' | 'spearman'>('pearson');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericVars = useMemo(() => variables.filter(v => v.type === 'numeric'), [variables]);

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
      const tableData = res.matrix.map(entry => ({
        'Variable 1': entry.var1,
        'Variable 2': entry.var2,
        r: entry.correlation.toFixed(3),
        p: entry.p_value < 0.001 ? '< .001' : entry.p_value.toFixed(3),
      }));
      addOutput({ type: 'correlation', title: `Correlation Matrix (${method.charAt(0).toUpperCase() + method.slice(1)})`, tableData });
      syntaxLogger.logOperation('Correlation', { variables: selectedVars, method },
        `psych::corr.test(data[c("${selectedVars.join('", "')}")], method = "${method}")`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = `bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4`;

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
            <select
              value={method}
              onChange={e => setMethod(e.target.value as typeof method)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none"
            >
              <option value="pearson">Pearson</option>
              <option value="spearman">Spearman</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Variables (2+)</label>
            <p className="text-xs text-slate-500 dark:text-slate-400">Click to toggle, select at least 2</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4 max-h-40 overflow-y-auto">
          {numericVars.map(v => (
            <label key={v.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors border border-slate-200 dark:border-slate-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
              <input
                type="checkbox"
                checked={selectedVars.includes(v.name)}
                onChange={() => toggleVar(v.name)}
                className="rounded text-emerald-500"
              />
              <span className="text-slate-700 dark:text-slate-300">{v.label || v.name}</span>
            </label>
          ))}
          {numericVars.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">No numeric variables loaded</p>
          )}
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
    </div>
  );
};

export default CorrelationPanel;
