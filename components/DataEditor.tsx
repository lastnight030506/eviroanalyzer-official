import React from 'react';
import { SampleRow } from '../types';

interface DataEditorProps {
  data: SampleRow[];
  sampleColumns: string[];
  onDataChange: (newData: SampleRow[]) => void;
}

const DataEditor: React.FC<DataEditorProps> = ({ data, sampleColumns, onDataChange }) => {
  
  const updateRow = (rowIndex: number, colKey: string, value: string) => {
    const newData = [...data];
    newData[rowIndex] = {
      ...newData[rowIndex],
      [colKey]: value
    };
    onDataChange(newData);
  };

  const handleCellChange = (rowIndex: number, colKey: string, value: string) => {
    // Strict regex for positive numbers (integer or decimal)
    // Allows empty string, "1", "1.", "1.5"
    // Reject everything else (letters, symbols, negatives)
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
       updateRow(rowIndex, colKey, value);
    }
  };

  const handleBlur = (rowIndex: number, colKey: string, value: string) => {
    if (value === '') return;
    
    // Parse to float to remove trailing decimals or leading zeros
    const parsed = parseFloat(value);
    
    if (!isNaN(parsed)) {
      // Update with the clean formatted number string (e.g., "10." -> "10", "05" -> "5")
      updateRow(rowIndex, colKey, parsed.toString());
    } else {
      updateRow(rowIndex, colKey, '');
    }
  };

  return (
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-slate-800 h-full flex flex-col transition-colors duration-300">
      <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
        <thead className="text-xs text-slate-700 dark:text-slate-200 uppercase bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th scope="col" className="px-6 py-3 font-semibold w-12 sticky left-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">#</th>
            <th scope="col" className="px-6 py-3 font-semibold min-w-[150px] sticky left-12 bg-slate-50 dark:bg-slate-900 z-20 shadow-r">Parameter</th>
            <th scope="col" className="px-4 py-3 font-semibold w-20">Unit</th>
            <th scope="col" className="px-4 py-3 font-semibold w-24 text-right">Limit</th>
            {sampleColumns.map((col) => (
              <th key={col} scope="col" className="px-4 py-3 font-semibold min-w-[100px] text-right">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {data.map((row, rowIndex) => (
            <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <td className="px-6 py-3 font-medium text-slate-400 dark:text-slate-500 sticky left-0 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700">{rowIndex + 1}</td>
              <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100 sticky left-12 bg-white dark:bg-slate-800 z-10 shadow-r">
                {row.parameterName}
              </td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.unit}</td>
              <td className="px-4 py-3 font-mono text-right text-slate-500 dark:text-slate-400">
                {row.type === 'min' ? '≥' : '≤'}{row.limit}
              </td>
              {sampleColumns.map((col) => (
                <td key={col} className="p-0 border-l border-slate-50 dark:border-slate-700">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full h-full px-4 py-3 text-right bg-transparent focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-all font-mono text-slate-700 dark:text-slate-200 placeholder-slate-200 dark:placeholder-slate-700"
                    value={row[col]}
                    placeholder="-"
                    onChange={(e) => handleCellChange(rowIndex, col, e.target.value)}
                    onBlur={(e) => handleBlur(rowIndex, col, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={4 + sampleColumns.length} className="px-6 py-8 text-center text-slate-400 italic">
                No data available. Select a standard and generate samples.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataEditor;