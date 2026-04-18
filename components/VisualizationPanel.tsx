import React, { useState, useMemo } from 'react';
import { generatePlot } from '../services/statistics-service';
import { syntaxLogger } from '../services/syntax-logger';
import { useStats } from './StatsContext';

interface Props {
  isDarkMode: boolean;
  dataLoaded: boolean;
}

const VisualizationPanel: React.FC<Props> = ({ isDarkMode, dataLoaded }) => {
  const { sessionId, variables, addOutput } = useStats();
  const [plotType, setPlotType] = useState<'histogram' | 'boxplot' | 'scatter' | 'bar'>('histogram');
  const [xVar, setXVar] = useState<string>('');
  const [yVar, setYVar] = useState<string>('');
  const [groupBy, setGroupBy] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericVars = useMemo(() => variables.filter(v => v.type === 'numeric'), [variables]);
  const factorVars = useMemo(() => variables.filter(v => v.type === 'factor'), [variables]);

  const runPlot = async () => {
    if (!sessionId || !xVar) return;
    setLoading(true);
    setError(null);
    try {
      const res = await generatePlot(sessionId, plotType, xVar, yVar || undefined, groupBy || undefined);
      addOutput({
        type: 'plot',
        title: `${plotType.charAt(0).toUpperCase() + plotType.slice(1)}: ${xVar}${groupBy ? ` by ${groupBy}` : ''}`,
        plotHtml: res.html_content,
      });
      syntaxLogger.logOperation('Plot', { plot_type: plotType, x_var: xVar, y_var: yVar, group_by: groupBy },
        `ggplot(data, aes(${plotType === 'scatter' ? `x=${xVar}, y=${yVar}` : `x=${xVar}`})) + geom_${plotType}()`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Plot failed');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = `bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4`;
  const inputStyle = `w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent`;
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
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Interactive Visualization</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {(['histogram', 'boxplot', 'scatter', 'bar'] as const).map(type => (
            <button
              key={type}
              onClick={() => setPlotType(type)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${plotType === type ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {plotType === 'scatter' ? 'X Variable' : 'Variable'}
            </label>
            <select
              value={xVar}
              onChange={e => setXVar(e.target.value)}
              className={selectStyle}
            >
              <option value="">Select variable...</option>
              {numericVars.map(v => (
                <option key={v.name} value={v.name}>{v.label || v.name}</option>
              ))}
            </select>
          </div>
          {plotType === 'scatter' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Y Variable</label>
              <select
                value={yVar}
                onChange={e => setYVar(e.target.value)}
                className={selectStyle}
              >
                <option value="">Select variable...</option>
                {numericVars.map(v => (
                  <option key={v.name} value={v.name}>{v.label || v.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Group By (optional)</label>
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value)}
              className={selectStyle}
            >
              <option value="">None</option>
              {factorVars.map(v => (
                <option key={v.name} value={v.name}>{v.label || v.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={runPlot}
          disabled={loading || !xVar}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? 'Generating...' : 'Generate Plot'}
        </button>
        {error && <p className="mt-2 text-rose-500 text-sm">{error}</p>}
      </div>
    </div>
  );
};

export default VisualizationPanel;
