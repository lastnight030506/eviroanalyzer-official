import React, { useState } from 'react';
import type { OutputItem } from './StatsContext';

interface Props {
  isDarkMode: boolean;
}

type GroupKey = 'descriptives' | 'anova' | 'ttest' | 'correlation' | 'plot' | 'regression' | 'freq';

const GROUP_LABELS: Record<GroupKey, string> = {
  descriptives: 'Descriptive Statistics',
  anova: 'One-Way ANOVA',
  ttest: 'T-Tests',
  correlation: 'Correlation',
  plot: 'Plots',
  regression: 'Regression',
  freq: 'Frequencies',
};

const GROUP_ORDER: GroupKey[] = ['descriptives', 'freq', 'anova', 'ttest', 'correlation', 'regression', 'plot'];

function groupItems(items: OutputItem[]): Record<GroupKey, OutputItem[]> {
  const groups: Record<GroupKey, OutputItem[]> = {
    descriptives: [], freq: [], anova: [], ttest: [], correlation: [], regression: [], plot: [],
  };
  for (const item of items) {
    if (groups[item.type]) {
      groups[item.type].push(item);
    } else {
      groups.plot.push(item);
    }
  }
  return groups;
}

function renderTable(data: unknown): React.ReactNode {
  if (!data) return null;

  // Check if it's an array of objects (descriptives result)
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    const first = data[0] as Record<string, unknown>;
    const keys = Object.keys(first);

    return (
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {keys.map(k => (
              <th key={k} className="px-2 py-1 text-left font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: Record<string, unknown>, i: number) => (
            <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
              {keys.map(k => (
                <td key={k} className="px-2 py-1 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  {row[k] !== null && row[k] !== undefined ? String(row[k]) : '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // Check for ANOVAResult
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if ('F_statistic' in obj) {
      return (
        <div className="space-y-1 text-xs">
          <div className="flex gap-4">
            <span><strong>F({obj.between_df}, {obj.within_df})</strong> = {Number(obj.F_statistic).toFixed(3)}</span>
            <span>p = {Number(obj.p_value) < 0.001 ? '< .001' : Number(obj.p_value).toFixed(3)}</span>
            <span><strong>η²</strong> = {Number(obj.effect_size).toFixed(3)}</span>
          </div>
          {obj.group_means && Array.isArray(obj.group_means) && (
            <table className="w-full text-xs border-collapse mt-2">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">Group</th>
                  <th className="px-2 py-1 text-left font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">N</th>
                  <th className="px-2 py-1 text-left font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">Mean</th>
                  <th className="px-2 py-1 text-left font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">SD</th>
                </tr>
              </thead>
              <tbody>
                {(obj.group_means as Array<{group: string; n: number; mean: number; sd: number} >).map((g, i) => (
                  <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-2 py-1 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{g.group}</td>
                    <td className="px-2 py-1 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{g.n}</td>
                    <td className="px-2 py-1 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{g.mean?.toFixed(3)}</td>
                    <td className="px-2 py-1 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{g.sd?.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {obj.posthoc && Array.isArray(obj.posthoc) && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Post-Hoc (Tukey HSD)</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">Comparison</th>
                    <th className="px-2 py-1 text-left font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">Diff</th>
                    <th className="px-2 py-1 text-left font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">p</th>
                    <th className="px-2 py-1 text-left font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">95% CI</th>
                  </tr>
                </thead>
                <tbody>
                  {(obj.posthoc as Array<{comparison: string; estimate: number; p_value: number; ci_lower: number; ci_upper: number}>).map((p, i) => (
                    <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-2 py-1 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{p.comparison}</td>
                      <td className="px-2 py-1 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{p.estimate?.toFixed(3)}</td>
                      <td className="px-2 py-1 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{p.p_value < 0.001 ? '< .001' : p.p_value.toFixed(3)}</td>
                      <td className="px-2 py-1 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">[{p.ci_lower?.toFixed(2)}, {p.ci_upper?.toFixed(2)}]</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if ('t_statistic' in obj) {
      return (
        <div className="space-y-1 text-xs">
          <p><strong>t({obj.df})</strong> = {Number(obj.t_statistic).toFixed(3)}, <strong>p</strong> = {Number(obj.p_value) < 0.001 ? '< .001' : Number(obj.p_value).toFixed(3)}</p>
          <p>Mean diff = {Number(obj.mean_difference).toFixed(3)}, 95% CI: [{Number(obj.ci_lower).toFixed(3)}, {Number(obj.ci_upper).toFixed(3)}]</p>
          <p>Effect size (d) = {Number(obj.effect_size).toFixed(3)}</p>
        </div>
      );
    }
  }

  return null;
}

const OutputViewer: React.FC<Props> = ({ isDarkMode }) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<GroupKey>>(new Set());
  const [items, setItems] = useState<OutputItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);

  // We can't directly use StatsContext here since this would cause circular deps
  // Instead, listen to localStorage changes for output items
  React.useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem('stats_output_items');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setItems(parsed);
        }
      } catch { /* ignore */ }
    };
    handleStorage();
    window.addEventListener('storage', handleStorage);
    // Also poll since other components update state directly
    const interval = setInterval(handleStorage, 500);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const toggleGroup = (group: GroupKey) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      localStorage.setItem('stats_output_items', JSON.stringify(next));
      return next;
    });
  };

  const clearAll = () => {
    setItems([]);
    localStorage.removeItem('stats_output_items');
  };

  const groups = groupItems(items);
  const hasItems = items.length > 0;

  const panelBg = isDarkMode ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDarkMode ? 'border-slate-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-slate-200' : 'text-slate-700';
  const mutedText = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const headerBg = isDarkMode ? 'bg-slate-900' : 'bg-slate-50';
  const itemBg = isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50/50';

  return (
    <div className={`flex flex-col h-full ${panelBg} rounded-lg border ${borderColor} shadow-sm transition-colors duration-300`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${borderColor} ${headerBg}`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${textColor}`}>Output</span>
          {hasItems && (
            <span className={`px-1.5 py-0.5 text-xs rounded font-mono ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
              {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasItems && (
            <button
              onClick={clearAll}
              className={`px-2 py-1 text-xs rounded hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition-colors`}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasItems ? (
          <div className={`flex items-center justify-center h-full text-sm italic ${mutedText}`}>
            Run an analysis to see results here
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {GROUP_ORDER.map(groupKey => {
              const groupItems = groups[groupKey];
              if (groupItems.length === 0) return null;
              const isCollapsed = collapsedGroups.has(groupKey);

              return (
                <div key={groupKey}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-semibold ${textColor} ${headerBg} hover:${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'} transition-colors`}
                  >
                    <span className={`w-4 h-4 flex items-center justify-center text-xs ${isCollapsed ? 'rotate-90' : ''} transition-transform`}>
                      ▶
                    </span>
                    {GROUP_LABELS[groupKey]}
                    <span className={`ml-auto text-xs ${mutedText}`}>{groupItems.length}</span>
                  </button>

                  {/* Group items */}
                  {!isCollapsed && groupItems.map(item => (
                    <div key={item.id} className={`px-3 py-2 ${itemBg} border-l-2 border-emerald-500`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.title}</span>
                          <span className={`text-xs ${mutedText}`}>{item.timestamp}</span>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className={`text-xs ${mutedText} hover:text-rose-500 transition-colors`}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                      {item.plotHtml ? (
                        <div
                          className="mt-1 overflow-auto"
                          style={{ maxHeight: '400px' }}
                          dangerouslySetInnerHTML={{ __html: item.plotHtml }}
                        />
                      ) : item.tableData ? (
                        <div className="mt-1 overflow-auto">{renderTable(item.tableData)}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputViewer;
