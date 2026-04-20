import React, { useState, useRef, useCallback } from 'react';
import MenuBar from './SPSSMenuBar';
import VariableList from './SPSSVariableList';
import DataView from './SPSSDataView';
import OutputViewer from './SPSSOutputViewer';
import { useStats } from './StatsContext';
import DescriptivesDialog from './dialogs/DescriptivesDialog';
import FrequenciesDialog from './dialogs/FrequenciesDialog';
import TTestDialog from './dialogs/TTestDialog';
import ANOVADialog from './dialogs/ANOVADialog';
import CorrelationDialog from './dialogs/CorrelationDialog';
import RegressionDialog from './dialogs/RegressionDialog';
import PlotDialog from './dialogs/PlotDialog';
import SeedDialog from './dialogs/SeedDialog';
import ChiSquareDialog from './dialogs/ChiSquareDialog';
import { loadData, loadDirectDataToSession } from '../services/statistics-service';
import type { ContinuousResult, FrequencyResult, TTestResult, ANOVAResult, CorrelationResult, ChiSquareResult, LinearRegressionResult, LogisticRegressionResult, PlotResult } from '../types/statistics';

export interface SPSSPanelProps {
  isDarkMode: boolean;
}

// Custom resize handle component
interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  isDarkMode: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  isVisible: boolean;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ direction, isDarkMode, onMouseDown, isVisible }) => {
  if (!isVisible) return null;

  const isH = direction === 'horizontal';
  const baseClasses = isDarkMode
    ? 'bg-slate-600 hover:bg-emerald-500'
    : 'bg-slate-300 hover:bg-emerald-500';
  const cursorClass = isH ? 'cursor-col-resize' : 'cursor-row-resize';
  const dimensionClass = isH ? 'w-1 h-full' : 'h-1 w-full';

  return (
    <div
      className={`resize-handle ${dimensionClass} ${baseClasses} ${cursorClass} flex-shrink-0 transition-colors duration-150 relative z-10 group`}
      onMouseDown={onMouseDown}
    >
      <div className={`absolute ${isH ? 'left-0 top-1/2 -translate-y-1/2' : 'top-0 left-1/2 -translate-x-1/2'} ${isH ? 'w-1 h-8' : 'h-1 w-8'} rounded-full bg-current opacity-0 group-hover:opacity-60 transition-opacity duration-150`} />
    </div>
  );
};

