# 📈 Forecasting

> Time series environmental forecasting using ARIMA and Prophet models via R sidecar.

## Overview

Predicts future values of environmental parameters using statistical time series models. Executes R scripts through the Tauri sidecar bridge and visualizes results with confidence intervals using Recharts.

## Source Files

| File | Location | Description |
|------|----------|-------------|
| `Forecast.tsx` | [`components/Forecast.tsx`](../../components/Forecast.tsx) | React UI for forecasting (~15KB) |
| `analytics.ts` | [`services/analytics.ts`](../../services/analytics.ts) | `forecastARIMA()`, `forecastProphet()` service functions |
| `forecast_arima.R` | [`src-tauri/scripts/forecast_arima.R`](../../src-tauri/scripts/forecast_arima.R) | ARIMA model via R `forecast` package |
| `forecast_prophet.R` | [`src-tauri/scripts/forecast_prophet.R`](../../src-tauri/scripts/forecast_prophet.R) | Prophet model script |

## Data Flow

```
User selects parameter → Extract time series from SampleRow[]
                        → JSON input to R via sidecar
                        → R runs ARIMA/Prophet
                        → JSON output parsed as ARIMAResult/ProphetResult
                        → Recharts renders historical + forecast
```

## Key Types

```typescript
interface ForecastInput {
  values: number[];     // Historical measurements
  periods: number;      // How many future periods to predict
  parameter: string;    // Parameter name
  dates?: string[];     // Optional date labels
  confidence?: number;  // Confidence level (default 95%)
}

interface ARIMAResult {
  model: string;        // e.g., "ARIMA(1,1,1)"
  forecast: { mean: number[]; lower: number[]; upper: number[] };
  accuracy: { mae: number; rmse: number; mape: number };
}
```

## Dependencies

| Module | What's Used |
|--------|-------------|
| `r-sidecar` | `runRScript()` for executing R scripts |
| `compliance-engine` | `SampleRow`, `AssessmentResult` types, `COLORS` |

## Requirements

- **R must be installed** on the system
- R packages: `jsonlite`, `forecast`
- Feature is disabled when R is unavailable (tab grayed out)
