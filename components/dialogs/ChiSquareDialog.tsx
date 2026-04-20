import React, { useState, useMemo } from 'react';
import type { VariableInfo, ChiSquareResult } from '../../types/statistics';
import { runChiSquare } from '../../services/statistics-service';
import { useStats } from '../StatsContext';

interface ChiSquareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  variables: VariableInfo[];
  selectedVariables: string[];
  onRun: (result: ChiSquareResult) => void;
}

const ChiSquareDialog: React.FC<ChiSquareDialogProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  variables,
  selectedVariables,
  onRun,
}) => {
  const [var1, setVar1] = useState<string>(selectedVariables[0] || '');
  const [var2, setVar2] = useState<string>(selectedVariables[1] || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sessionId } = useStats();

  const factorVars = useMemo(() => variables.filter(v => v.type === 'factor' || v.type === 'character' || v.type === 'numeric'), [variables]);

  const handleRun = async () => {
    if (!var1 || !var2) {
      setError('Please select two variables');
      return;
    }
    if (var1 === var2) {
      setError('Please select two different variables');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await runChiSquare(sessionId, var1, var2);
      onRun(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = `bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-emerald-500/10 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-emerald-100 dark:border-emerald-900/50`;
  const selectStyle = `w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-150`;

  return isOpen ? (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-dialog-backdrop">
      <div className={`${cardStyle} animate-dialog-content`}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Chi-Square Test</h2>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Variable 1
          </label>
          <select
            value={var1}
            onChange={(e) => setVar1(e.target.value)}
            className={selectStyle}
          >
            <option value="">Select variable...</option>
            {factorVars.map(v => (
              <option key={v.name} value={v.name}>
                {v.label || v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Variable 2
          </label>
          <select
            value={var2}
            onChange={(e) => setVar2(e.target.value)}
            className={selectStyle}
          >
            <option value="">Select variable...</option>
            {factorVars.map(v => (
              <option key={v.name} value={v.name}>
                {v.label || v.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-150 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={loading || !var1 || !var2}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold shadow-lg shadow-emerald-500/30 transition-all duration-150 active:scale-95 disabled:shadow-none"
          >
            {loading ? 'Running...' : 'Run Analysis'}
          </button>
        </div>
      </div>
    </div>
  ) : null;
};

export default ChiSquareDialog;
