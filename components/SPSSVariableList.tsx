import React, { useState, useMemo } from 'react';
import type { VariableInfo } from '../types/statistics';

export interface SPSSVariableListProps {
  isDarkMode: boolean;
  selectedVariables: string[];
  onVarSelect: (varName: string, multi: boolean) => void;
  variables?: VariableInfo[];
}

const TYPE_BADGE_CLASSES: Record<string, string> = {
  numeric: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  factor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400 border border-violet-200 dark:border-violet-800',
  character: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  date: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800',
};

const VariableList: React.FC<SPSSVariableListProps> = ({
  isDarkMode,
  selectedVariables,
  onVarSelect,
  variables = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVariables = useMemo(() => {
    if (!searchTerm.trim()) return variables;
    const term = searchTerm.toLowerCase();
    return variables.filter(
      (v) =>
        v.name.toLowerCase().includes(term) ||
        v.label.toLowerCase().includes(term)
    );
  }, [variables, searchTerm]);

  const bgColor = isDarkMode ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDarkMode ? 'border-slate-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-slate-200' : 'text-slate-700';
  const mutedText = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const headerBg = isDarkMode ? 'bg-slate-900' : 'bg-slate-50';
  const hoverBg = isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100';
  const selectedBg = isDarkMode ? 'bg-blue-900/40 border-blue-500' : 'bg-blue-50 border-blue-500';
  const itemBg = isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50/50';

  const handleVarClick = (varName: string, e: React.MouseEvent) => {
    onVarSelect(varName, e.ctrlKey || e.metaKey);
  };

  return (
    <div className={`flex flex-col h-full ${bgColor} rounded-lg border ${borderColor} shadow-sm transition-colors duration-300`}>
      {/* Header */}
      <div className={`px-3 py-2 border-b ${borderColor} ${headerBg}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-semibold ${textColor}`}>Variables</span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
            {variables.length}
          </span>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search variables..."
          className={`w-full px-2 py-1.5 text-xs rounded border ${
            isDarkMode
              ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500'
              : 'bg-white border-slate-300 text-slate-700 placeholder-slate-400'
          } focus:outline-none focus:ring-1 focus:ring-blue-500`}
        />
      </div>

      {/* Variable list */}
      <div className="flex-1 overflow-y-auto">
        {filteredVariables.length === 0 ? (
          <div className={`flex items-center justify-center h-full text-sm italic ${mutedText}`}>
            {variables.length === 0 ? 'No variables' : 'No matches found'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredVariables.map((variable) => {
              const isSelected = selectedVariables.includes(variable.name);
              return (
                <div
                  key={variable.name}
                  onClick={(e) => handleVarClick(variable.name, e)}
                  className={`
                    px-3 py-2 cursor-pointer transition-colors
                    ${hoverBg}
                    ${isSelected ? selectedBg : itemBg}
                    border-l-2 ${
                      isSelected
                        ? 'border-blue-500'
                        : 'border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${textColor}`}>
                          {variable.label}
                        </span>
                      </div>
                      <div className={`text-xs ${mutedText} truncate`}>
                        {variable.name}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded font-mono uppercase tracking-wider ${
                          TYPE_BADGE_CLASSES[variable.type] || TYPE_BADGE_CLASSES.numeric
                        }`}
                      >
                        {variable.type}
                      </span>
                      {variable.missing_count > 0 && (
                        <span className={`text-[10px] ${mutedText}`}>
                          {variable.missing_count} missing
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className={`px-3 py-2 border-t ${borderColor} ${headerBg}`}>
        <span className={`text-[10px] ${mutedText}`}>
          Click to select, Ctrl+click for multi-select
        </span>
      </div>
    </div>
  );
};

export default VariableList;