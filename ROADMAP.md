# EnviroAnalyzer Pro - Development Roadmap

## Phase 1: Infrastructure (Sidecar Setup)

### 1.1 Tauri Core
- [x] Initialize Tauri project with React frontend
- [x] Configure Tauri FS plugin for file persistence
- [x] Set up capabilities/permissions (`fs:allow-app-read`, `fs:allow-app-write`)
- [x] Configure Vite dev server integration

### 1.2 R Sidecar Integration
- [x] Create `src-tauri/scripts/` directory for R scripts
- [x] Implement Rust sidecar command to spawn R process
- [x] Create IPC protocol (JSON input/output via stdin/stdout)
- [x] Add R script template with `commandArgs(trailingOnly = TRUE)` handling
- [x] Auto-detect R installation path on Windows (`C:\Program Files\R\R-x.x.x`)
- [x] Test basic R script execution from Tauri (R status indicator in UI)

### 1.3 R Dependencies (Required)
```r
# Run in R console or RGui:
install.packages(c("jsonlite", "forecast", "gstat", "sp"), 
                 repos = "https://cloud.r-project.org")
```
- [x] jsonlite - JSON parsing
- [x] forecast - ARIMA time series
- [x] gstat - Kriging interpolation
- [x] sp - Spatial data handling

---

## Phase 2: Core Logic (QCVN Compliance)

### 2.1 Data Management
- [x] Define TypeScript interfaces (`QCVNStandard`, `SampleRow`, `AssessmentResult`)
- [x] Implement seed-based mock data generator
- [x] Create editable data matrix component (`DataEditor`)
- [x] Implement data encoding/decoding for URL sharing

### 2.2 Compliance Assessment
- [x] Implement `assessCompliance()` function with Pass/Warning/Fail logic
- [x] Color coding: Red (Fail), Yellow (Warning), Green (Pass)
- [x] Calculate statistics: mean, max, percentOfLimit
- [x] Support both "max" and "min" limit types

### 2.3 Regulation Management
- [x] CRUD operations for custom regulations
- [x] Import/Export regulations as JSON
- [x] Persist regulations to `AppData/regulations.json`
- [x] Reset to default QCVN standards
- [x] Built-in standards: QCVN 08-MT:2015, QCVN 14:2008, QCVN 05:2013

### 2.4 Visualization Dashboard
- [x] Bar chart: Compliance Overview (% of Limit)
- [x] Pie chart: Status Distribution
- [x] Radar chart: Parameter comparison
- [x] Summary cards (Total, Pass, Warning, Fail)
- [x] Dark mode support for all charts

---

## Phase 3: Advanced Features

### 3.1 Environmental Forecasting
- [x] Create R script for ARIMA time series forecasting
- [x] Implement Prophet model integration
- [x] Add "Forecast" tab in UI
- [x] Visualize predicted values with confidence intervals
- [x] Export forecast results (table display)

### 3.2 Geospatial Intelligence (GIS)
- [x] Create R script for Kriging interpolation (`gstat` package)
- [x] Integrate Leaflet.js for map visualization
- [x] Add "GIS" component for spatial data
- [x] Support coordinate input (lat/lng)
- [x] Display interpolation grid with color scale

### 3.3 Automated Reporting
- [x] Create R Markdown template for compliance reports
- [x] Implement PDF export via R
- [x] Implement DOCX export via R
- [x] Add "Export" buttons in UI header
- [x] Include charts and tables in reports

---

## Phase 4: Polish & Release

### 4.1 Testing & Quality
- [x] Unit tests for core logic (Vitest)
- [x] Integration tests for Tauri commands
- [x] E2E tests for critical workflows
- [x] Performance optimization (lazy loading, memoization)

### 4.2 Build & Distribution
- [x] GitHub Actions workflow for multi-platform builds
- [x] NSIS installer for Windows
- [x] AppImage for Linux
- [x] DMG for macOS
- [x] Auto-update mechanism (tauri-plugin-updater)

---

## Current Status

**Active Phase**: Phase 4 - Polish & Release  
**Completion**: 100% ✅

---

## Changelog

| Date       | Task                              | Status   |
|------------|-----------------------------------|----------|
| 2026-02-05 | Phase 4 complete (All tests + auto-update) | ✅ Done  |
| 2026-02-05 | Integration tests for Tauri R commands | ✅ Done  |
| 2026-02-05 | E2E tests for all workflows       | ✅ Done  |
| 2026-02-05 | Performance optimization (lazy load) | ✅ Done  |
| 2026-02-05 | Auto-update mechanism             | ✅ Done  |
| 2026-02-05 | Phase 3 complete (Advanced Features) | ✅ Done  |
| 2026-02-05 | GIS Map with Kriging              | ✅ Done  |
| 2026-02-05 | Time Series Forecasting (ARIMA)   | ✅ Done  |
| 2026-02-05 | PDF/DOCX Report Generation        | ✅ Done  |
| 2026-02-05 | R Sidecar infrastructure          | ✅ Done  |
| 2024-XX-XX | Initial project setup             | ✅ Done  |
| 2024-XX-XX | Core QCVN compliance logic        | ✅ Done  |
| 2024-XX-XX | Regulation management UI          | ✅ Done  |
| 2024-XX-XX | Dashboard visualizations          | ✅ Done  |
