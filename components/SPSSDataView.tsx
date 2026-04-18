import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { VariableInfo, RawDataRow } from '../types/statistics';
import { encodeStatsData, decodeStatsData } from '../utils/stats-seed';
import { loadDirectData } from '../services/stats-data-service';
import { useStats } from './StatsContext';

export interface SPSSDataViewProps {
  isDarkMode: boolean;
  selectedVariables: string[];
}

type VariableType = 'numeric' | 'factor' | 'character' | 'date';

const TYPE_CYCLE: VariableType[] = ['numeric', 'factor', 'character', 'date'];

const DataView: React.FC<SPSSDataViewProps> = ({ isDarkMode, selectedVariables }) => {
  const { setSessionId, setVariables: setContextVariables, setDataRows: setContextDataRows, setDataLoaded, variables: contextVariables, dataRows: contextDataRows, dataLoaded: contextDataLoaded } = useStats();

  // Local state for grid editing
  const [localVariables, setLocalVariables] = useState<VariableInfo[]>([
    { name: 'var1', label: 'Variable 1', type: 'numeric', missing_count: 0 },
    { name: 'var2', label: 'Variable 2', type: 'numeric', missing_count: 0 },
  ]);
  const [localDataRows, setLocalDataRows] = useState<RawDataRow[]>([
    { var1: '', var2: '' },
    { var1: '', var2: '' },
    { var1: '', var2: '' },
  ]);

  // Sync from context when File > Open is used
  useEffect(() => {
    const rows = contextDataRows || [];
    console.log('[DEBUG DataView] useEffect triggered:', { contextDataLoaded, contextVariables: contextVariables?.length || 0, contextDataRows: rows.length });
    if (contextDataLoaded && contextVariables && contextVariables.length > 0) {
      console.log('[DEBUG DataView] Syncing from context:', contextVariables.length, 'vars,', rows.length, 'rows');
      setLocalVariables(contextVariables);
      if (rows.length > 0) {
        setLocalDataRows(rows);
      }
    }
  }, [contextDataLoaded, contextVariables, contextDataRows]);
  const [seedInput, setSeedInput] = useState('');
  const [sendStatus, setSendStatus] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editingHeader, setEditingHeader] = useState<number | null>(null);
  const [headerEditValue, setHeaderEditValue] = useState('');
  const [cellEditValue, setCellEditValue] = useState('');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState<number | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  // Use local state for display and editing
  const variables = localVariables;
  const dataRows = localDataRows;

  const getCellDisplay = (row: RawDataRow, varName: string): string => {
    const val = row[varName];
    if (val === null || val === undefined || val === '') return '-';
    return String(val);
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (selectedCell === null) return;
      e.preventDefault();
      const text = e.clipboardData.getData('text');
      if (!text) return;

      const rows = text.split('\n').filter((line) => line.length > 0);
      const newData = localDataRows.map((r) => ({ ...r }));
      let rowOffset = 0;

      for (const rowText of rows) {
        const cells = rowText.split('\t');
        const targetRow = selectedCell.row + rowOffset;
        if (targetRow >= newData.length) {
          const newRow: RawDataRow = {};
          localVariables.forEach((v) => {
            newRow[v.name] = '';
          });
          newData.push(newRow);
        }
        cells.forEach((cellValue, colOffset) => {
          const targetCol = selectedCell.col + colOffset;
          if (targetCol < localVariables.length) {
            const varName = localVariables[targetCol].name;
            const trimmed = cellValue.trim();
            newData[targetRow][varName] = trimmed === '' ? '' : trimmed;
          }
        });
        rowOffset++;
      }

      setLocalDataRows(newData);
    },
    [selectedCell, localDataRows, localVariables]
  );

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ row, col });
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    setEditingCell({ row, col });
    setCellEditValue(localDataRows[row]?.[localVariables[col].name] ?? '');
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        const newData = localDataRows.map((r, ri) =>
          ri === row ? { ...r, [localVariables[col].name]: cellEditValue } : r
        );
        setLocalDataRows(newData);
        setEditingCell(null);
        if (row < localDataRows.length - 1) {
          setSelectedCell({ row: row + 1, col });
        }
      } else if (e.key === 'Escape') {
        setEditingCell(null);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const newData = localDataRows.map((r, ri) =>
          ri === row ? { ...r, [localVariables[col].name]: cellEditValue } : r
        );
        setLocalDataRows(newData);
        setEditingCell(null);
        if (e.shiftKey) {
          if (col > 0) {
            setSelectedCell({ row, col: col - 1 });
          } else if (row > 0) {
            setSelectedCell({ row: row - 1, col: localVariables.length - 1 });
          }
        } else {
          if (col < localVariables.length - 1) {
            setSelectedCell({ row, col: col + 1 });
          } else {
            setSelectedCell({ row: row + 1, col: 0 });
            if (row + 1 >= localDataRows.length) {
              const newRow: RawDataRow = {};
              localVariables.forEach((v) => {
                newRow[v.name] = '';
              });
              setLocalDataRows((prev) => [...prev, newRow]);
            }
          }
        }
      }
    } else {
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setEditingCell({ row, col });
        setCellEditValue(e.key);
      } else if (e.key === 'Enter' || e.key === 'F2') {
        setEditingCell({ row, col });
        setCellEditValue(localDataRows[row]?.[localVariables[col].name] ?? '');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const newData = localDataRows.map((r, ri) =>
          ri === row ? { ...r, [localVariables[col].name]: '' } : r
        );
        setLocalDataRows(newData);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          if (col > 0) setSelectedCell({ row, col: col - 1 });
          else if (row > 0) setSelectedCell({ row: row - 1, col: localVariables.length - 1 });
        } else {
          if (col < localVariables.length - 1) setSelectedCell({ row, col: col + 1 });
          else setSelectedCell({ row: Math.min(row + 1, localDataRows.length - 1), col: 0 });
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (col < localVariables.length - 1) setSelectedCell({ row, col: col + 1 });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (col > 0) setSelectedCell({ row, col: col - 1 });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (row < localDataRows.length - 1) setSelectedCell({ row: row + 1, col });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (row > 0) setSelectedCell({ row: row - 1, col });
      }
    }
  };

  const handleHeaderDoubleClick = (col: number) => {
    setEditingHeader(col);
    setHeaderEditValue(localVariables[col].name);
  };

  const confirmHeaderEdit = () => {
    if (editingHeader === null) return;
    const trimmed = headerEditValue.trim();
    if (trimmed && trimmed !== localVariables[editingHeader].name) {
      const oldName = localVariables[editingHeader].name;
      const newName = trimmed.replace(/\s+/g, '_');
      setLocalVariables((prev) =>
        prev.map((v, i) => (i === editingHeader ? { ...v, name: newName, label: trimmed } : v))
      );
      setLocalDataRows((prev) =>
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

  const cycleType = (col: number) => {
    const current = localVariables[col].type;
    const idx = TYPE_CYCLE.indexOf(current);
    const next = TYPE_CYCLE[(idx + 1) % TYPE_CYCLE.length];
    setLocalVariables((prev) => prev.map((v, i) => (i === col ? { ...v, type: next } : v)));
    setTypeDropdownOpen(null);
  };

  const setType = (col: number, type: VariableType) => {
    setLocalVariables((prev) => prev.map((v, i) => (i === col ? { ...v, type } : v)));
    setTypeDropdownOpen(null);
  };

  const removeColumn = (col: number) => {
    if (localVariables.length <= 1) return;
    const varName = localVariables[col].name;
    setLocalVariables((prev) => prev.filter((_, i) => i !== col));
    setLocalDataRows((prev) => prev.map((r) => {
      const newRow: RawDataRow = {};
      Object.keys(r).forEach((k) => {
        if (k !== varName) newRow[k] = r[k];
      });
      return newRow;
    }));
  };

  const addColumn = () => {
    const n = localVariables.length + 1;
    const newVar: VariableInfo = {
      name: `var${n}`,
      label: `Variable ${n}`,
      type: 'numeric',
      missing_count: 0,
    };
    setLocalVariables((prev) => [...prev, newVar]);
    setLocalDataRows((prev) =>
      prev.map((r) => ({ ...r, [`var${n}`]: '' }))
    );
  };

  const addRow = () => {
    const newRow: RawDataRow = {};
    localVariables.forEach((v) => {
      newRow[v.name] = '';
    });
    setLocalDataRows((prev) => [...prev, newRow]);
  };

  const handleGenerate = () => {
    const numericData = localDataRows.map((row) => {
      const newRow: RawDataRow = {};
      localVariables.forEach((v) => {
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

    const seed = encodeStatsData(localVariables, numericData);
    setSeedInput(seed);
  };

  const handleLoad = () => {
    const decoded = decodeStatsData(seedInput);
    if (decoded) {
      setLocalVariables(decoded.variables);
      setLocalDataRows(decoded.data);
      setSendStatus('Seed loaded successfully.');
    } else {
      setSendStatus('Invalid seed string.');
    }
  };

  const handleSendToR = async () => {
    setSendStatus('Sending to R...');

    const convertedData: RawDataRow[] = localDataRows.map((row) => {
      const newRow: RawDataRow = {};
      localVariables.forEach((v) => {
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
      const result = await loadDirectData({ variables: localVariables, data: convertedData });
      setSessionId(result.session_id);
      setContextVariables(result.variables);
      setContextDataRows(convertedData);
      setDataLoaded(true);
      setSendStatus(`Loaded: ${result.row_count} rows, ${result.variables.length} vars`);
    } catch (err: any) {
      setSendStatus(`Error: ${err.message}`);
    }
  };

  useEffect(() => {
    const handleClick = () => setTypeDropdownOpen(null);
    if (typeDropdownOpen !== null) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [typeDropdownOpen]);

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
  const toolbarBg = isDarkMode ? 'bg-slate-800' : 'bg-white';

  return (
    <div className={`flex flex-col h-full ${gridBg} rounded-lg border ${borderColor} shadow-sm transition-colors duration-300`}>
      {/* Compact Toolbar */}
      <div className={`flex flex-wrap items-center gap-2 px-3 py-2 border-b ${borderColor} ${toolbarBg} transition-colors duration-200`}>
        <button
          onClick={addColumn}
          className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all duration-150 ${
            isDarkMode
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-emerald-100 shadow-md shadow-emerald-900/30'
              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-md shadow-emerald-500/30'
          }`}
        >
          + Col
        </button>

        <button
          onClick={addRow}
          className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all duration-150 ${
            isDarkMode
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-emerald-100 shadow-md shadow-emerald-900/30'
              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-md shadow-emerald-500/30'
          }`}
        >
          + Row
        </button>

        <span className={`px-1.5 py-0.5 text-[10px] rounded font-mono ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
          {localVariables.length}x{localDataRows.length}
        </span>

        <div className="flex-1" />

        <input
          type="text"
          value={seedInput}
          onChange={(e) => setSeedInput(e.target.value)}
          placeholder="Seed..."
          className={`px-1.5 py-1 text-[10px] rounded-l border font-mono w-28 ${
            isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-700 placeholder-slate-400'
          } focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all duration-150`}
        />
        <button
          onClick={() => navigator.clipboard.writeText(seedInput)}
          className={`px-1.5 py-1 text-[10px] rounded-r border-l-0 border font-medium transition-all duration-150 ${
            isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-400 hover:text-emerald-400' : 'bg-white border-slate-300 text-slate-500 hover:text-emerald-600'
          }`}
          title="Copy seed"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={handleGenerate}
          className={`px-1.5 py-1 text-[10px] rounded border font-medium transition-all duration-150 ${
            isDarkMode ? 'border-emerald-700 hover:bg-emerald-900/40 text-emerald-400' : 'border-emerald-200 hover:bg-emerald-50 text-emerald-700'
          }`}
        >
          Encode
        </button>
        <button
          onClick={handleLoad}
          className={`px-1.5 py-1 text-[10px] rounded border font-medium transition-all duration-150 ${
            isDarkMode ? 'border-emerald-700 hover:bg-emerald-900/40 text-emerald-400' : 'border-emerald-200 hover:bg-emerald-50 text-emerald-700'
          }`}
        >
          Decode
        </button>

        <button
          onClick={handleSendToR}
          className="px-4 py-1.5 text-xs rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/30 transition-all duration-200 active:scale-95"
        >
          Send to R
        </button>
      </div>

      {/* Status bar */}
      {sendStatus && (
        <div className={`px-3 py-1 text-[10px] font-mono ${isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'} border-b ${borderColor}`}>
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
            <tr>
              <th className={`sticky top-0 left-0 z-40 w-12 min-w-[2.5rem] px-1 py-2 text-[10px] font-semibold text-center border-b border-r ${borderColor} ${headerBg} ${headerTextColor} shadow-r`}>
                #
              </th>
              {localVariables.map((v, colIdx) => (
                <th
                  key={v.name}
                  className={`sticky top-0 z-30 px-1 py-2 text-[10px] font-semibold border-b border-r min-w-[100px] ${borderColor} ${headerBg} ${headerTextColor}`}
                  style={{ left: colIdx === 0 ? '2.5rem' : undefined }}
                >
                  <div className="flex flex-col gap-1">
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
                        className={`px-1 py-0.5 text-[10px] font-semibold rounded border w-full ${inputBg} border-blue-500 focus:outline-none`}
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

                    <div className="flex items-center gap-1">
                      <span
                        className={`px-1 py-0.5 text-[8px] rounded cursor-pointer font-mono uppercase tracking-wider ${
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
                      >
                        {v.type}
                      </span>

                      {typeDropdownOpen === colIdx && (
                        <div
                          className={`absolute mt-6 z-50 rounded border shadow-lg py-1 text-[10px] ${
                            isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {TYPE_CYCLE.map((t) => (
                            <button
                              key={t}
                              className={`block w-full text-left px-2 py-0.5 hover:${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'} ${
                                t === v.type ? 'font-bold' : ''
                              }`}
                              onClick={() => setType(colIdx, t)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}

                      {localVariables.length > 1 && (
                        <button
                          className={`ml-auto text-[10px] ${mutedText} hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity`}
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
            {localDataRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`${rowIdx % 2 === 0 ? '' : isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50/50'} ${rowHover} transition-colors group`}
              >
                <td className={`sticky left-0 z-20 w-12 min-w-[2.5rem] px-1 py-1 text-[10px] text-center font-mono border-r ${borderColor} ${headerBg} ${mutedText}`}>
                  {rowIdx + 1}
                </td>

                {localVariables.map((v, colIdx) => {
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
                      style={{ minWidth: '100px' }}
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
                            const newData = localDataRows.map((r, ri) =>
                              ri === rowIdx ? { ...r, [v.name]: cellEditValue } : r
                            );
                            setLocalDataRows(newData);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const newData = localDataRows.map((r, ri) =>
                                ri === rowIdx ? { ...r, [v.name]: cellEditValue } : r
                              );
                              setLocalDataRows(newData);
                              setEditingCell(null);
                              if (rowIdx < localDataRows.length - 1) {
                                setSelectedCell({ row: rowIdx + 1, col: colIdx });
                              }
                            }
                            if (e.key === 'Escape') setEditingCell(null);
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              const newData = localDataRows.map((r, ri) =>
                                ri === rowIdx ? { ...r, [v.name]: cellEditValue } : r
                              );
                              setLocalDataRows(newData);
                              setEditingCell(null);
                              if (e.shiftKey) {
                                if (colIdx > 0) setSelectedCell({ row: rowIdx, col: colIdx - 1 });
                                else if (rowIdx > 0) setSelectedCell({ row: rowIdx - 1, col: localVariables.length - 1 });
                              } else {
                                if (colIdx < localVariables.length - 1) setSelectedCell({ row: rowIdx, col: colIdx + 1 });
                                else setSelectedCell({ row: Math.min(rowIdx + 1, localDataRows.length - 1), col: 0 });
                              }
                            }
                            e.stopPropagation();
                          }}
                          className={`absolute inset-0 w-full h-full px-1 py-1 text-[10px] font-mono bg-transparent focus:outline-none ${
                            isNumeric ? 'text-right' : ''
                          } ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
                        />
                      ) : (
                        <div
                          className={`px-1 py-1 text-[10px] font-mono whitespace-nowrap overflow-hidden text-ellipsis ${
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

        {localDataRows.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm italic text-slate-400">
            No data. Add rows or load from file.
          </div>
        )}
      </div>
    </div>
  );
};

export default DataView;