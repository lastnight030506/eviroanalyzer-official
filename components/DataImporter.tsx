import React, { useState, useRef } from 'react';
import { loadData } from '../services/statistics-service';
import type { VariableInfo, DataLoadResult } from '../types/statistics';

interface Props {
  isDarkMode: boolean;
  onDataLoaded: () => void;
}

const DataImporter: React.FC<Props> = ({ isDarkMode, onDataLoaded }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [variables, setVariables] = useState<VariableInfo[]>([]);
  const [selectedVar, setSelectedVar] = useState<VariableInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cardStyle = `bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4`;
  const inputStyle = `w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent`;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fileType: 'csv' | 'excel' | 'sav' = 'csv';
      if (ext === 'xlsx' || ext === 'xls') fileType = 'excel';
      else if (ext === 'sav') fileType = 'sav';

      const result = await loadData(file.path, fileType);
      setSessionId(result.session_id);
      setVariables(result.variables);
      setPreviewData(result.variables.slice(0, 10).map(v => ({ name: v.name, type: v.type })));
      onDataLoaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Variable List */}
      <div className={`${cardStyle} lg:col-span-1`}>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Variables</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {variables.map(v => (
            <button
              key={v.name}
              onClick={() => setSelectedVar(v)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedVar?.name === v.name ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
            >
              <span className="font-mono font-medium">{v.name}</span>
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{v.type}</span>
            </button>
          ))}
          {variables.length === 0 && (
            <p className="text-slate-500 dark:text-slate-400 text-sm italic">No data loaded</p>
          )}
        </div>
      </div>

      {/* Data Preview */}
      <div className={`${cardStyle} lg:col-span-2`}>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Data Preview</h3>
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.sav"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Loading...' : 'Upload File (CSV/Excel/SPSS)'}
          </button>
          {error && <p className="mt-2 text-rose-500 text-sm">{error}</p>}
        </div>
        {sessionId && (
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Session: <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{sessionId}</code>
            <span className="ml-4">{variables.length} variables</span>
          </div>
        )}
        {/* Variable Properties */}
        {selectedVar && (
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Properties: {selectedVar.name}</h4>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-500 dark:text-slate-400">Type:</dt>
              <dd className="text-slate-800 dark:text-slate-200 font-mono">{selectedVar.type}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Label:</dt>
              <dd className="text-slate-800 dark:text-slate-200">{selectedVar.label || '(none)'}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Missing:</dt>
              <dd className="text-slate-800 dark:text-slate-200">{selectedVar.missing_count}</dd>
              {selectedVar.levels && (
                <>
                  <dt className="text-slate-500 dark:text-slate-400">Levels:</dt>
                  <dd className="text-slate-800 dark:text-slate-200">{selectedVar.levels.join(', ')}</dd>
                </>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataImporter;