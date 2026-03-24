# 📄 Report Export

> Generate professional compliance reports in HTML, CSV, PDF, and DOCX formats.

## Overview

Formats assessment results into downloadable compliance reports. Uses a hybrid approach: TypeScript for HTML/CSV generation (works everywhere) and R scripts for PDF/DOCX rendering via R Markdown (requires R).

## Source Files

| File | Location | Description |
|------|----------|-------------|
| `report-export.ts` | [`services/report-export.ts`](../../services/report-export.ts) | HTML/CSV export + jsPDF fallback (~13KB) |
| `analytics.ts` | [`services/analytics.ts`](../../services/analytics.ts) | `generateReport()` for R-based PDF/DOCX |
| `generate_report.R` | [`src-tauri/scripts/generate_report.R`](../../src-tauri/scripts/generate_report.R) | R Markdown report generation |

## Export Formats

| Format | Method | R Required? |
|--------|--------|-------------|
| HTML | TypeScript (`exportAsHTML`) | ❌ No |
| CSV | TypeScript (`exportAsCSV`) | ❌ No |
| PDF | R Markdown | ✅ Yes |
| DOCX | R Markdown | ✅ Yes |

## Key Functions

| Function | Purpose |
|----------|---------|
| `exportAsHTML(reportData)` | Generate styled HTML report, save to Downloads |
| `exportAsCSV(reportData)` | Generate CSV data export |
| `generateReport(input, format)` | R-based PDF/DOCX generation |

## Report Data Structure

```typescript
interface ReportData {
  title: string;
  regulation: QCVNStandard;
  date: string;
  results: AssessmentResult[];
  summary: { total: number; pass: number; warning: number; fail: number };
}
```

## Dependencies

| Module | What's Used |
|--------|-------------|
| `compliance-engine` | `AssessmentResult`, `QCVNStandard` types |
| `r-sidecar` | `runRScript()` for PDF/DOCX generation |
