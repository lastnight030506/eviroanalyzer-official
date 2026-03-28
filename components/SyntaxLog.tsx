import React, { useState } from 'react';
import { syntaxLogger } from '../services/syntax-logger';
import type { SyntaxEntry } from '../services/syntax-logger';

interface Props {
  isDarkMode: boolean;
}

const SyntaxLog: React.FC<Props> = ({ isDarkMode }) => {
  const [log, setLog] = useState<SyntaxEntry[]>([]);

  const refreshLog = () => {
    setLog(syntaxLogger.getLog());
  };

  const exportScript = () => {
    const script = syntaxLogger.generateScript();
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analysis_script.R';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    const script = syntaxLogger.generateScript();
    navigator.clipboard.writeText(script);
  };

  const cardStyle = `bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4`;
  const codeStyle = `font-mono text-sm bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto`;

  return (
    <div className="space-y-4">
      <div className={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">R Syntax Log</h3>
          <div className="flex gap-2">
            <button
              onClick={refreshLog}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={copyToClipboard}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm transition-colors"
            >
              Copy
            </button>
            <button
              onClick={exportScript}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm transition-colors"
            >
              Export .R
            </button>
            <button
              onClick={() => { syntaxLogger.clearLog(); setLog([]); }}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          This log records all R commands generated from your analysis actions. Export to reproduce your analysis in R.
        </p>
      </div>

      <div className={cardStyle}>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Generated R Code ({log.length} operations)
        </h4>
        {log.length === 0 ? (
          <div className={`${codeStyle} text-slate-500 text-center py-8`}>
            No operations recorded yet. Start analyzing data to generate R syntax.
          </div>
        ) : (
          <pre className={codeStyle}>
            {log.map((entry, i) => (
              <div key={i} className="mb-4">
                <span className="text-slate-500"># {entry.procedure} - {entry.timestamp.toLocaleString()}</span>
                {'\n'}
                <span className="text-emerald-400">{entry.rCode}</span>
              </div>
            ))}
          </pre>
        )}
      </div>
    </div>
  );
};

export default SyntaxLog;