import React from 'react';
import { AssessmentResult } from '../types';
import { getComplianceStats } from '../utils/logic';
import { COLORS } from '../constants';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface DashboardProps {
  results: AssessmentResult[];
  isDarkMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ results, isDarkMode }) => {
  const stats = getComplianceStats(results);
  
  // Dynamic Chart Styles based on Mode
  const chartStyles = {
    gridColor: isDarkMode ? '#334155' : '#e2e8f0', // slate-700 vs slate-200
    axisColor: isDarkMode ? '#94a3b8' : '#64748b', // slate-400 vs slate-500
    tooltipBg: isDarkMode ? '#1e293b' : '#ffffff', // slate-800
    tooltipBorder: isDarkMode ? '#334155' : '#e2e8f0',
    textColor: isDarkMode ? '#e2e8f0' : '#1e293b',
    legendColor: isDarkMode ? '#cbd5e1' : '#475569'
  };

  const pieData = [
    { name: 'Pass', value: stats.pass },
    { name: 'Warning', value: stats.warning },
    { name: 'Fail', value: stats.fail },
  ].filter(d => d.value > 0);

  const pieColors = {
    Pass: COLORS.success,
    Warning: COLORS.warning,
    Fail: COLORS.danger
  };

  // Filter out data for radar chart to avoid overcrowding (top 6 critical)
  const radarData = results.slice(0, 8).map(r => ({
    subject: r.parameterName,
    A: r.percentOfLimit,
    fullMark: 150, // Cap at 150% for visualization
  }));

  // Bar chart data: Compare Value vs Limit (Normalized to percentage for unified axis)
  const barData = results.map(r => ({
    name: r.parameterName,
    Value: r.percentOfLimit,
    Limit: 100, // Limit is always 100% relative line
    status: r.status
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="p-3 border shadow-lg rounded-md text-sm"
          style={{ 
            backgroundColor: chartStyles.tooltipBg, 
            borderColor: chartStyles.tooltipBorder,
            color: chartStyles.textColor
          }}
        >
          <p className="font-bold mb-1">{label}</p>
          <p className="opacity-90">
            % of Limit: <span className="font-mono">{payload[0].value}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const RadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = payload[0].value;
      return (
        <div 
          className="p-3 border shadow-lg rounded-md text-sm"
          style={{ 
            backgroundColor: chartStyles.tooltipBg, 
            borderColor: chartStyles.tooltipBorder,
            color: chartStyles.textColor
          }}
        >
          <p className="font-bold mb-1">{data.subject}</p>
          <p className="opacity-90">
            % of Limit: <span className="font-mono">{value}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = stats.total;
      const percentage = total > 0 ? Math.round((data.value / total) * 100) : 0;
      return (
        <div 
          className="p-3 border shadow-lg rounded-md text-sm"
          style={{ 
            backgroundColor: chartStyles.tooltipBg, 
            borderColor: chartStyles.tooltipBorder,
            color: chartStyles.textColor
          }}
        >
          <p className="font-bold mb-1">{data.name}</p>
          <p className="opacity-90">
            Count: <span className="font-mono">{data.value}</span>
          </p>
          <p className="opacity-75 text-xs mt-1">
            {percentage}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-y-auto pr-2 pb-6">
      {/* KPI Cards */}
      <div className="col-span-1 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center transition-colors">
            <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Parameters</span>
            <span className="text-3xl font-bold text-slate-700 dark:text-slate-200">{stats.total}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col items-center justify-center transition-colors">
            <span className="text-emerald-500 text-xs font-semibold uppercase tracking-wider mb-1">Compliant</span>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.pass}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-sm flex flex-col items-center justify-center transition-colors">
            <span className="text-amber-500 text-xs font-semibold uppercase tracking-wider mb-1">Warning</span>
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.warning}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 shadow-sm flex flex-col items-center justify-center transition-colors">
            <span className="text-rose-500 text-xs font-semibold uppercase tracking-wider mb-1">Non-Compliant</span>
            <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">{stats.fail}</span>
        </div>
      </div>

      {/* Main Bar Chart */}
      <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-80 transition-colors">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Compliance Overview (% of Limit)</h3>
        <ResponsiveContainer width="100%" height="100%" debounce={300}>
          <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartStyles.gridColor} />
            <XAxis dataKey="name" tick={{fontSize: 12, fill: chartStyles.axisColor}} stroke={chartStyles.axisColor} />
            <YAxis tick={{fontSize: 12, fill: chartStyles.axisColor}} stroke={chartStyles.axisColor} />
            <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{fill: isDarkMode ? '#334155' : '#f1f5f9', opacity: 0.4}} />
            <Legend wrapperStyle={{fontSize: '12px', color: chartStyles.legendColor}} />
            <Bar dataKey="Value" fill={COLORS.primary} radius={[4, 4, 0, 0]}>
              {barData.map((entry, index) => (
                <Cell 
                    key={`cell-${index}`} 
                    fill={entry.status === 'Fail' ? COLORS.danger : entry.status === 'Warning' ? COLORS.warning : COLORS.success} 
                />
              ))}
            </Bar>
            {/* Threshold Line at 100% */}
            <Bar dataKey="Limit" fill="transparent" stroke={COLORS.danger} strokeWidth={2} strokeDasharray="5 5" legendType="none" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-80 transition-colors">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Status Distribution</h3>
        <ResponsiveContainer width="100%" height="100%" debounce={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke={isDarkMode ? '#1e293b' : '#fff'} // Border between slices
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={(pieColors as any)[entry.name]} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} isAnimationActive={false} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '12px', color: chartStyles.legendColor}} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Radar Chart */}
      <div className="col-span-1 lg:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-80 transition-colors">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Multi-Parameter Risk Assessment</h3>
        <ResponsiveContainer width="100%" height="100%" debounce={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid stroke={chartStyles.gridColor} />
            <PolarAngleAxis dataKey="subject" tick={{fontSize: 12, fill: chartStyles.axisColor}} />
            <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
<Radar
                    name="Risk Level"
                    dataKey="A"
                    stroke="#0ea5e9"
                    fill="#0ea5e9"
                    fillOpacity={0.6}
                    isAnimationActive={false}
                  />
            <Tooltip content={<RadarTooltip />} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;