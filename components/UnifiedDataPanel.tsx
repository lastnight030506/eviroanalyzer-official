import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { VariableInfo, RawDataRow } from '../types/statistics';
import { encodeStatsData, decodeStatsData } from '../utils/stats-seed';
import { loadDirectData } from '../services/stats-data-service';
import { loadData } from '../services/statistics-service';
import { useStats } from './StatsContext';

interface Props {
  isDarkMode: boolean;
  onDataLoaded: () => void;
}

type VariableType = 'numeric' | 'factor' | 'character' | 'date';

const TYPE_CYCLE: VariableType[] = ['numeric', 'factor', 'character', 'date'];

const UnifiedDataPanel: React.FC<Props> = ({ isDarkMode, onDataLoaded }) => {
  const { setSessionId, setVariables: setContextVariables, setDataRows: setContextDataRows, setDataLoaded } = useStats();
  const [variables, setVariables] = useState<VariableInfo[]>([
    { name: 'var1', label: 'Variable 1', type: 'numeric', missing_count: 0 },
    { name: 'var2', label: 'Variable 2', type: 'numeric', missing_count: 0 },
  ]);
  const [dataRows, setDataRows] = useState<RawDataRow[]>([
    { var1: '', var2: '' },
    { var1: '', var2: '' },
    { var1: '', var2: '' },
  ]);
  const [seedInput, setSeedInput] = useState('');
  const [sendStatus, setSendStatus] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editingHeader, setEditingHeader] = useState<number | null>(null);
  const [headerEditValue, setHeaderEditValue] = useState('');
  const [cellEditValue, setCellEditValue] = useState('');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState<number | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build column list
  const columns = variables.map((v) => v.name);

  // Get display value for a cell
  const getCellDisplay = (row: RawDataRow, varName: string): string => {
    const val = row[varName];
    if (val === null || val === undefined || val === '') return '-';
    return String(val);
  };

  // Parse clipboard text and fill cells
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (selectedCell === null) return;
      e.preventDefault();
      const text = e.clipboardData.getData('text');
      if (!text) return;

      const rows = text.split('\n').filter((line) => line.length > 0);
      const newData = dataRows.map((r) => ({ ...r }));
      let rowOffset = 0;

      for (const rowText of rows) {
        const cells = rowText.split('\t');
        const targetRow = selectedCell.row + rowOffset;
        if (targetRow >= newData.length) {
          // Add new row if needed
          const newRow: RawDataRow = {};
          variables.forEach((v) => {
            newRow[v.name] = '';
          });
          newData.push(newRow);
        }
        cells.forEach((cellValue, colOffset) => {
          const targetCol = selectedCell.col + colOffset;
          if (targetCol < variables.length) {
            const varName = variables[targetCol].name;
            const trimmed = cellValue.trim();
            newData[targetRow][varName] = trimmed === '' ? '' : trimmed;
          }
        });
        rowOffset++;
      }

      setDataRows(newData);
    },
    [selectedCell, dataRows, variables]
  );

  // Cell click handler
  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ row, col });
  };

  // Cell double click to edit
  const handleCellDoubleClick = (row: number, col: number) => {
    setEditingCell({ row, col });
    setCellEditValue(dataRows[row]?.[variables[col].name] ?? '');
  };

  // Cell key down handler
  const handleCellKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        // Confirm and move down
        const newData = dataRows.map((r, ri) =>
          ri === row ? { ...r, [variables[col].name]: cellEditValue } : r
        );
        setDataRows(newData);
        setEditingCell(null);
        if (row < dataRows.length - 1) {
          setSelectedCell({ row: row + 1, col });
        }
      } else if (e.key === 'Escape') {
        setEditingCell(null);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const newData = dataRows.map((r, ri) =>
          ri === row ? { ...r, [variables[col].name]: cellEditValue } : r
        );
        setDataRows(newData);
        setEditingCell(null);
        if (e.shiftKey) {
          if (col > 0) {
            setSelectedCell({ row, col: col - 1 });
          } else if (row > 0) {
            setSelectedCell({ row: row - 1, col: variables.length - 1 });
          }
        } else {
          if (col < variables.length - 1) {
            setSelectedCell({ row, col: col + 1 });
          } else {
            setSelectedCell({ row: row + 1, col: 0 });
            // Add new row if needed
            if (row + 1 >= dataRows.length) {
              const newRow: RawDataRow = {};
              variables.forEach((v) => {
                newRow[v.name] = '';
              });
              setDataRows((prev) => [...prev, newRow]);
            }
          }
        }
      }
    } else {
      // Not editing — start editing on any printable key
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setEditingCell({ row, col });
        setCellEditValue(e.key);
      } else if (e.key === 'Enter' || e.key === 'F2') {
        setEditingCell({ row, col });
        setCellEditValue(dataRows[row]?.[variables[col].name] ?? '');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const newData = dataRows.map((r, ri) =>
          ri === row ? { ...r, [variables[col].name]: '' } : r
        );
        setDataRows(newData);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          if (col > 0) setSelectedCell({ row, col: col - 1 });
          else if (row > 0) setSelectedCell({ row: row - 1, col: variables.length - 1 });
        } else {
          if (col < variables.length - 1) setSelectedCell({ row, col: col + 1 });
          else setSelectedCell({ row: Math.min(row + 1, dataRows.length - 1), col: 0 });
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (col < variables.length - 1) setSelectedCell({ row, col: col + 1 });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (col > 0) setSelectedCell({ row, col: col - 1 });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (row < dataRows.length - 1) setSelectedCell({ row: row + 1, col });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (row > 0) setSelectedCell({ row: row - 1, col });
      }
    }
  };

  // Header double click to edit name
  const handleHeaderDoubleClick = (col: number) => {
    setEditingHeader(col);
    setHeaderEditValue(variables[col].name);
  };

  // Confirm header rename
  const confirmHeaderEdit = () => {
    if (editingHeader === null) return;
    const trimmed = headerEditValue.trim();
    if (trimmed && trimmed !== variables[editingHeader].name) {
      const oldName = variables[editingHeader].name;
      const newName = trimmed.replace(/\s+/g, '_');
      setVariables((prev) =>
        prev.map((v, i) => (i === editingHeader ? { ...v, name: newName, label: trimmed } : v))
      );
      // Rename in data rows
      setDataRows((prev) =>
        prev.map((r) => {
          const newRow: RawDataRow = {};
          Object.keys(r).forEach((k) => {
            newRow[k === oldName ? newName : k] = r[k];
          });
          return newRow;
        })
      );
    }
    setEditingHeader(null);
  };

  // Cycle or set column type
  const cycleType = (col: number) => {
    const current = variables[col].type;
    const idx = TYPE_CYCLE.indexOf(current);
    const next = TYPE_CYCLE[(idx + 1) % TYPE_CYCLE.length];
    setVariables((prev) => prev.map((v, i) => (i === col ? { ...v, type: next } : v)));
    setTypeDropdownOpen(null);
  };

  const setType = (col: number, type: VariableType) => {
    setVariables((prev) => prev.map((v, i) => (i === col ? { ...v, type } : v)));
    setTypeDropdownOpen(null);
  };

  // Remove column
  const removeColumn = (col: number) => {
    if (variables.length <= 1) return;
    const varName = variables[col].name;
    setVariables((prev) => prev.filter((_, i) => i !== col));
    setDataRows((prev) => prev.map((r) => {
      const newRow: RawDataRow = {};
      Object.keys(r).forEach((k) => {
        if (k !== varName) newRow[k] = r[k];
      });
      return newRow;
    }));
  };

  // Add column
  const addColumn = () => {
    const n = variables.length + 1;
    const newVar: VariableInfo = {
      name: `var${n}`,
      label: `Variable ${n}`,
      type: 'numeric',
      missing_count: 0,
    };
    setVariables((prev) => [...prev, newVar]);
    setDataRows((prev) =>
      prev.map((r) => ({ ...r, [`var${n}`]: '' }))
    );
  };

  // Add row
  const addRow = () => {
    const newRow: RawDataRow = {};
    variables.forEach((v) => {
      newRow[v.name] = '';
    });
    setDataRows((prev) => [...prev, newRow]);
  };

  // Import file (CSV only via client-side parsing)
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) return;

      const headerLine = lines[0];
      const delimiter = headerLine.includes('\t') ? '\t' : ',';
      const headers = headerLine.split(delimiter).map((h) => h.trim().replace(/"/g, ''));

      const newVars: VariableInfo[] = headers.map((h, i) => ({
        name: `var${i + 1}`,
        label: h,
        type: 'numeric' as VariableType,
        missing_count: 0,
      }));

      const newData: RawDataRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map((v) => v.trim().replace(/"/g, ''));
        const row: RawDataRow = {};
        newVars.forEach((v, j) => {
          const val = values[j] ?? '';
          row[v.name] = val === '' ? '' : val;
        });
        newData.push(row);
      }

      setVariables(newVars);
      setDataRows(newData.length > 0 ? newData : [{ [newVars[0].name]: '' }]);
    } else if (ext === 'xlsx' || ext === 'xls') {
      // For Excel, use R backend via loadData
      try {
        setSendStatus('Loading via R...');
        const filePath = (file as any).path || file.name;
        const result = await loadData(filePath, 'excel');
        setVariables(result.variables.map((v: VariableInfo) => ({
          name: v.name,
          label: v.label || v.name,
          type: v.type as VariableType,
          missing_count: v.missing_count,
        })));
        setDataRows(result.data || []);
        setSendStatus(`Loaded ${result.row_count} rows from Excel`);
      } catch (err: any) {
        setSendStatus(`Import failed: ${err.message}`);
      }
    } else if (ext === 'sav') {
      try {
        setSendStatus('Loading via R...');
        const filePath = (file as any).path || file.name;
        const result = await loadData(filePath, 'sav');
        setVariables(result.variables.map((v: VariableInfo) => ({
          name: v.name,
          label: v.label || v.name,
          type: v.type as VariableType,
          missing_count: v.missing_count,
        })));
        setDataRows(result.data || []);
        setSendStatus(`Loaded ${result.row_count} rows from SPSS`);
      } catch (err: any) {
        setSendStatus(`Import failed: ${err.message}`);
      }
    } else {
      setSendStatus('Unsupported file type. Use CSV.');
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper to load xlsx/sav via R
  const loadDirectDataViaR = async (filePath: string, ext: string): Promise<{ variables: VariableInfo[]; data: RawDataRow[] }> => {
    // Use the R sidecar to import
    const { runRScript } = await import('../services/r-sidecar');
    const scriptName = ext === 'xlsx' ? 'import_excel_stats.R' : 'import_spss_stats.R';
    const result = await runRScript<{ variables: VariableInfo[]; data: RawDataRow[] }>(scriptName, [filePath]);
    return result;
  };

  // Generate seed
  const handleGenerate = () => {
    // Convert string values to numbers for numeric columns before encoding
    const numericData = dataRows.map((row) => {
      const newRow: RawDataRow = {};
      variables.forEach((v) => {
        const val = row[v.name];
        if (v.type === 'numeric' && typeof val === 'string' && val !== '') {
          const num = parseFloat(val);
          newRow[v.name] = isNaN(num) ? val : num;
        } else {
          newRow[v.name] = val;
        }
      });
      return newRow;
    });

    const seed = encodeStatsData(variables, numericData);
    setSeedInput(seed);
  };

  // Load from seed
  const handleLoad = () => {
    const decoded = decodeStatsData(seedInput);
    if (decoded) {
      setVariables(decoded.variables);
      setDataRows(decoded.data);
      setSendStatus('Seed loaded successfully.');
    } else {
      setSendStatus('Invalid seed string.');
    }
  };

  // Send to R
  const handleSendToR = async () => {
    setSendStatus('Sending to R...');

    // Convert string values to numbers for numeric columns
    const convertedData: RawDataRow[] = dataRows.map((row) => {
      const newRow: RawDataRow = {};
      variables.forEach((v) => {
        const val = row[v.name];
        if (v.type === 'numeric' && typeof val === 'string' && val !== '') {
          const num = parseFloat(val);
          newRow[v.name] = isNaN(num) ? null : num;
        } else {
          newRow[v.name] = val;
        }
      });
      return newRow;
    });

    try {
      const result = await loadDirectData({ variables, data: convertedData });
      setSessionId(result.session_id);
      setContextVariables(result.variables);
      setContextDataRows(convertedData);
      setDataLoaded(true);
      setSendStatus(`Loaded: ${result.row_count} rows, ${result.variables.length} vars (session: ${result.session_id})`);
      onDataLoaded();
    } catch (err: any) {
      setSendStatus(`Error: ${err.message}`);
    }
  };

  // Close type dropdown on outside click
  useEffect(() => {
    const handleClick = () => setTypeDropdownOpen(null);
    if (typeDropdownOpen !== null) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [typeDropdownOpen]);

  // Grid background styles
  const gridBg = isDarkMode ? 'bg-slate-800' : 'bg-white';
  const headerBg = isDarkMode ? 'bg-slate-900' : 'bg-slate-50';
  const borderColor = isDarkMode ? 'border-slate-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-slate-200' : 'text-slate-700';
  const headerTextColor = isDarkMode ? 'text-slate-200' : 'text-slate-700';
  const mutedText = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const rowHover = isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';
  const inputBg = isDarkMode ? 'bg-slate-700' : 'bg-white';
  const selectedBg = isDarkMode ? 'bg-blue-900/40' : 'bg-blue-50';
  const editingBg = isDarkMode ? 'bg-slate-600' : 'bg-yellow-50';

  return (
    <div className={`flex flex-col h-full ${gridBg} rounded-lg border ${borderColor} shadow-sm transition-colors duration-300`}>
      {/* Toolbar */}
      <div className={`flex flex-wrap items-center gap-2 p-3 border-b ${borderColor} ${headerBg} transition-colors duration-300`}>
        {/* Import */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors font-medium"
        >
          Import File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.sav"
          onChange={handleImportFile}
          className="hidden"
        />

        {/* Add Col */}
        <button
          onClick={addColumn}
          className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
        >
          + Add Col
        </button>

        {/* Add Row */}
        <button
          onClick={addRow}
          className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
        >
          + Add Row
        </button>

        {/* Badges */}
        <span className={`px-2 py-1 text-xs rounded font-mono ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
          {variables.length} vars
        </span>
        <span className={`px-2 py-1 text-xs rounded font-mono ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
          {dataRows.length} rows
        </span>

        <div className="flex-1" />

        {/* Seed */}
        <input
          type="text"
          value={seedInput}
          onChange={(e) => setSeedInput(e.target.value)}
          placeholder="Seed string..."
          className={`px-2 py-1.5 text-sm rounded border font-mono w-48 ${
            isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-700 placeholder-slate-400'
          } focus:outline-none focus:ring-1 focus:ring-blue-500`}
        />
        <button
          onClick={handleGenerate}
          className={`px-3 py-1.5 text-sm rounded border transition-colors ${
            isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'
          }`}
        >
          Generate
        </button>
        <button
          onClick={handleLoad}
          className={`px-3 py-1.5 text-sm rounded border transition-colors ${
            isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'
          }`}
        >
          Load
        </button>

        {/* Send to R */}
        <button
          onClick={handleSendToR}
          className="px-4 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
        >
          Send to R
        </button>
      </div>

      {/* Status bar */}
      {sendStatus && (
        <div className={`px-3 py-1.5 text-xs font-mono ${isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'} border-b ${borderColor}`}>
          {sendStatus}
        </div>
      )}

      {/* Grid */}
      <div
        ref={gridRef}
        className="flex-1 overflow-auto"
        onPaste={handlePaste}
      >
        <table className="border-collapse min-w-full">
          <thead>
            {/* Row # header */}
            <tr>
              <th className={`sticky top-0 left-0 z-40 w-14 min-w-[3rem] px-2 py-2 text-xs font-semibold text-center border-b border-r ${borderColor} ${headerBg} ${headerTextColor} shadow-r`}>
                #
              </th>
              {/* Variable headers */}
              {variables.map((v, colIdx) => (
                <th
                  key={v.name}
                  className={`sticky top-0 z-30 px-2 py-2 text-xs font-semibold border-b border-r min-w-[120px] ${borderColor} ${headerBg} ${headerTextColor}`}
                  style={{ left: colIdx === 0 ? '3.5rem' : undefined }}
                >
                  <div className="flex flex-col gap-1">
                    {/* Name */}
                    {editingHeader === colIdx ? (
                      <input
                        autoFocus
                        value={headerEditValue}
                        onChange={(e) => setHeaderEditValue(e.target.value)}
                        onBlur={confirmHeaderEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmHeaderEdit();
                          if (e.key === 'Escape') setEditingHeader(null);
                          e.stopPropagation();
                        }}
                        className={`px-1 py-0.5 text-xs font-semibold rounded border w-full ${inputBg} border-blue-500 focus:outline-none`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:text-blue-500 truncate"
                        onDoubleClick={() => handleHeaderDoubleClick(colIdx)}
                        title="Double-click to rename"
                      >
                        {v.label}
                      </span>
                    )}

                    {/* Type badge + remove */}
                    <div className="flex items-center gap-1">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded cursor-pointer font-mono uppercase tracking-wider ${
                          v.type === 'numeric'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : v.type === 'factor'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                            : v.type === 'character'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                            : 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTypeDropdownOpen(typeDropdownOpen === colIdx ? null : colIdx);
                        }}
                        title="Click to change type"
                      >
                        {v.type}
                      </span>

                      {typeDropdownOpen === colIdx && (
                        <div
                          className={`absolute mt-6 z-50 rounded border shadow-lg py-1 text-xs ${
                            isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {TYPE_CYCLE.map((t) => (
                            <button
                              key={t}
                              className={`block w-full text-left px-3 py-1 hover:${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'} ${
                                t === v.type ? 'font-bold' : ''
                              }`}
                              onClick={() => setType(colIdx, t)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}

                      {variables.length > 1 && (
                        <button
                          className={`ml-auto text-xs ${mutedText} hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity`}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeColumn(colIdx);
                          }}
                          title="Remove column"
                        >
                          x
                        </button>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`${rowIdx % 2 === 0 ? '' : isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50/50'} ${rowHover} transition-colors group`}
              >
                {/* Row index */}
                <td className={`sticky left-0 z-20 w-14 min-w-[3rem] px-2 py-1.5 text-xs text-center font-mono border-r ${borderColor} ${headerBg} ${mutedText}`}>
                  {rowIdx + 1}
                </td>

                {/* Data cells */}
                {variables.map((v, colIdx) => {
                  const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                  const displayVal = getCellDisplay(row, v.name);
                  const isNumeric = v.type === 'numeric';

                  return (
                    <td
                      key={v.name}
                      className={`relative border-r border-b border-slate-100 dark:border-slate-700 px-0 py-0 ${
                        isSelected ? selectedBg : ''
                      } ${isEditing ? editingBg : ''}`}
                      style={{ minWidth: '120px' }}
                      onClick={() => handleCellClick(rowIdx, colIdx)}
                      onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
                      onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                      tabIndex={0}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          type="text"
                          value={cellEditValue}
                          onChange={(e) => setCellEditValue(e.target.value)}
                          onBlur={() => {
                            const newData = dataRows.map((r, ri) =>
                              ri === rowIdx ? { ...r, [v.name]: cellEditValue } : r
                            );
                            setDataRows(newData);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const newData = dataRows.map((r, ri) =>
                                ri === rowIdx ? { ...r, [v.name]: cellEditValue } : r
                              );
                              setDataRows(newData);
                              setEditingCell(null);
                              if (rowIdx < dataRows.length - 1) {
                                setSelectedCell({ row: rowIdx + 1, col: colIdx });
                              }
                            }
                            if (e.key === 'Escape') setEditingCell(null);
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              const newData = dataRows.map((r, ri) =>
                                ri === rowIdx ? { ...r, [v.name]: cellEditValue } : r
                              );
                              setDataRows(newData);
                              setEditingCell(null);
                              if (e.shiftKey) {
                                if (colIdx > 0) setSelectedCell({ row: rowIdx, col: colIdx - 1 });
                                else if (rowIdx > 0) setSelectedCell({ row: rowIdx - 1, col: variables.length - 1 });
                              } else {
                                if (colIdx < variables.length - 1) setSelectedCell({ row: rowIdx, col: colIdx + 1 });
                                else setSelectedCell({ row: Math.min(rowIdx + 1, dataRows.length - 1), col: 0 });
                              }
                            }
                            e.stopPropagation();
                          }}
                          className={`absolute inset-0 w-full h-full px-2 py-1.5 text-xs font-mono bg-transparent focus:outline-none ${
                            isNumeric ? 'text-right' : ''
                          } ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
                        />
                      ) : (
                        <div
                          className={`px-2 py-1.5 text-xs font-mono whitespace-nowrap overflow-hidden text-ellipsis ${
                            isNumeric ? 'text-right' : ''
                          } ${isNumeric && displayVal !== '-' ? (isDarkMode ? 'text-slate-200' : 'text-slate-700') : mutedText}`}
                        >
                          {displayVal}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {dataRows.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm italic text-slate-400">
            No data. Add rows or load from file.
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedDataPanel;
