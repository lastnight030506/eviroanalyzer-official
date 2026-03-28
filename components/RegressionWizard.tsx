import React, { useState, useMemo } from 'react';
import { runLinearRegression, runLogisticRegression } from '../services/statistics-service';
import { syntaxLogger } from '../services/syntax-logger';
import type { LinearRegressionResult, LogisticRegressionResult } from '../types/statistics';

interface Props {
  isDarkMode: boolean;
  dataLoaded: boolean;
}

const RegressionWizard: React.FC<Props> = ({ isDarkMode, dataLoaded }) => {
  const [regType, setRegType] = useState<'linear' | 'logistic'>('linear');
  const [formula, setFormula] = useState<string>('');
  const [result, setResult] = useState<LinearRegressionResult | LogisticRegressionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useMemo(() => {
    const stored = localStorage.getItem('stats_session_id');
    if (stored) setSessionId(stored);
  }, []);

  const runReg = async () => {
    if (!sessionId || !formula) return;
    setLoading(true);
    setError(null);
    try {
      let res: LinearRegressionResult | LogisticRegressionResult;
      if (regType === 'linear') {
        res = await runLinearRegression(sessionId, formula);
        syntaxLogger.logOperation('Linear Regression', { formula }, `summary(lm(${formula}, data = data))`);
      } else {
        res = await runLogisticRegression(sessionId, formula);
        syntaxLogger.logOperation('Logistic Regression', { formula }, `summary(glm(${formula}, data = data, family = binomial()))`);
      }
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regression failed');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = `bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4`;
  const inputStyle = `w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent`;
  const thStyle = `px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900`;
  const tdStyle = `px-4 py-2 text-sm text-slate-700 dark:text-slate-300`;

  const formatP = (p: number) => {
    if (p < 0.001) return '< .001 ***';
    if (p < 0.01) return `${p.toFixed(3)} **`;
    if (p < 0.05) return `${p.toFixed(3)} *`;
    return `${p.toFixed(3)}`;
  };

  if (!dataLoaded) {
    return (
      <div className={`${cardStyle} text-center py-8`}>
        <p className="text-slate-500 dark:text-slate-400">Please load data first in the Data tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cardStyle}>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Regression Wizard</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => setRegType('linear')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${regType === 'linear' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
          >
            Linear Regression
          </button>
          <button
            onClick={() => setRegType('logistic')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${regType === 'logistic' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
          >
            Logistic Regression
          </button>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Formula (DV ~ IV1 + IV2 + ...)</label>
          <input
            type="text"
            value={formula}
            onChange={e => setFormula(e.target.value)}
            placeholder={regType === 'linear' ? 'e.g., BOD5 ~ COD + pH + DO' : 'e.g., Status ~ COD + pH'}
            className={inputStyle}
          />
        </div>
        <button
          onClick={runReg}
          disabled={loading || !formula}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? 'Running...' : 'Run Regression'}
        </button>
        {error && <p className="mt-2 text-rose-500 text-sm">{error}</p>}
      </div>

      {result && (
        <>
          <div className={cardStyle}>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Model Summary</h3>
            {'r_squared' in result ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-slate-500 dark:text-slate-400">R2:</span> <span className="font-mono font-medium">{result.r_squared.toFixed(4)}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">Adj R2:</span> <span className="font-mono font-medium">{result.adj_r_squared.toFixed(4)}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">F:</span> <span className="font-mono font-medium">{result.f_statistic.toFixed(3)}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">p:</span> <span className="font-mono font-medium">{formatP(result.f_p_value)}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">n:</span> <span className="font-mono font-medium">{result.n_obs}</span></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-slate-500 dark:text-slate-400">Deviance:</span> <span className="font-mono font-medium">{result.deviance.toFixed(3)}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">Pseudo R2:</span> <span className="font-mono font-medium">{result.pseudo_r2.toFixed(4)}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400">n:</span> <span className="font-mono font-medium">{result.n_obs}</span></div>
              </div>
            )}
          </div>

          <div className={cardStyle}>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Coefficients</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={thStyle}>Term</th>
                    <th className={thStyle}>Estimate</th>
                    <th className={thStyle}>SE</th>
                    {'z_statistic' in result.coefficients[0] ? (
                      <th className={thStyle}>z</th>
                    ) : (
                      <th className={thStyle}>t</th>
                    )}
                    <th className={thStyle}>p-value</th>
                    {'odds_ratio' in result.coefficients[0] && <th className={thStyle}>OR</th>}
                    <th className={thStyle}>95% CI</th>
                  </tr>
                </thead>
                <tbody>
                  {result.coefficients.map((coef, i) => (
                    <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                      <td className={`${tdStyle} font-mono font-medium`}>{coef.term}</td>
                      <td className={tdStyle}>{coef.estimate.toFixed(4)}</td>
                      <td className={tdStyle}>{coef.std_error.toFixed(4)}</td>
                      <td className={tdStyle}>{'z_statistic' in coef ? coef.z_statistic.toFixed(3) : coef.t_statistic.toFixed(3)}</td>
                      <td className={tdStyle}>{formatP(coef.p_value)}</td>
                      {'odds_ratio' in coef && <td className={tdStyle}>{coef.odds_ratio.toFixed(4)}</td>}
                      <td className={tdStyle}>[{coef.ci_lower.toFixed(3)}, {coef.ci_upper.toFixed(3)}]</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RegressionWizard;