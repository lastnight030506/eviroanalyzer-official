import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { VariableInfo, RawDataRow } from '../types/statistics';

export interface OutputItem {
  id: string;
  type: 'descriptives' | 'anova' | 'ttest' | 'correlation' | 'plot' | 'regression' | 'freq' | 'text' | 'chisquare';
  title: string;
  timestamp: string;
  tableData?: unknown;
  plotHtml?: string;
  // For collapsible groups
  children?: OutputItem[];
  collapsed?: boolean;
}

interface StatsContextValue {
  sessionId: string;
  variables: VariableInfo[];
  dataRows: RawDataRow[];
  dataLoaded: boolean;
  outputItems: OutputItem[];
  setSessionId: (id: string) => void;
  setVariables: (vars: VariableInfo[]) => void;
  setDataRows: (rows: RawDataRow[]) => void;
  setDataLoaded: (loaded: boolean) => void;
  addOutput: (item: Omit<OutputItem, 'id' | 'timestamp'>) => void;
  removeOutput: (id: string) => void;
  clearOutput: () => void;
  toggleOutputCollapse: (id: string) => void;
}

const StatsContext = createContext<StatsContextValue | null>(null);

const STORAGE_KEY = 'stats_output_items';

export const StatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [variables, setVariables] = useState<VariableInfo[]>([]);
  const [dataRows, setDataRows] = useState<RawDataRow[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [outputItems, setOutputItems] = useState<OutputItem[]>([]);

  // Persist output items to localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setOutputItems(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(outputItems));
    } catch {
      // Ignore
    }
  }, [outputItems]);

  // Also sync session ID to localStorage (for panels that read it)
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('stats_session_id', sessionId);
    }
  }, [sessionId]);

  const addOutput = useCallback((item: Omit<OutputItem, 'id' | 'timestamp'>) => {
    const newItem: OutputItem = {
      ...item,
      id: `${item.type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setOutputItems(prev => [...prev, newItem]);
  }, []);

  const removeOutput = useCallback((id: string) => {
    setOutputItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearOutput = useCallback(() => {
    setOutputItems([]);
  }, []);

  const toggleOutputCollapse = useCallback((id: string) => {
    setOutputItems(prev => prev.map(item =>
      item.id === id ? { ...item, collapsed: !item.collapsed } : item
    ));
  }, []);

  const value = useMemo(() => ({
    sessionId,
    variables,
    dataRows,
    dataLoaded,
    outputItems,
    setSessionId,
    setVariables,
    setDataRows,
    setDataLoaded,
    addOutput,
    removeOutput,
    clearOutput,
    toggleOutputCollapse,
  }), [sessionId, variables, dataRows, dataLoaded, outputItems, addOutput, removeOutput, clearOutput, toggleOutputCollapse]);

  return (
    <StatsContext.Provider value={value}>
      {children}
    </StatsContext.Provider>
  );
};

export const useStats = (): StatsContextValue => {
  const ctx = useContext(StatsContext);
  if (!ctx) {
    throw new Error('useStats must be used within StatsProvider');
  }
  return ctx;
};

// Convenience hooks
export const useSessionId = () => useStats().sessionId;
export const useStatsVariables = () => useStats().variables;
export const useStatsDataLoaded = () => useStats().dataLoaded;
export const useStatsDataRows = () => useStats().dataRows;
