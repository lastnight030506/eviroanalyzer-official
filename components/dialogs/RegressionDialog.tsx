import React, { useState, useMemo } from 'react';
import type { VariableInfo, LinearRegressionResult, LogisticRegressionResult } from '../../types/statistics';
import { runLinearRegression, runLogisticRegression } from '../../services/statistics-service';
import { useStats } from '../StatsContext';

interface RegressionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  variables: VariableInfo[];
  selectedVariables: string[];
  onRunLinear: (result: LinearRegressionResult) => void;
  onRunLogistic: (result: LogisticRegressionResult) => void;
}

type RegressionType = 'linear' | 'logistic';

const RegressionDialog: React.FC<RegressionDialogProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  variables,
  selectedVariables,
  onRunLinear,
  onRunLogistic,
}) => {
  const [regressionType, setRegressionType] = useState<RegressionType>('linear');
  const [dependentVar, setDependentVar] = useState<string>(selectedVariables[0] || '');
  const [independentVars, setIndependentVars] = useState<string[]>(selectedVariables.slice(1));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sessionId } = useStats();

  const numericVars = useMemo(() => variables.filter(v => v.type === 'numeric'), [variables]);
  const factorVars = useMemo(() => variables.filter(v => v.type === 'factor'), [variables]);

  // For logistic regression, dependent must be binary factor
  const dependentVars = regressionType === 'logistic'
    ? factorVars.filter(v => v.levels && v.levels.length === 2)
    : numericVars;

  const independentOptions = regressionType === 'linear' ? numericVars : [...numericVars, ...factorVars];

  const toggleIndependent = (name: string) => {
    setIndependentVars(prev =>
      prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]
    );
  };

  const handleRun = async () => {
    if (!dependentVar) {
      setError('Please select a dependent variable');
      return;
    }
    if (independentVars.length === 0) {
      setError('Please select at least one independent variable');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const predictors = independentVars.join(' + ');
      const formula = `${dependentVar} ~ ${predictors}`;

      if (regressionType === 'linear') {
        const result = await runLinearRegression(sessionId, formula);
        onRunLinear(result);
      } else {
        const result = await runLogisticRegression(sessionId, formula);
        onRunLogistic(result);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = `bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-emerald-500/10 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-emerald-100 dark:border-emerald-900/50`;
  const selectStyle = `w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-150`;
  const labelStyle = `flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30`;

  return isOpen ? (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-dialog-backdrop">
      <div className={`${cardStyle} animate-dialog-content`}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Regression</h2>
        </div>

        {/* Regression Type Toggle */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Regression Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setRegressionType('linear')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                regressionType === 'linear'
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Linear
            </button>
            <button
              onClick={() => setRegressionType('logistic')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                regressionType === 'logistic'
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Logistic
            </button>
          </div>
        </div>

        {/* Dependent Variable */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Dependent Variable
          </label>
          <select
            value={dependentVar}
            onChange={(e) => setDependentVar(e.target.value)}
            className={selectStyle}
          >
            <option value="">Select variable...</option>
            {dependentVars.map(v => (
              <option key={v.name} value={v.name}>
                {v.label || v.name}
              </option>
            ))}
          </select>
          {regressionType === 'logistic' && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              For logistic: binary factor (2 levels) required
            </p>
          )}
        </div>

        {/* Independent Variables */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Independent Variables
          </label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded-lg p-2">
            {independentOptions.map(v => (
              <label key={v.name} className={labelStyle}>
                <input
                  type="checkbox"
                  checked={independentVars.includes(v.name)}
                  onChange={() => toggleIndependent(v.name)}
                  className="rounded text-emerald-500"
                />
                <span className="text-sm">{v.label || v.name}</span>
              </label>
            ))}
            {independentOptions.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">No variables available</p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-150 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold shadow-lg shadow-emerald-500/30 transition-all duration-150 active:scale-95 disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running...
              </span>
            ) : 'Run Analysis'}
          </button>
        </div>
      </div>
    </div>
  ) : null;
};

export default RegressionDialog;