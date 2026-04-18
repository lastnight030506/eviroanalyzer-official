import React, { useState, useMemo } from 'react';
import type { VariableInfo, PlotResult } from '../../types/statistics';
import { generatePlot } from '../../services/statistics-service';
import { useStats } from '../StatsContext';

interface PlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  variables: VariableInfo[];
  selectedVariables: string[];
  onRun: (result: PlotResult) => void;
}

type PlotType = 'histogram' | 'boxplot' | 'scatter' | 'bar';

const PlotDialog: React.FC<PlotDialogProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  variables,
  selectedVariables,
  onRun,
}) => {
  const [plotType, setPlotType] = useState<PlotType>('histogram');
  const [xVar, setXVar] = useState<string>(selectedVariables[0] || '');
  const [yVar, setYVar] = useState<string>('');
  const [colorVar, setColorVar] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sessionId } = useStats();

  const numericVars = useMemo(() => variables.filter(v => v.type === 'numeric'), [variables]);
  const factorVars = useMemo(() => variables.filter(v => v.type === 'factor'), [variables]);
  const allVars = useMemo(() => [...numericVars, ...factorVars], [numericVars, factorVars]);

  // Determine which variables are suitable for each axis
  const needsNumericY = plotType === 'scatter' || plotType === 'bar';
  const yVarOptions = needsNumericY ? numericVars : allVars;

  const handleRun = async () => {
    if (!xVar) {
      setError('Please select an X variable');
      return;
    }
    if (needsNumericY && !yVar) {
      setError(`Please select a Y variable for ${plotType}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await generatePlot(sessionId, plotType, xVar, yVar || undefined, colorVar || undefined);
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Generate Plot</h2>
        </div>

        {/* Plot Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Plot Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['histogram', 'boxplot', 'scatter', 'bar'] as PlotType[]).map(type => (
              <button
                key={type}
                onClick={() => {
                  setPlotType(type);
                  setYVar('');
                }}
                className={`px-3 py-2 rounded-lg capitalize transition-colors ${
                  plotType === type
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* X Variable */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            X Variable
          </label>
          <select
            value={xVar}
            onChange={(e) => setXVar(e.target.value)}
            className={selectStyle}
          >
            <option value="">Select variable...</option>
            {allVars.map(v => (
              <option key={v.name} value={v.name}>
                {v.label || v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Y Variable (for scatter/bar) */}
        {needsNumericY && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Y Variable
            </label>
            <select
              value={yVar}
              onChange={(e) => setYVar(e.target.value)}
              className={selectStyle}
            >
              <option value="">Select variable...</option>
              {yVarOptions.map(v => (
                <option key={v.name} value={v.name}>
                  {v.label || v.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Color/Group Variable */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Group By (Optional)
          </label>
          <select
            value={colorVar}
            onChange={(e) => setColorVar(e.target.value)}
            className={selectStyle}
          >
            <option value="">None</option>
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
                Generating...
              </span>
            ) : 'Generate Plot'}
          </button>
        </div>
      </div>
    </div>
  ) : null;
};

export default PlotDialog;