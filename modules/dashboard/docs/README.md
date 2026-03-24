# 📊 Dashboard

> Compliance visualization dashboard with interactive charts and summary statistics.

## Overview

Renders bar, pie, and radar charts using Recharts to visualize environmental compliance assessment results. Includes summary cards showing total/pass/warning/fail counts. Fully supports dark mode.

## Source Files

| File | Location | Description |
|------|----------|-------------|
| `Dashboard.tsx` | [`components/Dashboard.tsx`](../../components/Dashboard.tsx) | Chart components and layout (~9.9KB) |
| `analytics.ts` | [`services/analytics.ts`](../../services/analytics.ts) | Data types for analytics (shared with forecasting/GIS) |

## Charts

| Chart | Library | Purpose |
|-------|---------|---------|
| Bar Chart | Recharts `BarChart` | % of Limit per parameter |
| Pie Chart | Recharts `PieChart` | Pass/Warning/Fail distribution |
| Radar Chart | Recharts `RadarChart` | Multi-parameter comparison |

## Props Interface

```typescript
interface Props {
  results: AssessmentResult[];
  isDarkMode: boolean;
}
```

## Dependencies

| Module | What's Used |
|--------|-------------|
| `compliance-engine` | `AssessmentResult` type, `getComplianceStats()`, `COLORS` |

## Depended On By

- **App.tsx** — renders Dashboard in the "Analysis" tab
