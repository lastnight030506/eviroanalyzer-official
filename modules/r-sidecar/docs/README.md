# 🔌 R Sidecar

> Infrastructure bridge connecting the TypeScript frontend to R's statistical computing via Tauri shell plugin.

## Overview

Manages the execution of R scripts as sidecar processes through Tauri. Handles IPC (Inter-Process Communication) using JSON over stdin/stdout. All R-dependent modules (forecasting, GIS, reporting) depend on this infrastructure.

## Source Files

| File | Location | Description |
|------|----------|-------------|
| `r-sidecar.ts` | [`services/r-sidecar.ts`](../../services/r-sidecar.ts) | TypeScript client API (~2KB) |
| `lib.rs` | [`src-tauri/src/lib.rs`](../../src-tauri/src/lib.rs) | Rust Tauri command `run_r_script` (~6.9KB) |
| `health_check.R` | [`src-tauri/scripts/health_check.R`](../../src-tauri/scripts/health_check.R) | R availability + package verification |

## API

```typescript
// Execute R script, parse JSON output
async function runRScript<T>(scriptName: string, args?: string[]): Promise<T>

// Execute R script, return raw text
async function runRScriptRaw(scriptName: string, args?: string[]): Promise<string>

// Health check — verify R is installed
async function checkRHealth(): Promise<RHealthResponse>

// Quick boolean check
async function isRAvailable(): Promise<boolean>
```

## IPC Protocol

```
TypeScript                     Rust (Tauri)                    R Script
─────────────────────────────────────────────────────────────────────────
invoke("run_r_script",     →   Spawn Rscript process       →   commandArgs()
  { scriptName, args })        Pass args via CLI               Parse JSON input
                           ←   Capture stdout              ←   cat(toJSON(result))
Parse JSON result              Return { success, output }
```

## R Script Location

All R scripts live in: `src-tauri/scripts/`

| Script | Used By |
|--------|---------|
| `health_check.R` | R Sidecar (self) |
| `forecast_arima.R` | Forecasting module |
| `forecast_prophet.R` | Forecasting module |
| `kriging.R` | GIS Spatial module |
| `generate_report.R` | Report Export module |

## Dependencies

- `@tauri-apps/api` — Tauri invoke API
- `@tauri-apps/plugin-shell` — Shell plugin for process spawning

## Depended On By

- **forecasting** — `forecastARIMA()`, `forecastProphet()`
- **gis-spatial** — `runKriging()`
- **report-export** — `generateReport()`
- **App.tsx** — R health check on startup
