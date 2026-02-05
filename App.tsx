import React, { useState, useEffect, useMemo } from 'react';
import { STANDARDS } from './constants';
import { loadRegulations, saveRegulations, addRegulation, updateRegulation, deleteRegulation, resetRegulations } from './services/regulations';
import { generateMockData, assessCompliance, encodeDatasetToSeed } from './utils/logic';
import { SampleRow, AssessmentResult, QCVNStandard } from './types';
import DataEditor from './components/DataEditor';
import Dashboard from './components/Dashboard';
import RegulationManager from './components/RegulationManager';

// Icons
const ChartBarIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const TableIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const RefreshIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
const MoonIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const SunIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MenuIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const ChevronLeftIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const SettingsIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

function App() {
  // --- State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [regulations, setRegulations] = useState<QCVNStandard[]>([]);
  const [isLoadingRegulations, setIsLoadingRegulations] = useState(true);
  const [selectedStandardId, setSelectedStandardId] = useState<string>("");
  const [seed, setSeed] = useState<string>("enviro-2024");
  const [randomizeSeed, setRandomizeSeed] = useState<boolean>(false);
  const [sampleCount, setSampleCount] = useState<number>(3);
  const [activeTab, setActiveTab] = useState<'input' | 'analysis' | 'settings'>('input');
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  const [data, setData] = useState<SampleRow[]>([]);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);

  // Derived state
  const selectedStandard = useMemo(() => 
    regulations.find(s => s.id === selectedStandardId) || regulations[0] || null, 
  [regulations, selectedStandardId]);

  const sampleColumns = useMemo(() => {
    return Array.from({ length: sampleCount }, (_, i) => `Sample ${i + 1}`);
  }, [sampleCount]);

  // Load regulations on mount
  useEffect(() => {
    const loadRegs = async () => {
      setIsLoadingRegulations(true);
      try {
        const loadedRegs = await loadRegulations();
        setRegulations(loadedRegs);
        if (loadedRegs.length > 0 && !selectedStandardId) {
          setSelectedStandardId(loadedRegs[0].id);
        }
      } catch (error) {
        console.error("Failed to load regulations:", error);
        setRegulations(STANDARDS);
        if (STANDARDS.length > 0 && !selectedStandardId) {
          setSelectedStandardId(STANDARDS[0].id);
        }
      } finally {
        setIsLoadingRegulations(false);
      }
    };
    loadRegs();
  }, []);

  // --- Handlers ---
  
  // Toggle Dark Mode Class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleGenerate = () => {
    if (!selectedStandard) return;
    let currentSeed = seed;
    if (randomizeSeed) {
      currentSeed = Math.random().toString(36).substring(2, 9);
      setSeed(currentSeed);
    }
    const newData = generateMockData(selectedStandard, currentSeed, sampleCount);
    setData(newData);
    runAssessment(newData);
  };

  const runAssessment = (currentData: SampleRow[]) => {
    const results = assessCompliance(currentData, sampleColumns, 0.8);
    setAssessmentResults(results);
  };

  const handleDataChange = (newData: SampleRow[]) => {
    setData(newData);
    runAssessment(newData);
    
    const newSeed = encodeDatasetToSeed(newData, sampleCount);
    if (newSeed) {
      setSeed(newSeed);
    }
  };

  // Initial load
  useEffect(() => {
    if (selectedStandard && data.length === 0) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStandard]);

  // Regulation management handlers
  const handleAddRegulation = async (newReg: QCVNStandard) => {
    const updated = await addRegulation(regulations, newReg);
    setRegulations(updated);
  };

  const handleUpdateRegulation = async (updatedReg: QCVNStandard) => {
    const updated = await updateRegulation(regulations, updatedReg);
    setRegulations(updated);
  };

  const handleDeleteRegulation = async (regId: string) => {
    const updated = await deleteRegulation(regulations, regId);
    setRegulations(updated);
    if (selectedStandardId === regId && updated.length > 0) {
      setSelectedStandardId(updated[0].id);
    }
  };

  const handleResetRegulations = async () => {
    const defaults = await resetRegulations();
    setRegulations(defaults);
    if (defaults.length > 0) {
      setSelectedStandardId(defaults[0].id);
    }
  };

  const handleImportRegulations = async (importedRegs: QCVNStandard[]) => {
    await saveRegulations(importedRegs);
    setRegulations(importedRegs);
    if (importedRegs.length > 0) {
      setSelectedStandardId(importedRegs[0].id);
    }
  };

  if (isLoadingRegulations) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading regulations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
      
      {/* Sidebar Controls */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden transition-[width] duration-300 ease-in-out flex-shrink-0`}>
        <div className="w-80 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-sm whitespace-nowrap">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
          <div>
            <div className={`flex items-center gap-2 mb-1`}>
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">EA</div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">EnviroAnalyzer</h1>
            </div>
            <p className={`text-xs text-slate-400 dark:text-slate-500 font-medium`}>Professional Compliance Tool</p>
          </div>
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8 whitespace-normal">
          
          {/* Standard Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Regulation (QCVN)</label>
             <select
               value={selectedStandardId}
               onChange={(e) => setSelectedStandardId(e.target.value)}
               disabled={regulations.length === 0}
               className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
               style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
             >
              {regulations.length === 0 && (
                <option value="">No regulations available</option>
              )}
              {regulations.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {selectedStandard && (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {selectedStandard.description}
              </p>
            )}
          </div>

          {/* Generator Config */}
          <div className="space-y-4">
             <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Data Generator</label>
             
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Samples</label>
                  <input 
                    type="number" 
                    min="1" max="20"
                    value={sampleCount}
                    onChange={(e) => setSampleCount(parseInt(e.target.value) || 1)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-700 dark:text-slate-300"
                  />
               </div>
                <div>
                   <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Seed String</label>
                   <div className="relative">
                     <input 
                       type="text" 
                       value={seed}
                       onChange={(e) => setSeed(e.target.value)}
                       className="w-full p-2 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-700 dark:text-slate-300"
                     />
                     <button
                       onClick={() => navigator.clipboard.writeText(seed)}
                       className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                       title="Copy seed to clipboard"
                     >
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                       </svg>
                     </button>
                   </div>
                </div>
             </div>

             <button 
                 onClick={handleGenerate}
                 disabled={!selectedStandard}
                 className="w-full flex items-center justify-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white py-2.5 px-4 rounded-md text-sm font-medium transition-all shadow-sm active:scale-[0.98] disabled:cursor-not-allowed"
              >
                 <RefreshIcon />
                 Generate Dataset
              </button>

              <div className="flex items-center justify-between mt-3">
                 <span className="text-xs text-slate-500 dark:text-slate-400 select-none">
                   Randomize seed
                 </span>
                 <button
                   onClick={() => setRandomizeSeed(!randomizeSeed)}
                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                     randomizeSeed ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                   }`}
                   role="switch"
                   aria-checked={randomizeSeed}
                 >
                   <span
                     className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out ${
                       randomizeSeed ? 'translate-x-6' : 'translate-x-1'
                     }`}
                   />
                 </button>
              </div>
          </div>

           {/* Stats Summary Mini */}
           <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
             <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Quick Status</label>
             <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Pass</span>
                <span className="font-mono font-bold dark:text-slate-200">{assessmentResults.filter(r => r.status === 'Pass').length}</span>
             </div>
             <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Warning</span>
                <span className="font-mono font-bold dark:text-slate-200">{assessmentResults.filter(r => r.status === 'Warning').length}</span>
             </div>
             <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Fail</span>
                <span className="font-mono font-bold dark:text-slate-200">{assessmentResults.filter(r => r.status === 'Fail').length}</span>
             </div>
           </div>
        </div>
      </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Top Navigation / Tabs */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-6 justify-between shrink-0 transition-colors duration-300">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                {isSidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
              </button>

              <div className="flex space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveTab('input')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'input' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                <TableIcon /> Data Input
              </button>
              <button 
                onClick={() => setActiveTab('analysis')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'analysis' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                <ChartBarIcon /> Analysis Report
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'settings' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                <SettingsIcon /> Settings
              </button>
            </div>
            </div>

            <div className="flex items-center gap-3">
               <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded border border-slate-100 dark:border-slate-700">
                 Auto-save enabled
               </span>
            </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 p-6 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 transition-colors duration-300">
          {activeTab === 'input' && (
            <div className="h-full flex flex-col animate-in fade-in duration-300">
              <div className="mb-4 flex justify-between items-end">
                <div>
                   <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Raw Data Matrix</h2>
                   <p className="text-sm text-slate-500 dark:text-slate-400">Edit values directly in the grid. Compliance is calculated automatically.</p>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <DataEditor 
                  data={data} 
                  sampleColumns={sampleColumns} 
                  onDataChange={handleDataChange} 
                />
              </div>
            </div>
          )}
          {activeTab === 'analysis' && (
            <div className="h-full flex flex-col animate-in fade-in duration-300">
               <div className="mb-4">
                   <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Compliance Assessment</h2>
                   <p className="text-sm text-slate-500 dark:text-slate-400">
                     {selectedStandard 
                       ? `Visualizing ${data.length} parameters across ${sampleCount} samples against ${selectedStandard.name}.`
                       : "No regulation selected. Please select a regulation from the sidebar or create one in Settings."}
                   </p>
                </div>
               <div className="flex-1 min-h-0">
                 <Dashboard results={assessmentResults} isDarkMode={isDarkMode} />
               </div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="h-full flex flex-col animate-in fade-in duration-300">
               <div className="mb-4">
                   <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Regulation Settings</h2>
                   <p className="text-sm text-slate-500 dark:text-slate-400">Manage your environmental regulations. Changes are automatically saved.</p>
                </div>
               <div className="flex-1 min-h-0 overflow-auto">
                 <RegulationManager
                   regulations={regulations}
                   onAdd={handleAddRegulation}
                   onUpdate={handleUpdateRegulation}
                   onDelete={handleDeleteRegulation}
                   onReset={handleResetRegulations}
                   onImport={handleImportRegulations}
                   isDarkMode={isDarkMode}
                 />
               </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

export default App;
