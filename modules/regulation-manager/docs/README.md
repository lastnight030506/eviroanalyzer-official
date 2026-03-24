# ⚙️ Regulation Manager

> Full CRUD interface for managing QCVN environmental standards with local persistence.

## Overview

Provides create, read, update, delete operations for custom QCVN regulations. Supports JSON import/export and persists data to `AppData/regulations.json` via Tauri's filesystem plugin. This is the **largest component** in the app (~31KB).

## Source Files

| File | Location | Description |
|------|----------|-------------|
| `RegulationManager.tsx` | [`components/RegulationManager.tsx`](../../components/RegulationManager.tsx) | Full CRUD UI component (~31KB) |
| `regulations.ts` | [`services/regulations.ts`](../../services/regulations.ts) | Persistence layer — file I/O via Tauri FS (~4.7KB) |

## Key Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `loadRegulations()` | `regulations.ts` | Load from AppData or fallback to defaults |
| `saveRegulations(regs)` | `regulations.ts` | Write to `AppData/regulations.json` |
| `addRegulation(regs, new)` | `regulations.ts` | Add + persist |
| `updateRegulation(regs, updated)` | `regulations.ts` | Update + persist |
| `deleteRegulation(regs, id)` | `regulations.ts` | Delete + persist |
| `resetRegulations()` | `regulations.ts` | Reset to built-in QCVN defaults |
| `exportRegulationsToJson(regs)` | `regulations.ts` | Download as JSON file |
| `importRegulationsFromJson(file)` | `regulations.ts` | Parse uploaded JSON file |

## Built-in Standards

| Standard | Category | Parameters |
|----------|----------|------------|
| QCVN 08-MT:2015 (Col B1) | Water | pH, BOD5, COD, TSS, DO, NH4+, Cl-, F-, NO2-, NO3-, PO4 |
| QCVN 14:2008/BTNMT (Col B) | Water | pH, TDS, Sulfide, NH4+, NO3-, Oil & Grease, Coliform |
| QCVN 05:2013/BTNMT | Air | SO2, NO2, CO, TSP, PM10, PM2.5, Pb |

## Dependencies

| Module | What's Used |
|--------|-------------|
| `compliance-engine` | `QCVNStandard`, `QCVNParameter` types, `STANDARDS` constant |
| `auto-updater` | `checkForUpdates()`, `downloadAndInstallUpdate()` (Settings tab includes update check) |

## Depended On By

- **App.tsx** — renders RegulationManager in the "Settings" tab
