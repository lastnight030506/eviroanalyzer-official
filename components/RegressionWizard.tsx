import React, { useState, useMemo } from 'react';
import { runLinearRegression, runLogisticRegression } from '../services/statistics-service';
import { syntaxLogger } from '../services/syntax-logger';
import { useStats } from './StatsContext';
import type { LinearRegressionResult, LogisticRegressionResult } from '../types/statistics';

interface Props {
  isDarkMode: boolean;
  dataLoaded: boolean;
}

const RegressionWizard: React.FC<Props> = ({ isDarkMode, dataLoaded }) => {
  const { sessionId, variables, addOutput } = useStats();
  const [regType, setRegType] = useState<'linear' | 'logistic'>('linear');
  const [selectedDV, setSelectedDV] = useState<string>('');
  const [selectedIVs, setSelectedIVs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericVars = useMemo(() => variables.filter(v => v.type === 'numeric'), [variables]);
  const factorVars = useMemo(() => variables.filter(v => v.type === 'factor'), [variables]);
  const allVars = useMemo(() => [...numericVars, ...factorVars], [numericVars, factorVars]);

  const toggleIV = (name: string) => {
    setSelectedIVs(prev =>
      prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]
    );
  };

  const runReg = async () => {
    if (!sessionId || !selectedDV || selectedIVs.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const formula = `${selectedDV} ~ ${selectedIVs.join(' + ')}`;
      if (regType === 'linear') {
        const res = await runLinearRegression(sessionId, formula);
        addOutput({ type: 'regression', title: 'Linear Regression', tableData: res });
        syntaxLogger.logOperation('Linear Regression', { formula }, `summary(lm(${formula}, data = data))`);
      } else {
        const res = await runLogisticRegression(sessionId, formula);
        addOutput({ type: 'regression', title: 'Logistic Regression', tableData: res });
        syntaxLogger.logOperation('Logistic Regression', { formula }, `summary(glm(${formula}, data = data, family = binomial()))`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regression failed');
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
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Regression Analysis</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => setRegType('linear')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${regType === 'linear' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
          >
            Linear Regression
          </button>
          <button
            onClick={() => setRegType('logistic')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${regType === 'logistic' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
          >
            Logistic Regression
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dependent Variable</label>
          <select value={selectedDV} onChange={e => setSelectedDV(e.target.value)} className={selectStyle}>
            <option value="">Select DV...</option>
            {numericVars.map(v => (
              <option key={v.name} value={v.name}>{v.label || v.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Independent Variables (select 1+)</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {allVars.map(v => (
              <label key={v.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors border border-slate-200 dark:border-slate-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                <input
                  type="checkbox"
                  checked={selectedIVs.includes(v.name)}
                  onChange={() => toggleIV(v.name)}
                  className="rounded text-emerald-500"
                />
                <span className="text-slate-700 dark:text-slate-300">{v.label || v.name}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={runReg}
          disabled={loading || !selectedDV || selectedIVs.length === 0}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? 'Running...' : 'Run Regression'}
        </button>
        {error && <p className="mt-2 text-rose-500 text-sm">{error}</p>}
      </div>
    </div>
  );
};

export default RegressionWizard;