const SPSSPanel: React.FC<SPSSPanelProps> = ({ isDarkMode }) => {
  const [showVariableList, setShowVariableList] = useState(true);
  const [showOutput, setShowOutput] = useState(true);
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [showSeedDialog, setShowSeedDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addOutput, variables: contextVariables, dataLoaded, sessionId, setVariables: setContextVariables, setDataRows: setContextDataRows, setDataLoaded, setSessionId, dataRows } = useStats();

  // Panel sizes (in pixels or percentage)
  const [varListWidth, setVarListWidth] = useState(224); // default ~56 * 4 = 224px (w-56)
  const [dataGridWidth, setDataGridWidth] = useState(65); // default 65% for Data Grid

  // Drag state refs
  const dragRef = useRef<{
    type: 'varList' | 'dataGrid' | null;
    startPos: number;
    startSize: number;
  }>({ type: null, startPos: 0, startSize: 0 });

  // Handle horizontal resize (Variable List width)
  const handleVarListResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      type: 'varList',
      startPos: e.clientX,
      startSize: varListWidth,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (dragRef.current.type !== 'varList') return;
      const delta = e.clientX - dragRef.current.startPos;
      const newWidth = Math.max(160, Math.min(400, dragRef.current.startSize + delta));
      setVarListWidth(newWidth);
    };

    const handleMouseUp = () => {
      dragRef.current.type = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [varListWidth]);

  // Handle horizontal resize (Data Grid / Output split)
  const handleDataGridOutputResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      type: 'dataGrid',
      startPos: e.clientX,
      startSize: dataGridWidth,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (dragRef.current.type !== 'dataGrid') return;
      const container = document.getElementById('data-output-area');
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const delta = e.clientX - dragRef.current.startPos;
      const deltaPercent = (delta / containerWidth) * 100;
      const newWidth = Math.max(20, Math.min(75, dragRef.current.startSize + deltaPercent));
      setDataGridWidth(newWidth);
    };

    const handleMouseUp = () => {
      dragRef.current.type = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [dataGridWidth]);

  const handleVarSelect = (varName: string, multi: boolean) => {
    setSelectedVariables(prev => {
      if (multi) {
        if (prev.includes(varName)) {
          return prev.filter(v => v !== varName);
        } else {
          return [...prev, varName];
        }
      } else {
        return [varName];
      }
    });
  };

  const handleMenuAction = async (action: string, data?: unknown) => {
    if (action === 'view.toggleVariableList') {
      setShowVariableList(prev => !prev);
      return;
    }
    if (action === 'view.toggleOutput') {
      setShowOutput(prev => !prev);
      return;
    }
    if (action === 'data.seedEncodeDecode') {
      setShowSeedDialog(true);
      return;
    }
    if (action === 'data.sendToR') {
      if (dataRows.length > 0) {
        try {
          const sid = await loadDirectDataToSession(contextVariables, dataRows);
          setSessionId(sid);
          addOutput({ type: 'text', title: 'Send to R', tableData: { content: `Data sent to R:\n${contextVariables.length} variables\n${dataRows.length} rows\nSession: ${sid}` } });
        } catch (err) {
          addOutput({ type: 'text', title: 'Send to R', tableData: { content: `Error: ${err instanceof Error ? err.message : 'Failed to send to R'}` } });
        }
      } else {
        addOutput({ type: 'text', title: 'Send to R', tableData: { content: 'No data loaded to send to R' } });
      }
      return;
    }

    // Map menu actions to dialogs
    if (action === 'stats.descriptives') { setActiveDialog('descriptives'); return; }
    if (action === 'stats.frequencies') { setActiveDialog('frequencies'); return; }
    if (action === 'stats.ttest.independent') { setActiveDialog('ttest'); return; }
    if (action === 'stats.ttest.paired') { setActiveDialog('ttest'); return; }
    if (action === 'stats.anova') { setActiveDialog('anova'); return; }
    if (action === 'stats.correlation.pearson') { setActiveDialog('correlation'); return; }
    if (action === 'stats.correlation.spearman') { setActiveDialog('correlation'); return; }
    if (action === 'stats.regression.linear') { setActiveDialog('regression'); return; }
    if (action === 'stats.regression.logistic') { setActiveDialog('regression'); return; }
    if (action === 'stats.chisquare') { setActiveDialog('chisquare'); return; }
    if (action.startsWith('graphs.')) { setActiveDialog('plot'); return; }

    // For file actions
    if (action === 'file.open') {
      fileInputRef.current?.click();
      return;
    }
    if (action === 'file.new') {
      setContextVariables([]);
      setContextDataRows([]);
      setSelectedVariables([]);
      return;
    }

    const actionLabels: Record<string, string> = {
      'file.importSeed': 'Import Seed',
      'file.exportSeed': 'Export Seed',
      'file.exportResults': 'Export Results',
      'data.sendToR': 'Send to R',
      'data.seedEncodeDecode': 'Seed Encode/Decode',
    };
    const label = actionLabels[action] || action;
    alert(`${label}\n\nThis feature will be implemented.`);
  };

  // Dialog result handlers that transform results and add to output
  const handleDescriptivesResult = (results: ContinuousResult[]) => {
    addOutput({ type: 'descriptives', title: 'Descriptive Statistics', tableData: results });
  };

  const handleFrequenciesResult = (results: FrequencyResult[]) => {
    addOutput({ type: 'freq', title: 'Frequencies', tableData: results });
  };

  const handleTTestResult = (result: TTestResult) => {
    const title = result.test === 'independent' ? 'Independent T-Test' : 'Paired T-Test';
    addOutput({ type: 'ttest', title, tableData: result });
  };

  const handleANOVAResult = (result: ANOVAResult) => {
    addOutput({ type: 'anova', title: 'One-Way ANOVA', tableData: result });
  };

  const handleCorrelationResult = (result: CorrelationResult) => {
    const title = result.method === 'pearson' ? 'Pearson Correlation' : 'Spearman Correlation';
    addOutput({ type: 'correlation', title, tableData: result });
  };

  const handleChiSquareResult = (result: ChiSquareResult) => {
    addOutput({ type: 'chisquare', title: 'Chi-Square Test', tableData: result });
  };

  const handleLinearRegressionResult = (result: LinearRegressionResult) => {
    addOutput({ type: 'regression', title: 'Linear Regression', tableData: result });
  };

  const handleLogisticRegressionResult = (result: LogisticRegressionResult) => {
    addOutput({ type: 'regression', title: 'Logistic Regression', tableData: result });
  };

  const handlePlotResult = (result: PlotResult) => {
    addOutput({ type: 'plot', title: `${result.plot_type.charAt(0).toUpperCase() + result.plot_type.slice(1)} Plot`, plotHtml: result.html_content });
  };

  const handleFileOpen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    console.log('[DEBUG] handleFileOpen called, file:', file.name, 'ext:', ext);

    try {
      let result;
      if (ext === 'csv') {
        // Client-side CSV parsing
        console.log('[DEBUG] Parsing CSV...');
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          alert('CSV must have a header row and at least 1 data row.');
          return;
        }

        const headerLine = lines[0];
        const delimiter = headerLine.includes('\t') ? '\t' : ',';
        const headers = headerLine.split(delimiter).map((h) => h.trim().replace(/"/g, ''));

        console.log('[DEBUG] CSV headers:', headers);

        const newVars = headers.map((h, i) => ({
          name: `var${i + 1}`,
          label: h,
          type: 'numeric' as const,
          missing_count: 0,
        }));

        const newData: Record<string, string>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(delimiter).map((v) => v.trim().replace(/"/g, ''));
          const row: Record<string, string> = {};
          newVars.forEach((v, j) => {
            row[v.name] = values[j] ?? '';
          });
          newData.push(row);
        }

        setContextVariables(newVars);
        setContextDataRows(newData);
        setDataLoaded(true);
        const sid = await loadDirectDataToSession(newVars, newData);
        setSessionId(sid);
        console.log('[DEBUG] CSV loaded - vars:', newVars.length, 'rows:', newData.length);
      } else if (ext === 'xlsx' || ext === 'xls') {
        // Use R via sidecar for Excel - read file as ArrayBuffer and upload
        console.log('[DEBUG] Loading Excel via R...');
        const excelBuffer = await file.arrayBuffer();
        result = await loadData(file.name, 'excel', excelBuffer);
        setContextVariables(result.variables);
        setContextDataRows(result.data);
        setDataLoaded(true);
        if (result.session_id) setSessionId(result.session_id);
        console.log('[DEBUG] Excel loaded - vars:', result.variables.length, 'rows:', result.row_count);
        alert(`Loaded ${result.row_count} rows, ${result.variables.length} variables from Excel`);
      } else if (ext === 'sav') {
        // Use R via sidecar for SPSS - read file as ArrayBuffer and upload
        console.log('[DEBUG] Loading SPSS via R...');
        const savBuffer = await file.arrayBuffer();
        result = await loadData(file.name, 'sav', savBuffer);
        setContextVariables(result.variables);
        setContextDataRows(result.data);
        setDataLoaded(true);
        if (result.session_id) setSessionId(result.session_id);
        console.log('[DEBUG] SPSS loaded - vars:', result.variables.length, 'rows:', result.row_count);
        alert(`Loaded ${result.row_count} rows, ${result.variables.length} variables from SPSS`);
      } else {
        alert('Unsupported file type. Use CSV, Excel (.xlsx/.xls), or SPSS (.sav)');
      }
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Enhanced color scheme: Navy primary (#1E3A5F) + Green accent (#059669)
  const bgColor = isDarkMode ? 'bg-slate-900' : 'bg-slate-50';
  const borderColor = isDarkMode ? 'border-slate-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-slate-200' : 'text-slate-700';
  const mutedText = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const statusBg = isDarkMode ? 'bg-slate-800' : 'bg-white';
  // Accent colors for visual enhancement
  const accentColor = 'text-emerald-500';
  const accentBgHover = isDarkMode ? 'hover:bg-emerald-900/30' : 'hover:bg-emerald-50';
  const primaryBadge = isDarkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700';

  // Use context variables if available, otherwise use empty array
  const displayVariables = contextVariables.length > 0 ? contextVariables : [];

  return (
    <div className={`flex flex-col h-full ${bgColor} transition-colors duration-300`}>
      {/* Hidden file input for File > Open */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.sav"
        onChange={handleFileOpen}
        className="hidden"
      />

      {/* Top Menu Bar */}
      <MenuBar isDarkMode={isDarkMode} onMenuAction={handleMenuAction} />

      {/* Main Content Area */}
      <div id="main-content-area" className="flex flex-1 overflow-hidden">
        {/* Left Panel - Variable List */}
        <div
          className={`flex-shrink-0 border-r ${borderColor} transition-[width] duration-200 ease-out overflow-hidden ${
            showVariableList ? 'opacity-100' : 'w-0 opacity-0'
          }`}
          style={showVariableList ? { width: varListWidth } : undefined}
        >
          {showVariableList && (
            <VariableList
              isDarkMode={isDarkMode}
              selectedVariables={selectedVariables}
              onVarSelect={handleVarSelect}
              variables={displayVariables}
            />
          )}
        </div>

        {/* Horizontal Resize Handle (Variable List) */}
        <ResizeHandle
          direction="horizontal"
          isDarkMode={isDarkMode}
          onMouseDown={handleVarListResizeStart}
          isVisible={showVariableList}
        />

        {/* Right side - Data Grid and Output side-by-side */}
        <div id="data-output-area" className="flex-1 flex overflow-hidden">
          {/* Center Panel - Data Grid */}
          <div
            className="overflow-hidden transition-[width] duration-200"
            style={{ width: showOutput ? `${dataGridWidth}%` : '100%' }}
          >
            <DataView
              isDarkMode={isDarkMode}
              selectedVariables={selectedVariables}
            />
          </div>

          {/* Horizontal Resize Handle (Data Grid / Output) */}
          <ResizeHandle
            direction="horizontal"
            isDarkMode={isDarkMode}
            onMouseDown={handleDataGridOutputResizeStart}
            isVisible={showOutput}
          />

          {/* Right Panel - Output Viewer */}
          <div
            className={`border-l ${borderColor} transition-all duration-200 ease-out overflow-hidden ${
              showOutput ? 'opacity-100' : 'w-0 opacity-0'
            }`}
            style={showOutput ? { width: `${100 - dataGridWidth}%` } : undefined}
          >
            {showOutput && (
              <OutputViewer isDarkMode={isDarkMode} />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className={`flex items-center justify-between px-4 py-1.5 text-xs ${statusBg} border-t ${borderColor} ${mutedText} transition-colors duration-300`}>
        <div className="flex items-center gap-4">
          <span>
            {dataLoaded
              ? `Session: ${sessionId || 'Active'} | ${contextVariables.length} variables`
              : 'No data loaded'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {showOutput && (
            <span className="text-emerald-600 dark:text-emerald-400">Data Grid: {dataGridWidth}% | Output: {100 - dataGridWidth}%</span>
          )}
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${dataLoaded ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            R {dataLoaded ? 'Connected' : 'Standby'}
          </span>
        </div>
      </div>

      {/* Dialogs */}
      {activeDialog === 'descriptives' && (
        <DescriptivesDialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          isDarkMode={isDarkMode}
          variables={displayVariables}
          selectedVariables={selectedVariables}
          onRun={handleDescriptivesResult}
        />
      )}
      {activeDialog === 'frequencies' && (
        <FrequenciesDialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          isDarkMode={isDarkMode}
          variables={displayVariables}
          selectedVariables={selectedVariables}
          onRun={handleFrequenciesResult}
        />
      )}
      {activeDialog === 'ttest' && (
        <TTestDialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          isDarkMode={isDarkMode}
          variables={displayVariables}
          selectedVariables={selectedVariables}
          onRun={handleTTestResult}
        />
      )}
      {activeDialog === 'anova' && (
        <ANOVADialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          isDarkMode={isDarkMode}
          variables={displayVariables}
          selectedVariables={selectedVariables}
          onRun={handleANOVAResult}
        />
      )}
      {activeDialog === 'correlation' && (
        <CorrelationDialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          isDarkMode={isDarkMode}
          variables={displayVariables}
          selectedVariables={selectedVariables}
          onRun={handleCorrelationResult}
        />
      )}
      {activeDialog === 'regression' && (
        <RegressionDialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          isDarkMode={isDarkMode}
          variables={displayVariables}
          selectedVariables={selectedVariables}
          onRunLinear={handleLinearRegressionResult}
          onRunLogistic={handleLogisticRegressionResult}
        />
      )}
      {activeDialog === 'plot' && (
        <PlotDialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          isDarkMode={isDarkMode}
          variables={displayVariables}
          selectedVariables={selectedVariables}
          onRun={handlePlotResult}
        />
      )}
      {activeDialog === 'chisquare' && (
        <ChiSquareDialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          isDarkMode={isDarkMode}
          variables={displayVariables}
          selectedVariables={selectedVariables}
          onRun={handleChiSquareResult}
        />
      )}
      {showSeedDialog && (
        <SeedDialog
          isOpen={true}
          onClose={() => setShowSeedDialog(false)}
          isDarkMode={isDarkMode}
          variables={displayVariables}
          onEncoded={(seed) => {
            addOutput({ type: 'text', title: 'Seed Generated', tableData: { content: seed } });
          }}
        />
      )}
    </div>
  );
};

export default SPSSPanel;