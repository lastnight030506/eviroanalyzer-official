import React, { useState, useMemo } from 'react';
import type { VariableInfo, CorrelationResult } from '../../types/statistics';
import { runCorrelation } from '../../services/statistics-service';
import { useStats } from '../StatsContext';

interface CorrelationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  variables: VariableInfo[];
  selectedVariables: string[];
  onRun: (result: CorrelationResult) => void;
}

type CorrelationMethod = 'pearson' | 'spearman';

const CorrelationDialog: React.FC<CorrelationDialogProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  variables,
  selectedVariables,
  onRun,
}) => {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedVariables.length >= 2 ? selectedVariables : []);
  const [method, setMethod] = useState<CorrelationMethod>('pearson');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sessionId } = useStats();

  const numericVars = useMemo(() => variables.filter(v => v.type === 'numeric'), [variables]);

  const toggleVar = (name: string) => {
    setLocalSelected(prev =>
      prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]
    );
  };

  const handleRun = async () => {
    if (localSelected.length < 2) {
      setError('Please select at least 2 variables');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await runCorrelation(sessionId, localSelected, method);
      onRun(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = `bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-emerald-500/10 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-emerald-100 dark:border-emerald-900/50`;
  const labelStyle = `flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30`;

  return isOpen ? (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-dialog-backdrop">
      <div className={`${cardStyle} animate-dialog-content`}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Correlation</h2>
        </div>

        {/* Variable Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Select Variables (2+ for matrix)
          </label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded-lg p-2">
            {numericVars.map(v => (
              <label key={v.name} className={labelStyle}>
                <input
                  type="checkbox"
                  checked={localSelected.includes(v.name)}
                  onChange={() => toggleVar(v.name)}
                  className="rounded text-emerald-500"
                />
                <span className="text-sm">{v.label || v.name}</span>
              </label>
            ))}
            {numericVars.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">No numeric variables</p>
            )}
          </div>
        </div>

        {/* Method Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Correlation Method
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setMethod('pearson')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                method === 'pearson'
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Pearson
            </button>
            <button
              onClick={() => setMethod('spearman')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                method === 'spearman'
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Spearman
            </button>
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
            disabled={loading || localSelected.length < 2}
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

export default CorrelationDialog;