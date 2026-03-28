import React, { useState, useRef, useMemo, useCallback } from 'react';
import type { SampleRow, QCVNStandard } from '../types';
import type {
  VariableMapping,
  CleaningOperation,
  CleaningConfig,
  QCVNParameterRef,
  RawDataRow
} from '../types/statistics';
import {
  loadDataFull,
  cleanData,
  mapToSampleRows,
  autoMapVariables,
  getQCVNParameterRefs
} from '../services/data-import-service';
import { STANDARDS } from '../constants';

// Wizard steps
type WizardStep = 'IDLE' | 'PREVIEW' | 'MAPPING' | 'CLEANING' | 'READY';

interface DataImporterProps {
  isDarkMode: boolean;
  selectedStandard?: QCVNStandard | null;
  onDataImported?: (data: SampleRow[], sampleColumns: string[]) => void;
  onDataLoaded?: () => void;
}

// Helper to detect file type
function detectFileType(filename: string): 'csv' | 'excel' | 'sav' {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return 'excel';
  if (ext === 'sav') return 'sav';
  return 'csv';
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DataImporter: React.FC<DataImporterProps> = ({
  isDarkMode,
  selectedStandard,
  onDataImported,
  onDataLoaded
}) => {
  // Wizard state
  const [step, setStep] = useState<WizardStep>('IDLE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'excel' | 'sav'>('csv');

  // Data state from loadDataFull
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dataPreview, setDataPreview] = useState<RawDataRow[]>([]);
  const [allVariables, setAllVariables] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(0);

  // Mapping state
  const [mappings, setMappings] = useState<VariableMapping[]>([]);
  const [unmappedVariables, setUnmappedVariables] = useState<string[]>([]);
  const [missingQCVNParams, setMissingQCVNParams] = useState<string[]>([]);
  const [selectedMissingParams, setSelectedMissingParams] = useState<string[]>([]);
  const [qcvnParams, setQcvnParams] = useState<QCVNParameterRef[]>([]);

  // Cleaning state
  const [cleaningOps, setCleaningOps] = useState<CleaningOperation[]>([]);
  const [missingValueMethod, setMissingValueMethod] = useState<'mean' | 'median' | 'remove' | 'none'>('none');
  const [outlierThreshold, setOutlierThreshold] = useState(1.5);
  const [selectedTransformCols, setSelectedTransformCols] = useState<string[]>([]);
  const [selectedStandardizeCols, setSelectedStandardizeCols] = useState<string[]>([]);
  const [selectedNormalizeCols, setSelectedNormalizeCols] = useState<string[]>([]);

  // Sample config state
  const [samplePrefix, setSamplePrefix] = useState('Sample');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Derived: columns that are numeric (for transform/standardize/normalize)
  const numericColumns = useMemo(() => {
    if (!dataPreview.length) return [];
    const firstRow = dataPreview[0];
    return Object.entries(firstRow)
      .filter(([, v]) => typeof v === 'number')
      .map(([k]) => k);
  }, [dataPreview]);

  // Derived: preview column names with prefix
  const previewColumnNames = useMemo(() => {
    return Array.from({ length: allVariables.length }, (_, i) => `${samplePrefix}_${i + 1}`);
  }, [allVariables.length, samplePrefix]);

  // Step labels
  const stepLabels: Record<WizardStep, string> = {
    IDLE: 'Upload File',
    PREVIEW: 'Preview Data',
    MAPPING: 'Variable Mapping',
    CLEANING: 'Data Cleaning',
    READY: 'Import'
  };

  const stepIndex = Object.keys(stepLabels).indexOf(step);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setFileType(detectFileType(file.name));
    setError(null);
  }, []);

  // Handle drag/drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // Load data
  const handleLoadData = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const result = await loadDataFull(selectedFile.path, fileType);
      setSessionId(result.session_id);
      setDataPreview(result.data_preview || []);
      setAllVariables(result.variables.map(v => v.name));
      setRowCount(result.row_count);

      // Auto-get QCVN params
      const params = selectedStandard
        ? getQCVNParameterRefs(selectedStandard.id)
        : [];

      // Auto-map variables
      const autoMappings = autoMapVariables(result.variables.map(v => v.name), params);
      setMappings(autoMappings);
      setQcvnParams(params);

      // Find unmapped and missing
      const mappedVars = autoMappings.filter(m => m.qcvn_param !== null).map(m => m.imported_var);
      const unmapped = result.variables.map(v => v.name).filter(v => !mappedVars.includes(v));
      setUnmappedVariables(unmapped);

      // Find missing QCVN params
      const mappedParams = autoMappings.filter(m => m.qcvn_param !== null).map(m => m.qcvn_param);
      const missing = params.map(p => p.id).filter(id => !mappedParams.includes(id));
      setMissingQCVNParams(missing);

      setStep('PREVIEW');
      onDataLoaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Handle mapping confirmation (yes/no)
  const confirmMapping = useCallback((importedVar: string, confirmed: boolean, manualParam?: string | null) => {
    setMappings(prev => prev.map(m => {
      if (m.imported_var !== importedVar) return m;

      if (!confirmed) {
        // Rejected auto-match: set to manually selected or null (exclude)
        return {
          ...m,
          qcvn_param: manualParam ?? null,
          is_manual: true,
          confidence: manualParam ? 0 : 0
        };
      }

      return { ...m, is_manual: false };
    }));

    // Update unmapped list
    setMappings(prev => {
      const stillUnmapped = prev.filter(m => m.qcvn_param === null).map(m => m.imported_var);
      setUnmappedVariables(stillUnmapped);
      return prev;
    });
  }, []);

  // Handle manual param selection for rejected mappings
  const handleManualParamSelect = useCallback((importedVar: string, paramId: string | null) => {
    setMappings(prev => prev.map(m => {
      if (m.imported_var !== importedVar) return m;
      return {
        ...m,
        qcvn_param: paramId,
        is_manual: true,
        confidence: 0
      };
    }));

    // Update unmapped list
    setMappings(prev => {
      const stillUnmapped = prev.filter(m => m.qcvn_param === null).map(m => m.imported_var);
      setUnmappedVariables(stillUnmapped);
      return prev;
    });
  }, []);

  // Toggle missing QCVN param inclusion
  const toggleMissingParam = useCallback((paramId: string) => {
    setSelectedMissingParams(prev =>
      prev.includes(paramId)
        ? prev.filter(id => id !== paramId)
        : [...prev, paramId]
    );
  }, []);

  // Build cleaning operations from UI state
  const buildCleaningOps = useCallback((): CleaningOperation[] => {
    const ops: CleaningOperation[] = [];

    if (cleaningOps.some(op => op.op === 'remove_empty')) {
      ops.push({ op: 'remove_empty', type: 'rows' });
      ops.push({ op: 'remove_empty', type: 'cols' });
    }

    if (missingValueMethod !== 'none') {
      ops.push({
        op: 'handle_na',
        method: missingValueMethod as 'mean' | 'median' | 'remove'
      });
    }

    if (cleaningOps.some(op => op.op === 'remove_outliers')) {
      ops.push({
        op: 'remove_outliers',
        threshold: outlierThreshold
      });
    }

    if (selectedTransformCols.length > 0) {
      ops.push({
        op: 'log_transform',
        columns: selectedTransformCols
      });
    }

    if (selectedStandardizeCols.length > 0) {
      ops.push({
        op: 'standardize',
        columns: selectedStandardizeCols
      });
    }

    if (selectedNormalizeCols.length > 0) {
      ops.push({
        op: 'normalize',
        columns: selectedNormalizeCols
      });
    }

    return ops;
  }, [cleaningOps, missingValueMethod, outlierThreshold, selectedTransformCols, selectedStandardizeCols, selectedNormalizeCols]);

  // Toggle cleaning op
  const toggleCleaningOp = useCallback((opType: string, checked: boolean) => {
    setCleaningOps(prev => {
      if (checked) {
        return [...prev, { op: opType as CleaningOperation['op'] }];
      }
      return prev.filter(op => op.op !== opType);
    });
  }, []);

  // Handle import
  const handleImport = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      // Build cleaning config
      const cleaningConfig: CleaningConfig = {
        session_id: sessionId,
        operations: buildCleaningOps()
      };

      // Apply cleaning
      await cleanData(cleaningConfig);

      // Build mapping config with selected missing params added
      const finalMappings = [...mappings];
      selectedMissingParams.forEach(paramId => {
        const param = qcvnParams.find(p => p.id === paramId);
        if (param) {
          finalMappings.push({
            imported_var: `__missing_${paramId}__`,
            qcvn_param: paramId,
            confidence: 0,
            is_manual: true
          });
        }
      });

      // Map to sample rows
      const mappingConfig = {
        session_id: sessionId,
        mappings: finalMappings,
        sample_prefix: samplePrefix,
        qcvn_params: qcvnParams
      };

      const result = await mapToSampleRows(mappingConfig);

      if (onDataImported) {
        onDataImported(result.sample_rows, previewColumnNames);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  // Step progress indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {(Object.keys(stepLabels) as WizardStep[]).map((s, idx) => {
        const isActive = s === step;
        const isPast = idx < stepIndex;
        const isClickable = idx <= stepIndex && s !== 'IDLE';

        return (
          <React.Fragment key={s}>
            <button
              onClick={() => isClickable && setStep(s)}
              disabled={!isClickable}
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                transition-colors
                ${isActive ? 'bg-emerald-500 text-white' : ''}
                ${isPast ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : ''}
                ${!isActive && !isPast ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : ''}
                ${isClickable && !isActive ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900 cursor-pointer' : ''}
                ${!isClickable ? 'cursor-default' : ''}
              `}
            >
              {isPast ? '✓' : idx + 1}
            </button>
            {idx < Object.keys(stepLabels).length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${isPast ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-600'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Step 1: File Upload
  const renderFileUpload = () => (
    <div className="space-y-4">
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-colors
          ${isDarkMode
            ? 'border-slate-600 hover:border-emerald-500 bg-slate-800'
            : 'border-slate-300 hover:border-emerald-500 bg-slate-50'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.sav"
          onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
        />
        <div className="text-5xl mb-3">📁</div>
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
          Drag & drop your file here
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          or click to browse
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          Supports CSV, Excel (.xlsx, .xls), SPSS (.sav)
        </p>
      </div>

      {selectedFile && (
        <div className={`
          flex items-center justify-between p-4 rounded-lg
          ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}
        `}>
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📄</span>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {selectedFile.name}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatFileSize(selectedFile.size)} · {fileType.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFile(null);
            }}
            className="text-slate-400 hover:text-rose-500 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <p className="text-rose-500 text-sm">{error}</p>
      )}

      <button
        onClick={handleLoadData}
        disabled={!selectedFile || loading}
        className={`
          w-full py-3 rounded-lg font-medium transition-colors
          ${selectedFile && !loading
            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
            : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'}
        `}
      >
        {loading ? 'Loading...' : 'Load Data'}
      </button>
    </div>
  );

  // Step 2: Data Preview
  const renderDataPreview = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">
            Data Preview
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {rowCount.toLocaleString()} rows · {allVariables.length} variables
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium
          ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
          First 10 rows
        </span>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-600 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className={`${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
              {allVariables.map(v => (
                <th
                  key={v}
                  className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap"
                >
                  {v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataPreview.map((row, idx) => (
              <tr
                key={idx}
                className={`border-t ${isDarkMode ? 'border-slate-600' : 'border-slate-200'} ${idx % 2 === 0 ? '' : isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
              >
                {allVariables.map(v => (
                  <td
                    key={v}
                    className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap"
                  >
                    {row[v] === null ? (
                      <span className="text-slate-400 italic">null</span>
                    ) : (
                      String(row[v])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setStep('MAPPING')}
          className="flex-1 py-3 rounded-lg font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
        >
          Continue to Mapping
        </button>
        <button
          onClick={() => setStep('IDLE')}
          className={`
            px-4 py-3 rounded-lg font-medium
            ${isDarkMode
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}
            transition-colors
          `}
        >
          Back
        </button>
      </div>
    </div>
  );

  // Step 3: Variable Mapping
  const renderVariableMapping = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
          Variable Mapping
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Confirm or reject the auto-detected QCVN parameter mappings
        </p>
      </div>

      {/* Auto-mapped variables */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Imported Variables
        </h4>
        {mappings.filter(m => !m.is_manual || m.qcvn_param !== null).map(mapping => {
          const qcvnParam = qcvnParams.find(p => p.id === mapping.qcvn_param);
          const isConfirmed = mapping.qcvn_param !== null && !mapping.is_manual;

          return (
            <div
              key={mapping.imported_var}
              className={`
                p-4 rounded-lg border
                ${isConfirmed
                  ? isDarkMode
                    ? 'bg-emerald-900/20 border-emerald-700'
                    : 'bg-emerald-50 border-emerald-200'
                  : mapping.qcvn_param === null
                    ? isDarkMode
                      ? 'bg-slate-800 border-slate-600'
                      : 'bg-slate-50 border-slate-200'
                    : isDarkMode
                      ? 'bg-amber-900/20 border-amber-700'
                      : 'bg-amber-50 border-amber-200'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {mapping.imported_var}
                  </p>
                  {mapping.qcvn_param ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        → {qcvnParam?.name} ({qcvnParam?.unit})
                      </span>
                      <span className="ml-2 text-xs text-slate-400">
                        {Math.round(mapping.confidence * 100)}% confidence
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 italic">
                      Excluded from import
                    </p>
                  )}
                </div>

                {/* Yes/No buttons */}
                <div className="flex items-center space-x-2">
                  {mapping.qcvn_param !== null && (
                    <>
                      <button
                        onClick={() => confirmMapping(mapping.imported_var, true)}
                        className={`
                          px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                          ${isConfirmed
                            ? 'bg-emerald-500 text-white'
                            : isDarkMode
                              ? 'bg-slate-600 text-slate-300 hover:bg-emerald-700'
                              : 'bg-slate-200 text-slate-600 hover:bg-emerald-100'}
                        `}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => confirmMapping(mapping.imported_var, false)}
                        className={`
                          px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                          ${!isConfirmed && mapping.qcvn_param !== null
                            ? 'bg-rose-500 text-white'
                            : isDarkMode
                              ? 'bg-slate-600 text-slate-300 hover:bg-rose-700'
                              : 'bg-slate-200 text-slate-600 hover:bg-rose-100'}
                        `}
                      >
                        No
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Manual selection dropdown when rejected */}
              {!isConfirmed && mapping.qcvn_param === null && (
                <div className="mt-3 flex items-center space-x-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Map to:
                  </span>
                  <select
                    value=""
                    onChange={(e) => handleManualParamSelect(mapping.imported_var, e.target.value || null)}
                    className={`
                      flex-1 px-3 py-1.5 rounded-lg border text-sm
                      ${isDarkMode
                        ? 'bg-slate-700 border-slate-600 text-slate-200'
                        : 'bg-white border-slate-300 text-slate-700'}
                    `}
                  >
                    <option value="">-- Select Parameter --</option>
                    {qcvnParams.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </option>
                    ))}
                    <option value="__exclude__">Exclude</option>
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Missing QCVN Parameters */}
      {missingQCVNParams.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Missing QCVN Parameters
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            These QCVN parameters were not found in the imported data. Check to include as empty columns.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {missingQCVNParams.map(paramId => {
              const param = qcvnParams.find(p => p.id === paramId);
              if (!param) return null;
              return (
                <label
                  key={paramId}
                  className={`
                    flex items-center space-x-2 p-3 rounded-lg border cursor-pointer
                    ${isDarkMode
                      ? 'bg-slate-800 border-slate-600 hover:border-slate-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'}
                    ${selectedMissingParams.includes(paramId) ? 'border-emerald-500' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedMissingParams.includes(paramId)}
                    onChange={() => toggleMissingParam(paramId)}
                    className="rounded text-emerald-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {param.name}
                  </span>
                  <span className="text-xs text-slate-400">({param.unit})</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Unmapped Variables */}
      {unmappedVariables.length > 0 && (
        <div className={`
          p-4 rounded-lg border
          ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'}
        `}>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Unmapped Variables
          </h4>
          <div className="flex flex-wrap gap-2">
            {unmappedVariables.map(v => (
              <span
                key={v}
                className={`
                  px-2 py-1 rounded text-xs font-mono
                  ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}
                `}
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={() => setStep('CLEANING')}
          className="flex-1 py-3 rounded-lg font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
        >
          Continue to Cleaning
        </button>
        <button
          onClick={() => setStep('PREVIEW')}
          className={`
            px-4 py-3 rounded-lg font-medium
            ${isDarkMode
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}
            transition-colors
          `}
        >
          Back
        </button>
      </div>
    </div>
  );

  // Step 4: Cleaning Config
  const renderCleaningConfig = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
          Data Cleaning
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configure cleaning operations to apply before import
        </p>
      </div>

      {/* Basic cleaning toggles */}
      <div className="space-y-3">
        <label className={`
          flex items-center space-x-3 p-4 rounded-lg border cursor-pointer
          ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}
        `}>
          <input
            type="checkbox"
            onChange={(e) => toggleCleaningOp('remove_empty', e.target.checked)}
            className="rounded text-emerald-500"
          />
          <div>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Remove empty rows and columns
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Remove rows/columns that contain only empty values
            </p>
          </div>
        </label>

        {/* Missing values */}
        <div className={`
          p-4 rounded-lg border
          ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}
        `}>
          <div className="flex items-center space-x-3 mb-3">
            <input
              type="checkbox"
              checked={cleaningOps.some(op => op.op === 'handle_na')}
              onChange={(e) => toggleCleaningOp('handle_na', e.target.checked)}
              className="rounded text-emerald-500"
            />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Handle missing values
            </span>
          </div>
          {cleaningOps.some(op => op.op === 'handle_na') && (
            <select
              value={missingValueMethod}
              onChange={(e) => setMissingValueMethod(e.target.value as typeof missingValueMethod)}
              className={`
                w-full px-3 py-2 rounded-lg border text-sm
                ${isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-slate-200'
                  : 'bg-slate-50 border-slate-300 text-slate-700'}
              `}
            >
              <option value="none">Do nothing</option>
              <option value="mean">Replace with mean</option>
              <option value="median">Replace with median</option>
              <option value="remove">Remove rows with missing values</option>
            </select>
          )}
        </div>

        {/* Outliers */}
        <div className={`
          p-4 rounded-lg border
          ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}
        `}>
          <div className="flex items-center space-x-3 mb-3">
            <input
              type="checkbox"
              checked={cleaningOps.some(op => op.op === 'remove_outliers')}
              onChange={(e) => toggleCleaningOp('remove_outliers', e.target.checked)}
              className="rounded text-emerald-500"
            />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Remove outliers (IQR method)
            </span>
          </div>
          {cleaningOps.some(op => op.op === 'remove_outliers') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  IQR Threshold
                </span>
                <span className="text-sm font-mono text-slate-600 dark:text-slate-300">
                  {outlierThreshold.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={outlierThreshold}
                onChange={(e) => setOutlierThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>1.0 (strict)</span>
                <span>3.0 (lenient)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column transformations */}
      {numericColumns.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Column Transformations
          </h4>

          {/* Log Transform */}
          <div className={`
            p-4 rounded-lg border
            ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}
          `}>
            <label className="flex items-center space-x-3 mb-3">
              <input
                type="checkbox"
                checked={selectedTransformCols.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedTransformCols([...numericColumns]);
                  } else {
                    setSelectedTransformCols([]);
                  }
                }}
                className="rounded text-emerald-500"
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Log transform
              </span>
            </label>
            <div className="flex flex-wrap gap-2 ml-7">
              {numericColumns.map(col => (
                <label
                  key={col}
                  className={`
                    px-2 py-1 rounded text-xs cursor-pointer
                    ${selectedTransformCols.includes(col)
                      ? isDarkMode
                        ? 'bg-emerald-900 text-emerald-300'
                        : 'bg-emerald-100 text-emerald-700'
                      : isDarkMode
                        ? 'bg-slate-700 text-slate-400'
                        : 'bg-slate-100 text-slate-600'}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedTransformCols.includes(col)}
                    onChange={() => {
                      setSelectedTransformCols(prev =>
                        prev.includes(col)
                          ? prev.filter(c => c !== col)
                          : [...prev, col]
                      );
                    }}
                    className="hidden"
                  />
                  {col}
                </label>
              ))}
            </div>
          </div>

          {/* Standardize */}
          <div className={`
            p-4 rounded-lg border
            ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}
          `}>
            <label className="flex items-center space-x-3 mb-3">
              <input
                type="checkbox"
                checked={selectedStandardizeCols.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedStandardizeCols([...numericColumns]);
                  } else {
                    setSelectedStandardizeCols([]);
                  }
                }}
                className="rounded text-emerald-500"
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Standardize (z-score)
              </span>
            </label>
            <div className="flex flex-wrap gap-2 ml-7">
              {numericColumns.map(col => (
                <label
                  key={col}
                  className={`
                    px-2 py-1 rounded text-xs cursor-pointer
                    ${selectedStandardizeCols.includes(col)
                      ? isDarkMode
                        ? 'bg-emerald-900 text-emerald-300'
                        : 'bg-emerald-100 text-emerald-700'
                      : isDarkMode
                        ? 'bg-slate-700 text-slate-400'
                        : 'bg-slate-100 text-slate-600'}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedStandardizeCols.includes(col)}
                    onChange={() => {
                      setSelectedStandardizeCols(prev =>
                        prev.includes(col)
                          ? prev.filter(c => c !== col)
                          : [...prev, col]
                      );
                    }}
                    className="hidden"
                  />
                  {col}
                </label>
              ))}
            </div>
          </div>

          {/* Normalize */}
          <div className={`
            p-4 rounded-lg border
            ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}
          `}>
            <label className="flex items-center space-x-3 mb-3">
              <input
                type="checkbox"
                checked={selectedNormalizeCols.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedNormalizeCols([...numericColumns]);
                  } else {
                    setSelectedNormalizeCols([]);
                  }
                }}
                className="rounded text-emerald-500"
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Normalize (0-1 range)
              </span>
            </label>
            <div className="flex flex-wrap gap-2 ml-7">
              {numericColumns.map(col => (
                <label
                  key={col}
                  className={`
                    px-2 py-1 rounded text-xs cursor-pointer
                    ${selectedNormalizeCols.includes(col)
                      ? isDarkMode
                        ? 'bg-emerald-900 text-emerald-300'
                        : 'bg-emerald-100 text-emerald-700'
                      : isDarkMode
                        ? 'bg-slate-700 text-slate-400'
                        : 'bg-slate-100 text-slate-600'}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedNormalizeCols.includes(col)}
                    onChange={() => {
                      setSelectedNormalizeCols(prev =>
                        prev.includes(col)
                          ? prev.filter(c => c !== col)
                          : [...prev, col]
                      );
                    }}
                    className="hidden"
                  />
                  {col}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={() => setStep('READY')}
          className="flex-1 py-3 rounded-lg font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
        >
          Continue to Import
        </button>
        <button
          onClick={() => setStep('MAPPING')}
          className={`
            px-4 py-3 rounded-lg font-medium
            ${isDarkMode
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}
            transition-colors
          `}
        >
          Back
        </button>
      </div>
    </div>
  );

  // Step 5: Ready / Import
  const renderReady = () => {
    const hasUnmapped = unmappedVariables.length > 0 || mappings.some(m => m.qcvn_param === null);

    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Ready to Import
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Review your configuration and import the data
          </p>
        </div>

        {/* Summary */}
        <div className={`
          p-4 rounded-lg border
          ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}
        `}>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Import Summary
          </h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Rows:</dt>
              <dd className="text-slate-700 dark:text-slate-300">{rowCount.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Mapped variables:</dt>
              <dd className="text-slate-700 dark:text-slate-300">
                {mappings.filter(m => m.qcvn_param !== null).length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Sample prefix:</dt>
              <dd className="text-slate-700 dark:text-slate-300">{samplePrefix}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Sample columns:</dt>
              <dd className="text-slate-700 dark:text-slate-300">
                {allVariables.length > 0
                  ? `${samplePrefix}_1, ${samplePrefix}_2, ... ${samplePrefix}_${allVariables.length}`
                  : 'None'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Cleaning operations:</dt>
              <dd className="text-slate-700 dark:text-slate-300">
                {cleaningOps.length > 0
                  ? cleaningOps.map(op => op.op).join(', ')
                  : 'None'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Sample column preview */}
        <div className={`
          p-4 rounded-lg border
          ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}
        `}>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Sample Column Names Preview
          </h4>
          <div className="flex flex-wrap gap-2">
            {previewColumnNames.map((name, idx) => (
              <span
                key={idx}
                className={`
                  px-2 py-1 rounded text-xs font-mono
                  ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}
                `}
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Sample prefix config */}
        <div className={`
          p-4 rounded-lg border
          ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}
        `}>
          <label className="block mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Sample Prefix
            </span>
          </label>
          <input
            type="text"
            value={samplePrefix}
            onChange={(e) => setSamplePrefix(e.target.value)}
            placeholder="Sample"
            className={`
              w-full px-3 py-2 rounded-lg border
              ${isDarkMode
                ? 'bg-slate-700 border-slate-600 text-slate-200'
                : 'bg-white border-slate-300 text-slate-700'}
            `}
          />
        </div>

        {/* Warning for unmapped */}
        {hasUnmapped && (
          <div className={`
            p-4 rounded-lg border border-amber-300 dark:border-amber-600
            ${isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50'}
          `}>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <span className="font-medium">Warning:</span> Some variables are not mapped to QCVN parameters.
              They will be excluded from the import.
            </p>
          </div>
        )}

        {error && (
          <p className="text-rose-500 text-sm">{error}</p>
        )}

        <div className="flex space-x-3">
          <button
            onClick={handleImport}
            disabled={loading || mappings.filter(m => m.qcvn_param !== null).length === 0}
            className={`
              flex-1 py-3 rounded-lg font-medium transition-colors
              ${mappings.filter(m => m.qcvn_param !== null).length > 0 && !loading
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-slate-300 dark:bg-slate-600 text-slate-400 cursor-not-allowed'}
            `}
          >
            {loading ? 'Importing...' : 'Import Data'}
          </button>
          <button
            onClick={() => setStep('CLEANING')}
            className={`
              px-4 py-3 rounded-lg font-medium
              ${isDarkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}
              transition-colors
            `}
          >
            Back
          </button>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className={`
      min-h-screen p-6
      ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}
    `}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Data Import Wizard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Import and map environmental data to QCVN standards
          </p>
        </div>

        {/* Step indicator */}
        {step !== 'IDLE' && renderStepIndicator()}

        {/* Step content */}
        <div className={`
          p-6 rounded-xl shadow-sm border
          ${isDarkMode
            ? 'bg-slate-800 border-slate-700'
            : 'bg-white border-slate-200'}
        `}>
          {step === 'IDLE' && renderFileUpload()}
          {step === 'PREVIEW' && renderDataPreview()}
          {step === 'MAPPING' && renderVariableMapping()}
          {step === 'CLEANING' && renderCleaningConfig()}
          {step === 'READY' && renderReady()}
        </div>
      </div>
    </div>
  );
};

export default DataImporter;
