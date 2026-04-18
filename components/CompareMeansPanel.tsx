import React, { useState, useMemo } from 'react';
import { runTTestIndependent, runTTestPaired, runANOVA } from '../services/statistics-service';
import { syntaxLogger } from '../services/syntax-logger';
import { useStats } from './StatsContext';
import type { TTestResult, ANOVAResult } from '../types/statistics';

interface Props {
  isDarkMode: boolean;
  dataLoaded: boolean;
}

const CompareMeansPanel: React.FC<Props> = ({ isDarkMode, dataLoaded }) => {
  const { sessionId, variables, addOutput } = useStats();
  const [testType, setTestType] = useState<'ttest_ind' | 'ttest_paired' | 'anova'>('anova');
  const [selectedDV, setSelectedDV] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [var1, setVar1] = useState<string>('');
  const [var2, setVar2] = useState<string>('');
  const [posthoc, setPosthoc] = useState<'tukey' | 'games-howell' | 'none'>('tukey');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericVars = useMemo(() => variables.filter(v => v.type === 'numeric'), [variables]);
  const factorVars = useMemo(() => variables.filter(v => v.type === 'factor'), [variables]);

  const runTest = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      if (testType === 'ttest_ind') {
        if (!selectedDV || !selectedGroup) { setError('Please select DV and Group'); setLoading(false); return; }
        const formula = `${selectedDV} ~ ${selectedGroup}`;
        const res = await runTTestIndependent(sessionId, formula);
        addOutput({ type: 'ttest', title: 'Independent T-Test', tableData: res });
        syntaxLogger.logOperation('T-Test (Independent)', { formula }, `t.test(${formula}, data = data, var.equal = TRUE)`);
      } else if (testType === 'ttest_paired') {
        if (!var1 || !var2) { setError('Please select two variables'); setLoading(false); return; }
        const res = await runTTestPaired(sessionId, var1, var2);
        addOutput({ type: 'ttest', title: 'Paired T-Test', tableData: res });
        syntaxLogger.logOperation('T-Test (Paired)', { var1, var2 }, `t.test(${var1}, ${var2}, paired = TRUE)`);
      } else {
        if (!selectedDV || !selectedGroup) { setError('Please select DV and Group'); setLoading(false); return; }
        const formula = `${selectedDV} ~ ${selectedGroup}`;
        const res = await runANOVA(sessionId, formula, posthoc);
        addOutput({ type: 'anova', title: 'One-Way ANOVA', tableData: res });
        syntaxLogger.logOperation('ANOVA', { formula, posthoc }, `summary(aov(${formula}, data = data))`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
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
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dependent Variable (numeric)</label>
              <select value={selectedDV} onChange={e => setSelectedDV(e.target.value)} className={selectStyle}>
                <option value="">Select DV...</option>
                {numericVars.map(v => (
                  <option key={v.name} value={v.name}>{v.label || v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Group Factor (category)</label>
              <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className={selectStyle}>
                <option value="">Select Group...</option>
                {factorVars.map(v => (
                  <option key={v.name} value={v.name}>{v.label || v.name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Variable 1</label>
              <select value={var1} onChange={e => setVar1(e.target.value)} className={selectStyle}>
                <option value="">Select...</option>
                {numericVars.map(v => (
                  <option key={v.name} value={v.name}>{v.label || v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Variable 2</label>
              <select value={var2} onChange={e => setVar2(e.target.value)} className={selectStyle}>
                <option value="">Select...</option>
                {numericVars.map(v => (
                  <option key={v.name} value={v.name}>{v.label || v.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {testType === 'anova' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Post-Hoc Test</label>
            <select value={posthoc} onChange={e => setPosthoc(e.target.value as typeof posthoc)} className={selectStyle}>
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
    </div>
  );
};

export default CompareMeansPanel;
