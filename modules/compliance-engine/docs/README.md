# 🧪 Compliance Engine

> The core QCVN environmental compliance assessment logic — the heart of EnviroAnalyzer.

## Overview

Evaluates measured water/air/soil quality parameter values against Vietnamese regulatory limits (QCVN standards). Produces **Pass**, **Warning**, or **Fail** verdicts with statistical summaries for each parameter.

## Source Files

| File | Location | Description |
|------|----------|-------------|
| `logic.ts` | [`utils/logic.ts`](../../utils/logic.ts) | Core assessment functions: `assessCompliance()`, `generateMockData()`, `getComplianceStats()`, seed encoding/decoding |
| `logic.test.ts` | [`utils/logic.test.ts`](../../utils/logic.test.ts) | Unit tests for all logic functions |
| `types.ts` | [`types.ts`](../../types.ts) | `SampleRow`, `AssessmentResult`, `QCVNStandard`, `ComplianceStatus` |
| `constants.ts` | [`constants.ts`](../../constants.ts) | Built-in QCVN standards (08-MT:2015, 14:2008, 05:2013) and color palette |

## Key Functions

| Function | Purpose |
|----------|---------|
| `assessCompliance(data, sampleColumns, safetyMargin)` | Evaluate each parameter → returns `AssessmentResult[]` |
| `generateMockData(standard, seed, sampleCount)` | Create deterministic demo data |
| `getComplianceStats(results)` | Aggregate pass/warning/fail counts |
| `encodeDatasetToSeed(data, count)` | Encode data to compact Base94 for URL sharing |
| `decodeSeedToValues(seed)` | Decode Base94 seed back to values |

## Assessment Logic

```
For "max" type parameters:
  Pass    → all values < 80% of limit
  Warning → any value between 80%-100% of limit
  Fail    → any value exceeds limit

For "min" type parameters (e.g., Dissolved Oxygen):
  Pass    → all values comfortably above limit
  Warning → values close to limit
  Fail    → any value below limit
```

## Dependencies

- None (pure TypeScript, no external service calls)

## Depended On By

- **dashboard** — uses `getComplianceStats()`
- **data-editor** — uses `SampleRow` type
- **report-export** — uses `AssessmentResult` for report data
- **forecasting** — uses assessment results for time series
- **App.tsx** — orchestrates data generation and assessment
