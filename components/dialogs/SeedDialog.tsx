import React, { useState } from 'react';
import { encodeStatsData, decodeStatsData } from '../../utils/stats-seed';
import { useStats } from '../StatsContext';
import type { VariableInfo, RawDataRow } from '../../types/statistics';

interface SeedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  variables: VariableInfo[];
  onEncoded: (seed: string) => void;
}

const SeedDialog: React.FC<SeedDialogProps> = ({ isOpen, onClose, isDarkMode, variables, onEncoded }) => {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [seedInput, setSeedInput] = useState('');
  const [generatedSeed, setGeneratedSeed] = useState('');
  const [error, setError] = useState('');
  const { dataRows, setVariables: setContextVariables, setDataRows: setContextDataRows, setDataLoaded } = useStats();

  if (!isOpen) return null;

  const handleEncode = () => {
    setError('');
    if (variables.length === 0 || dataRows.length === 0) {
      setError('No data loaded to encode');
      return;
    }
    const seed = encodeStatsData(variables, dataRows);
    if (!seed) {
      setError('Failed to encode data');
      return;
    }
    setGeneratedSeed(seed);
    onEncoded(seed);
  };

  const handleDecode = () => {
    setError('');
    if (!seedInput.trim()) {
      setError('Please enter a seed string');
      return;
    }
    const result = decodeStatsData(seedInput.trim());
    if (!result) {
      setError('Invalid seed string');
      return;
    }
    setContextVariables(result.variables);
    setContextDataRows(result.data);
    setDataLoaded(true);
    onEncoded(seedInput.trim());
    onClose();
  };

  const handleCopySeed = () => {
    navigator.clipboard.writeText(generatedSeed);
  };

  const bgColor = isDarkMode ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDarkMode ? 'border-slate-600' : 'border-slate-300';
  const textColor = isDarkMode ? 'text-slate-200' : 'text-slate-700';
  const inputBg = isDarkMode ? 'bg-slate-700' : 'bg-slate-50';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${bgColor} rounded-xl shadow-2xl w-full max-w-lg p-6 border ${borderColor}`} onClick={e => e.stopPropagation()}>
        <h2 className={`text-lg font-bold ${textColor} mb-4`}>Seed Encode/Decode</h2>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setMode('encode'); setError(''); setGeneratedSeed(''); }}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              mode === 'encode'
                ? 'bg-emerald-500 text-white'
                : isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Encode
          </button>
          <button
            onClick={() => { setMode('decode'); setError(''); setGeneratedSeed(''); }}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              mode === 'decode'
                ? 'bg-emerald-500 text-white'
                : isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Decode
          </button>
        </div>

        {mode === 'encode' ? (
          <div>
            <p className={`text-sm ${textColor} mb-4`}>
              Encode {variables.length} variables and {dataRows.length} rows into a seed string
            </p>
            <button
              onClick={handleEncode}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
            >
              Generate Seed
            </button>
            {generatedSeed && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm ${textColor}`}>Generated Seed:</span>
                  <button
                    onClick={handleCopySeed}
                    className="text-xs text-emerald-500 hover:text-emerald-400"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  readOnly
                  value={generatedSeed}
                  className={`w-full h-24 p-2 rounded-lg text-xs ${inputBg} ${textColor} border ${borderColor} font-mono`}
                />
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className={`text-sm ${textColor} mb-4`}>Paste a seed string to decode and load data</p>
            <textarea
              value={seedInput}
              onChange={e => setSeedInput(e.target.value)}
              placeholder="Paste seed string here..."
              className={`w-full h-32 p-3 rounded-lg text-sm ${inputBg} ${textColor} border ${borderColor} font-mono mb-4`}
            />
            <button
              onClick={handleDecode}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
            >
              Decode & Load Data
            </button>
          </div>
        )}

        {error && (
          <p className="text-rose-500 text-sm mt-3">{error}</p>
        )}

        <button
          onClick={onClose}
          className={`mt-4 w-full py-2 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'} rounded-lg font-medium transition-colors`}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default SeedDialog;
