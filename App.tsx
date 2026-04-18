import React, { useState, useEffect, lazy, Suspense } from 'react';
import { StatsProvider } from './components/StatsContext';

const Forecast = lazy(() => import('./components/Forecast'));
const GISMap = lazy(() => import('./components/GISMap'));
const SPSSPanel = lazy(() => import('./components/SPSSPanel'));
const RegulationManager = lazy(() => import('./components/RegulationManager'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
    <span className="ml-3 text-slate-500 dark:text-slate-400">Loading...</span>
  </div>
);

// Icons
const SunIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const SettingsIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TrendingUpIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const MapIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>;

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'workspace' | 'forecast' | 'gis' | 'settings'>('workspace');
  const [rStatus, setRStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [rVersion, setRVersion] = useState<string | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const checkR = async () => {
      try {
        const { checkRHealth } = await import('./services/r-sidecar');
        const health = await checkRHealth();
        setRStatus('available');
        setRVersion(health.r_version);
      } catch {
        setRStatus('unavailable');
      }
    };
    checkR();
  }, []);

  return (
    <StatsProvider>
      <div className="flex h-screen bg-slate-100 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-6 justify-between shrink-0 w-full fixed top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">EA</div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">EnviroAnalyzer</h1>
            </div>

            <div className="flex space-x-1 bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-1 rounded-xl ml-6 shadow-inner">
              <button
                onClick={() => setActiveTab('workspace')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'workspace'
                    ? 'bg-white dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shadow-lg shadow-emerald-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Data
              </button>
              <button
                onClick={() => setActiveTab('forecast')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'forecast'
                    ? 'bg-white dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shadow-lg shadow-emerald-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <TrendingUpIcon /> Forecast
              </button>
              <button
                onClick={() => setActiveTab('gis')}
                disabled={rStatus !== 'available'}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'gis'
                    ? 'bg-white dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shadow-lg shadow-emerald-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <MapIcon /> GIS
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'settings'
                    ? 'bg-white dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shadow-lg shadow-emerald-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <SettingsIcon /> Settings
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded border ${
              rStatus === 'available'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : rStatus === 'unavailable'
                ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                rStatus === 'available' ? 'bg-emerald-500' :
                rStatus === 'unavailable' ? 'bg-rose-500' : 'bg-slate-400 animate-pulse'
              }`}></span>
              {rStatus === 'available' ? `R ${rVersion}` : rStatus === 'unavailable' ? 'R N/A' : 'Checking...'}
            </div>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-500 dark:text-slate-300 hover:from-emerald-100 hover:to-emerald-100 dark:hover:from-emerald-900/40 dark:hover:to-emerald-900/40 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-md transition-all duration-200 active:scale-95"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col h-full overflow-hidden relative pt-16">
          <div className="flex-1 p-6 overflow-hidden">
            {activeTab === 'workspace' && (
              <Suspense fallback={<LoadingFallback />}>
                <SPSSPanel isDarkMode={isDarkMode} />
              </Suspense>
            )}
            {activeTab === 'forecast' && (
              <div className="h-full animate-in fade-in duration-300">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Time Series Forecasting</h2>
                <Suspense fallback={<LoadingFallback />}>
                  <Forecast isDarkMode={isDarkMode} />
                </Suspense>
              </div>
            )}
            {activeTab === 'gis' && (
              <div className="h-full animate-in fade-in duration-300">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Geospatial Analysis</h2>
                <Suspense fallback={<LoadingFallback />}>
                  <GISMap isDarkMode={isDarkMode} />
                </Suspense>
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="h-full animate-in fade-in duration-300 overflow-auto">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Settings</h2>
                <Suspense fallback={<LoadingFallback />}>
                  <RegulationManager
                    regulations={[]}
                    onAdd={() => {}}
                    onUpdate={() => {}}
                    onDelete={() => {}}
                    onReset={() => {}}
                    onImport={() => {}}
                    isDarkMode={isDarkMode}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </main>
      </div>
    </StatsProvider>
  );
}

export default App;