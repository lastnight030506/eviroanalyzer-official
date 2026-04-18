import React, { useState, useRef, useEffect } from 'react';

export interface SPSSMenuBarProps {
  isDarkMode: boolean;
  onMenuAction: (action: string, data?: unknown) => void;
}

interface MenuItem {
  label: string;
  action?: string;
  submenu?: MenuItem[];
  divider?: boolean;
}

interface MenuDefinition {
  label: string;
  items: (MenuItem | { divider: true })[];
}

const MENU_DATA: MenuDefinition[] = [
  {
    label: 'File',
    items: [
      { label: 'New Data Set', action: 'file.new' },
      { divider: true },
      { label: 'Open File... (CSV, Excel, SPSS)', action: 'file.open' },
      { divider: true },
      { label: 'Import Seed...', action: 'file.importSeed' },
      { label: 'Export Seed...', action: 'file.exportSeed' },
      { divider: true },
      { label: 'Export Results...', action: 'file.exportResults' },
    ],
  },
  {
    label: 'Data',
    items: [
      { label: 'Send to R', action: 'data.sendToR' },
      { divider: true },
      { label: 'Variable List (toggle)', action: 'data.toggleVariableList' },
      { divider: true },
      { label: 'Seed Encode/Decode', action: 'data.seedEncodeDecode' },
    ],
  },
  {
    label: 'Statistics',
    items: [
      { label: 'Descriptive Statistics...', action: 'stats.descriptives' },
      { label: 'Frequencies...', action: 'stats.frequencies' },
      { divider: true },
      {
        label: 'Compare Means',
        submenu: [
          { label: 'Independent T-Test...', action: 'stats.ttest.independent' },
          { label: 'Paired T-Test...', action: 'stats.ttest.paired' },
          { label: 'One-Way ANOVA...', action: 'stats.anova' },
        ],
      },
      {
        label: 'Correlation',
        submenu: [
          { label: 'Pearson...', action: 'stats.correlation.pearson' },
          { label: 'Spearman...', action: 'stats.correlation.spearman' },
        ],
      },
      {
        label: 'Regression',
        submenu: [
          { label: 'Linear...', action: 'stats.regression.linear' },
          { label: 'Logistic...', action: 'stats.regression.logistic' },
        ],
      },
      { label: 'Chi-Square...', action: 'stats.chisquare' },
    ],
  },
  {
    label: 'Graphs',
    items: [
      { label: 'Histogram...', action: 'graphs.histogram' },
      { label: 'Boxplot...', action: 'graphs.boxplot' },
      { label: 'Scatter...', action: 'graphs.scatter' },
      { label: 'Bar Chart...', action: 'graphs.bar' },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Variable List (show/hide)', action: 'view.toggleVariableList' },
      { label: 'Output (show/hide)', action: 'view.toggleOutput' },
    ],
  },
];

const MenuBar: React.FC<SPSSMenuBarProps> = ({ isDarkMode, onMenuAction }) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setActiveSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menuLabel: string) => {
    setOpenMenu(openMenu === menuLabel ? null : menuLabel);
    setActiveSubmenu(null);
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.action) {
      onMenuAction(item.action);
      setOpenMenu(null);
      setActiveSubmenu(null);
    } else if (item.submenu) {
      setActiveSubmenu(item.label);
    }
  };

  // Enhanced color scheme with accent colors
  const bgColor = isDarkMode ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDarkMode ? 'border-slate-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-slate-200' : 'text-slate-700';
  const hoverBg = isDarkMode ? 'hover:bg-emerald-900/30 hover:text-emerald-400' : 'hover:bg-emerald-50 hover:text-emerald-700';
  const activeBg = isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700';
  const dropdownBg = isDarkMode ? 'bg-slate-800' : 'bg-white';
  const dividerColor = isDarkMode ? 'border-slate-700' : 'border-slate-200';

  return (
    <div
      ref={menuRef}
      className={`flex items-center ${bgColor} border-b ${borderColor} text-sm ${textColor} transition-colors duration-200`}
    >
      {MENU_DATA.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            onClick={() => handleMenuClick(menu.label)}
            className={`px-4 py-2.5 ${hoverBg} transition-all duration-150 rounded-md mx-1 ${
              openMenu === menu.label ? activeBg : ''
            }`}
          >
            {menu.label}
          </button>

          {openMenu === menu.label && (
            <div
              className={`absolute top-full left-0 min-w-56 ${dropdownBg} border ${borderColor} shadow-xl rounded-lg z-50 py-1 backdrop-blur-sm animate-dropdown ${isDarkMode ? 'bg-slate-800/95' : 'bg-white/95'}`}
            >
              {menu.items.map((item, idx) => {
                if ('divider' in item && item.divider) {
                  return (
                    <div key={idx} className={`border-t ${dividerColor} my-1`} />
                  );
                }

                const menuItem = item as MenuItem;
                const hasSubmenu = !!menuItem.submenu;
                const isActive = activeSubmenu === menuItem.label;

                return (
                  <div key={menuItem.label} className="relative">
                    <button
                      onClick={() => handleItemClick(menuItem)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-left ${hoverBg} transition-all duration-150 ${
                        isActive ? activeBg : ''
                      }`}
                    >
                      <span>{menuItem.label}</span>
                      {hasSubmenu && (
                        <span className="ml-2 text-xs opacity-60">▶</span>
                      )}
                    </button>

                    {hasSubmenu && isActive && (
                      <div
                        className={`absolute top-0 left-full min-w-48 ${dropdownBg} border ${borderColor} shadow-xl rounded-lg py-1 z-50 animate-dropdown-right ${isDarkMode ? 'bg-slate-800/95' : 'bg-white/95'}`}
                      >
                        {menuItem.submenu!.map((subItem) => (
                          <button
                            key={subItem.label}
                            onClick={() => handleItemClick(subItem)}
                            className={`w-full px-4 py-2 text-left ${hoverBg} transition-all duration-150`}
                          >
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Right side - R session indicator with enhanced styling */}
      <div className="ml-auto flex items-center gap-3 px-4">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-50'} border ${isDarkMode ? 'border-emerald-800' : 'border-emerald-200'}`}>
          <span className={`w-2 h-2 rounded-full bg-emerald-500 animate-pulse`} />
          <span className={`text-xs font-medium ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
            R Ready
          </span>
        </div>
      </div>
    </div>
  );
};

export default MenuBar;