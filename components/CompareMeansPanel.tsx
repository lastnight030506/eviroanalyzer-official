import React, { useState, useMemo } from 'react';
import { runTTestIndependent, runTTestPaired, runANOVA } from '../services/statistics-service';
import { syntaxLogger } from '../services/syntax-logger';
import type { TTestResult, ANOVAResult } from '../types/statistics';

interface Props {
  isDarkMode: boolean;
  dataLoaded: boolean;
}

const CompareMeansPanel: React.FC<Props> = ({ isDarkMode, dataLoaded }) => {
  const [testType, setTestType] = useState<'ttest_ind' | 'ttest_paired' | 'anova'>('ttest_ind');
  const [formula, setFormula] = useState<string>('');
  const [var1, setVar1] = useState<string>('');
  const [var2, setVar2] = useState<string>('');
  const [posthoc, setPosthoc] = useState<'tukey' | 'games-howell' | 'none'>('tukey');
  const [result, setResult] = useState<TTestResult | ANOVAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useMemo(() => {
    const stored = localStorage.getItem('stats_session_id');
    if (stored) setSessionId(stored);
  }, []);

  const runTest = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      let res: TTestResult | ANOVAResult;
      if (testType === 'ttest_ind') {
        res = await runTTestIndependent(sessionId, formula);
        syntaxLogger.logOperation('T-Test (Independent)', { formula }, `t.test(${formula}, data = data, var.equal = TRUE)`);
      } else if (testType === 'ttest_paired') {
        res = await runTTestPaired(sessionId, var1, var2);
        syntaxLogger.logOperation('T-Test (Paired)', { var1, var2 }, `t.test(${var1}, ${var2}, paired = TRUE)`);
      } else {
        res = await runANOVA(sessionId, formula, posthoc);
        syntaxLogger.logOperation('ANOVA', { formula, posthoc }, `summary(aov(${formula}, data = data))`);
      }
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = `bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4`;
  const inputStyle = `w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent`;

  const formatP = (p: number) => {
    if (p < 0.001) return 'p < .001 ***';
    if (p < 0.01) return `p = ${p.toFixed(3)} **`;
    if (p < 0.05) return `p = ${p.toFixed(3)} *`;
    return `p = ${p.toFixed(3)}`;
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
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Statistical Tests</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <button
            onClick={() => setTestType('ttest_ind')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${testType === 'ttest_ind' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
          >
            Independent T-Test
          </button>
          <button
            onClick={() => setTestType('ttest_paired')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${testType === 'ttest_paired' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
          >
            Paired T-Test
          </button>
          <button
            onClick={() => setTestType('anova')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${testType === 'anova' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
          >
            One-Way ANOVA
          </button>
        </div>

        {testType === 'ttest_ind' || testType === 'anova' ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Formula (DV ~ IV)</label>
            <input
              type="text"
              value={formula}
              onChange={e => setFormula(e.target.value)}
              placeholder="e.g., BOD5 ~ Group"
              className={inputStyle}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Variable 1</label>
              <input type="text" value={var1} onChange={e => setVar1(e.target.value)} placeholder="e.g., Before" className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Variable 2</label>
              <input type="text" value={var2} onChange={e => setVar2(e.target.value)} placeholder="e.g., After" className={inputStyle} />
            </div>
          </div>
        )}

        {testType === 'anova' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Post-Hoc Test</label>
            <select value={posthoc} onChange={e => setPosthoc(e.target.value as typeof posthoc)} className={inputStyle}>
              <option value="tukey">Tukey HSD</option>
              <option value="games-howell">Games-Howell</option>
              <option value="none">None</option>
            </select>
          </div>
        )}

        <button
          onClick={runTest}
          disabled={loading}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? 'Running...' : 'Run Test'}
        </button>
        {error && <p className="mt-2 text-rose-500 text-sm">{error}</p>}
      </div>

      {result && (
        <div className={cardStyle}>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Results</h3>
          {'t_statistic' in result ? (
            <div className="space-y-2 text-sm">
              <p className="text-slate-700 dark:text-slate-300"><strong>Test:</strong> {(result as TTestResult).test === 'independent' ? 'Independent Samples T-Test' : 'Paired Samples T-Test'}</p>
              <p className="text-slate-700 dark:text-slate-300"><strong>t({(result as TTestResult).df})</strong> = {(result as TTestResult).t_statistic.toFixed(3)}, {formatP((result as TTestResult).p_value)}</p>
              <p className="text-slate-700 dark:text-slate-300"><strong>Mean Difference:</strong> {(result as TTestResult).mean_difference.toFixed(3)}</p>
              <p className="text-slate-700 dark:text-slate-300"><strong>95% CI:</strong> [{(result as TTestResult).ci_lower.toFixed(3)}, {(result as TTestResult).ci_upper.toFixed(3)}]</p>
              <p className="text-slate-700 dark:text-slate-300"><strong>Cohen's d:</strong> {(result as TTestResult).effect_size.toFixed(3)}</p>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-slate-700 dark:text-slate-300"><strong>F({(result as ANOVAResult).between_df}, {(result as ANOVAResult).within_df})</strong> = {(result as ANOVAResult).F_statistic.toFixed(3)}, {formatP((result as ANOVAResult).p_value)}</p>
              <p className="text-slate-700 dark:text-slate-300"><strong>Effect Size (η²):</strong> {(result as ANOVAResult).effect_size.toFixed(3)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompareMeansPanel;