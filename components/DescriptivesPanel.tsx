import React, { useState, useMemo } from 'react';
import { getDescriptives } from '../services/statistics-service';
import { syntaxLogger } from '../services/syntax-logger';
import { useStats } from './StatsContext';
import type { ContinuousResult, VariableInfo } from '../types/statistics';

interface Props {
  isDarkMode: boolean;
  dataLoaded: boolean;
}

const DescriptivesPanel: React.FC<Props> = ({ isDarkMode, dataLoaded }) => {
  const { sessionId, variables, addOutput } = useStats();
  const [selectedVars, setSelectedVars] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericVars = useMemo(() => variables.filter(v => v.type === 'numeric'), [variables]);

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
      const results = await getDescriptives(sessionId, selectedVars);
      // Build table data from results
      const tableData = results.map(r => ({
        Variable: r.variable,
        N: r.n,
        Mean: r.mean?.toFixed(3),
        Median: r.median?.toFixed(3),
        SD: r.sd?.toFixed(3),
        Skewness: r.skewness?.toFixed(3),
        Kurtosis: r.kurtosis?.toFixed(3),
        Min: r.min?.toFixed(3),
        Max: r.max?.toFixed(3),
      }));
      addOutput({ type: 'descriptives', title: 'Descriptive Statistics', tableData });
      syntaxLogger.logOperation('Descriptives', { variables: selectedVars },
        `psych::describe(data[c("${selectedVars.join('", "')}")])`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = `bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4`;
  const selectStyle = `w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none`;

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
          onClick={runDescriptives}
          disabled={loading || selectedVars.length === 0}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? 'Running...' : 'Run Descriptive Statistics'}
        </button>
        {error && <p className="mt-2 text-rose-500 text-sm">{error}</p>}
      </div>
    </div>
  );
};

export default DescriptivesPanel;
