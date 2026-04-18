import React, { useState, useMemo } from 'react';
import type { VariableInfo, TTestResult } from '../../types/statistics';
import { runTTestIndependent, runTTestPaired } from '../../services/statistics-service';
import { useStats } from '../StatsContext';

interface TTestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  variables: VariableInfo[];
  selectedVariables: string[];
  onRun: (result: TTestResult) => void;
}

type TTestType = 'independent' | 'paired';

const TTestDialog: React.FC<TTestDialogProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  variables,
  selectedVariables,
  onRun,
}) => {
  const [testType, setTestType] = useState<TTestType>('independent');
  const [testVariable, setTestVariable] = useState<string>(selectedVariables[0] || '');
  const [groupVariable, setGroupVariable] = useState<string>('');
  const [pairVar1, setPairVar1] = useState<string>('');
  const [pairVar2, setPairVar2] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sessionId } = useStats();

  const numericVars = useMemo(() => variables.filter(v => v.type === 'numeric'), [variables]);
  const factorVars = useMemo(() => variables.filter(v => v.type === 'factor'), [variables]);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      let result: TTestResult;

      if (testType === 'independent') {
        if (!testVariable || !groupVariable) {
          setError('Please select a test variable and group variable');
          setLoading(false);
          return;
        }
        const formula = `${testVariable} ~ ${groupVariable}`;
        result = await runTTestIndependent(sessionId, formula);
      } else {
        if (!pairVar1 || !pairVar2) {
          setError('Please select two variables for paired t-test');
          setLoading(false);
          return;
        }
        result = await runTTestPaired(sessionId, pairVar1, pairVar2);
      }

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">T-Test</h2>
        </div>

        {/* Test Type Toggle */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide text-xs">
            Test Type
          </label>
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
            <button
              onClick={() => setTestType('independent')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                testType === 'independent'
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Independent
            </button>
            <button
              onClick={() => setTestType('paired')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                testType === 'paired'
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Paired
            </button>
          </div>
        </div>

        {testType === 'independent' ? (
          <>
            {/* Test Variable */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Test Variable (Numeric)
              </label>
              <select
                value={testVariable}
                onChange={(e) => setTestVariable(e.target.value)}
                className={selectStyle}
              >
                <option value="">Select variable...</option>
                {numericVars.map(v => (
                  <option key={v.name} value={v.name}>
                    {v.label || v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Group Variable */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Grouping Variable (Factor)
              </label>
              <select
                value={groupVariable}
                onChange={(e) => setGroupVariable(e.target.value)}
                className={selectStyle}
              >
                <option value="">Select group variable...</option>
                {factorVars.map(v => (
                  <option key={v.name} value={v.name}>
                    {v.label || v.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            {/* Paired Variable 1 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Variable 1
              </label>
              <select
                value={pairVar1}
                onChange={(e) => setPairVar1(e.target.value)}
                className={selectStyle}
              >
                <option value="">Select variable...</option>
                {numericVars.map(v => (
                  <option key={v.name} value={v.name}>
                    {v.label || v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Paired Variable 2 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Variable 2
              </label>
              <select
                value={pairVar2}
                onChange={(e) => setPairVar2(e.target.value)}
                className={selectStyle}
              >
                <option value="">Select variable...</option>
                {numericVars.map(v => (
                  <option key={v.name} value={v.name}>
                    {v.label || v.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

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

export default TTestDialog;