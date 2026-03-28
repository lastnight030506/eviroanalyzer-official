import React, { useState, lazy, Suspense } from 'react';

const DataImporter = lazy(() => import('./DataImporter'));
const DescriptivesPanel = lazy(() => import('./DescriptivesPanel'));
const CompareMeansPanel = lazy(() => import('./CompareMeansPanel'));
const CorrelationPanel = lazy(() => import('./CorrelationPanel'));
const RegressionWizard = lazy(() => import('./RegressionWizard'));
const VisualizationPanel = lazy(() => import('./VisualizationPanel'));
const SyntaxLog = lazy(() => import('./SyntaxLog'));

interface Props {
  isDarkMode: boolean;
}

const subTabs = ['data', 'descriptives', 'compare', 'correlation', 'regression', 'visualize', 'syntax'] as const;
type SubTab = typeof subTabs[number];

const Statistics: React.FC<Props> = ({ isDarkMode }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('data');
  const [dataLoaded, setDataLoaded] = useState(false);

  const tabStyle = (tab: SubTab) => `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSubTab === tab ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 p-4 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {subTabs.map(tab => (
          <button key={tab} onClick={() => setActiveSubTab(tab)} className={tabStyle(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <Suspense fallback={<div className="text-center py-8 text-slate-500">Loading...</div>}>
          {activeSubTab === 'data' && <DataImporter isDarkMode={isDarkMode} selectedStandard={null} onDataLoaded={() => setDataLoaded(true)} />}
          {activeSubTab === 'descriptives' && <DescriptivesPanel isDarkMode={isDarkMode} dataLoaded={dataLoaded} />}
          {activeSubTab === 'compare' && <CompareMeansPanel isDarkMode={isDarkMode} dataLoaded={dataLoaded} />}
          {activeSubTab === 'correlation' && <CorrelationPanel isDarkMode={isDarkMode} dataLoaded={dataLoaded} />}
          {activeSubTab === 'regression' && <RegressionWizard isDarkMode={isDarkMode} dataLoaded={dataLoaded} />}
          {activeSubTab === 'visualize' && <VisualizationPanel isDarkMode={isDarkMode} dataLoaded={dataLoaded} />}
          {activeSubTab === 'syntax' && <SyntaxLog isDarkMode={isDarkMode} />}
        </Suspense>
      </div>
    </div>
  );
};

export default Statistics;
