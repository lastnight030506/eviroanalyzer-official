/**
 * Native Report Export Service
 * Generates reports without requiring R packages
 */

import { AssessmentResult, QCVNStandard } from '../types';

// Try to import Tauri APIs
let tauriFs: any = null;
let tauriShell: any = null;
let tauriPath: any = null;

async function initTauriAPIs() {
  try {
    tauriFs = await import('@tauri-apps/plugin-fs');
    tauriShell = await import('@tauri-apps/plugin-shell');
    tauriPath = await import('@tauri-apps/api/path');
    return true;
  } catch (e) {
    console.log('Tauri APIs not available');
    return false;
  }
}

export interface ReportData {
  title: string;
  regulation: QCVNStandard;
  date: string;
  results: AssessmentResult[];
  summary: {
    total: number;
    pass: number;
    warning: number;
    fail: number;
  };
}

/**
 * Generate HTML report content
 */
function generateHTMLContent(data: ReportData): string {
  const complianceRate = data.summary.total > 0 
    ? ((data.summary.pass / data.summary.total) * 100).toFixed(1) 
    : '0';

  const statusColor = (status: string) => {
    switch (status) {
      case 'Pass': return '#10b981';
      case 'Warning': return '#f59e0b';
      case 'Fail': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #1e293b;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }
    .header { 
      text-align: center; 
      margin-bottom: 40px; 
      padding-bottom: 20px;
      border-bottom: 3px solid #10b981;
    }
    .header h1 { color: #0f172a; font-size: 28px; margin-bottom: 10px; }
    .header .subtitle { color: #64748b; font-size: 16px; }
    .header .date { color: #94a3b8; font-size: 14px; margin-top: 5px; }
    
    .summary { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 20px; 
      margin-bottom: 40px; 
    }
    .summary-card { 
      padding: 20px; 
      border-radius: 12px; 
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .summary-card.total { background: #f1f5f9; }
    .summary-card.pass { background: #d1fae5; }
    .summary-card.warning { background: #fef3c7; }
    .summary-card.fail { background: #fee2e2; }
    .summary-card .number { font-size: 36px; font-weight: bold; }
    .summary-card .label { font-size: 14px; color: #64748b; margin-top: 5px; }
    .summary-card.total .number { color: #1e293b; }
    .summary-card.pass .number { color: #059669; }
    .summary-card.warning .number { color: #d97706; }
    .summary-card.fail .number { color: #dc2626; }
    
    .compliance-rate {
      text-align: center;
      margin-bottom: 40px;
      padding: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 12px;
      color: white;
    }
    .compliance-rate .rate { font-size: 48px; font-weight: bold; }
    .compliance-rate .label { font-size: 16px; opacity: 0.9; }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-radius: 12px;
      overflow: hidden;
    }
    th { 
      background: #1e293b; 
      color: white; 
      padding: 14px 16px; 
      text-align: left;
      font-weight: 600;
    }
    td { 
      padding: 12px 16px; 
      border-bottom: 1px solid #e2e8f0; 
    }
    tr:nth-child(even) { background: #f8fafc; }
    tr:hover { background: #f1f5f9; }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }
    
    .methodology {
      background: #f8fafc;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 40px;
    }
    .methodology h3 { color: #1e293b; margin-bottom: 16px; }
    .methodology ul { margin-left: 20px; }
    .methodology li { margin-bottom: 8px; color: #475569; }
    
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 12px;
    }
    
    @media print {
      body { padding: 20px; }
      .summary { grid-template-columns: repeat(4, 1fr); }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.title}</h1>
    <div class="subtitle">Regulation: ${data.regulation.name}</div>
    <div class="date">Assessment Date: ${data.date}</div>
  </div>
  
  <div class="compliance-rate">
    <div class="rate">${complianceRate}%</div>
    <div class="label">Overall Compliance Rate</div>
  </div>
  
  <div class="summary">
    <div class="summary-card total">
      <div class="number">${data.summary.total}</div>
      <div class="label">Total Parameters</div>
    </div>
    <div class="summary-card pass">
      <div class="number">${data.summary.pass}</div>
      <div class="label">Passing</div>
    </div>
    <div class="summary-card warning">
      <div class="number">${data.summary.warning}</div>
      <div class="label">Warning</div>
    </div>
    <div class="summary-card fail">
      <div class="number">${data.summary.fail}</div>
      <div class="label">Failing</div>
    </div>
  </div>
  
  <h2 style="margin-bottom: 20px; color: #1e293b;">Detailed Results</h2>
  <table>
    <thead>
      <tr>
        <th>Parameter</th>
        <th>Unit</th>
        <th>Mean Value</th>
        <th>Limit</th>
        <th>% of Limit</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${data.results.map(r => `
        <tr>
          <td><strong>${r.parameterName}</strong></td>
          <td>${r.unit || '-'}</td>
          <td>${r.meanValue.toFixed(2)}</td>
          <td>${r.limit}</td>
          <td>${r.percentOfLimit.toFixed(1)}%</td>
          <td><span class="status-badge" style="background: ${statusColor(r.status)}">${r.status}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="methodology">
    <h3>Methodology</h3>
    <p style="margin-bottom: 12px;">The compliance assessment follows Vietnamese National Technical Regulations (QCVN). Each parameter is evaluated against its specified limit:</p>
    <ul>
      <li><strong>Pass:</strong> Mean value is within 80% of the limit</li>
      <li><strong>Warning:</strong> Mean value is between 80% and 100% of the limit</li>
      <li><strong>Fail:</strong> Mean value exceeds the limit</li>
    </ul>
  </div>
  
  <div class="methodology">
    <h3>Recommendations</h3>
    <ul>
      <li>Parameters marked as <strong>Fail</strong> require immediate attention and remediation measures.</li>
      <li>Parameters marked as <strong>Warning</strong> should be monitored closely.</li>
      <li>Regular monitoring schedules should be maintained to ensure continued compliance.</li>
    </ul>
  </div>
  
  <div class="footer">
    <p>Report generated by EnviroAnalyzer Pro | ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;
}

/**
 * Generate CSV content
 */
function generateCSVContent(data: ReportData): string {
  const headers = ['Parameter', 'Unit', 'Mean Value', 'Max Value', 'Limit', 'Type', '% of Limit', 'Status'];
  const rows = data.results.map(r => [
    r.parameterName,
    r.unit,
    r.meanValue.toFixed(2),
    r.maxValue.toFixed(2),
    r.limit.toString(),
    r.type,
    r.percentOfLimit.toFixed(1) + '%',
    r.status
  ]);
  
  const csvContent = [
    `# Environmental Compliance Report`,
    `# Regulation: ${data.regulation.name}`,
    `# Date: ${data.date}`,
    `# Summary: ${data.summary.pass} Pass, ${data.summary.warning} Warning, ${data.summary.fail} Fail`,
    ``,
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

/**
 * Export report as HTML file (opens in browser for printing to PDF)
 */
export async function exportAsHTML(data: ReportData): Promise<string> {
  const htmlContent = generateHTMLContent(data);
  const filename = `EnviroReport_${data.date.replace(/-/g, '')}.html`;
  
  // Try to use Tauri FS to save file
  const hasTauri = await initTauriAPIs();
  
  if (hasTauri && tauriFs && tauriPath) {
    try {
      // Save to downloads folder
      const downloadDir = await tauriPath.downloadDir();
      // Ensure proper path separator for Windows
      const separator = downloadDir.includes('\\') ? '\\' : '/';
      const filePath = downloadDir.endsWith(separator) 
        ? `${downloadDir}${filename}` 
        : `${downloadDir}${separator}${filename}`;
      
      await tauriFs.writeTextFile(filePath, htmlContent);
      
      // Open in default browser using file:// URL
      if (tauriShell) {
        const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
        await tauriShell.open(fileUrl);
      }
      
      return filePath;
    } catch (e) {
      console.error('Tauri save failed:', e);
    }
  }
  
  // Fallback: browser download
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  return filename;
}

/**
 * Export report as CSV file
 */
export async function exportAsCSV(data: ReportData): Promise<string> {
  const csvContent = generateCSVContent(data);
  const filename = `EnviroReport_${data.date.replace(/-/g, '')}.csv`;
  
  const hasTauri = await initTauriAPIs();
  
  if (hasTauri && tauriFs && tauriPath) {
    try {
      const downloadDir = await tauriPath.downloadDir();
      const separator = downloadDir.includes('\\') ? '\\' : '/';
      const filePath = downloadDir.endsWith(separator) 
        ? `${downloadDir}${filename}` 
        : `${downloadDir}${separator}${filename}`;
      await tauriFs.writeTextFile(filePath, csvContent);
      return filePath;
    } catch (e) {
      console.error('Tauri save failed:', e);
    }
  }
  
  // Fallback
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  return filename;
}

/**
 * Open HTML report in browser for printing to PDF
 */
export async function printReport(data: ReportData): Promise<void> {
  const htmlContent = generateHTMLContent(data);
  const filename = `EnviroReport_${data.date.replace(/-/g, '')}_print.html`;
  
  const hasTauri = await initTauriAPIs();
  
  if (hasTauri && tauriFs && tauriPath && tauriShell) {
    try {
      // Save to downloads folder and open in browser
      const downloadDir = await tauriPath.downloadDir();
      const separator = downloadDir.includes('\\') ? '\\' : '/';
      const filePath = downloadDir.endsWith(separator) 
        ? `${downloadDir}${filename}` 
        : `${downloadDir}${separator}${filename}`;
      
      await tauriFs.writeTextFile(filePath, htmlContent);
      
      // Open in default browser using file:// URL - user can print to PDF from there
      const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
      await tauriShell.open(fileUrl);
      return;
    } catch (e) {
      console.error('Tauri print failed:', e);
    }
  }
  
  // Fallback: try window.open
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/**
 * Export as JSON (for backup/import)
 */
export async function exportAsJSON(data: ReportData): Promise<string> {
  const jsonContent = JSON.stringify({
    ...data,
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  }, null, 2);
  
  const filename = `EnviroReport_${data.date.replace(/-/g, '')}.json`;
  
  const hasTauri = await initTauriAPIs();
  
  if (hasTauri && tauriFs && tauriPath) {
    try {
      const downloadDir = await tauriPath.downloadDir();
      const separator = downloadDir.includes('\\') ? '\\' : '/';
      const filePath = downloadDir.endsWith(separator) 
        ? `${downloadDir}${filename}` 
        : `${downloadDir}${separator}${filename}`;
      await tauriFs.writeTextFile(filePath, jsonContent);
      return filePath;
    } catch (e) {
      console.error('Tauri save failed:', e);
    }
  }
  
  // Fallback
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  return filename;
}
