# EnviroAnalyzer Pro

> 🌿 Professional Environmental Compliance Assessment Tool for Vietnamese QCVN Standards

A Tauri + React + TypeScript desktop application that analyzes water/air/soil quality parameters against regulatory limits, performs time series forecasting, geospatial analysis, and generates compliance reports.

---

## 📂 Module Directory

Each module is self-contained with its own documentation, agent definition, and source references.

### Feature Modules

| Module | Description | Docs |
|--------|-------------|------|
| 🧪 [**compliance-engine**](modules/compliance-engine/) | Core QCVN assessment logic (Pass/Warning/Fail) | [README](modules/compliance-engine/docs/README.md) |
| ✏️ [**data-editor**](modules/data-editor/) | Interactive spreadsheet for sample data entry | [README](modules/data-editor/docs/README.md) |
| 📊 [**dashboard**](modules/dashboard/) | Charts & summary cards (Recharts) | [README](modules/dashboard/docs/README.md) |
| ⚙️ [**regulation-manager**](modules/regulation-manager/) | CRUD for custom QCVN regulations + persistence | [README](modules/regulation-manager/docs/README.md) |
| 📈 [**forecasting**](modules/forecasting/) | ARIMA/Prophet time series via R sidecar | [README](modules/forecasting/docs/README.md) |
| 🗺️ [**gis-spatial**](modules/gis-spatial/) | Leaflet maps + Kriging interpolation | [README](modules/gis-spatial/docs/README.md) |
| 📄 [**report-export**](modules/report-export/) | PDF/DOCX/HTML/CSV report generation | [README](modules/report-export/docs/README.md) |
| 🔬 [**r-shiny-filter**](modules/r-shiny-filter/) | Standalone R Shiny data filtering app | [README](modules/r-shiny-filter/docs/README.md) |

### Infrastructure Modules

| Module | Description | Docs |
|--------|-------------|------|
| 🔌 [**r-sidecar**](modules/r-sidecar/) | R process execution bridge (Tauri ↔ R) | [README](modules/r-sidecar/docs/README.md) |
| 🔄 [**auto-updater**](modules/auto-updater/) | Tauri auto-update mechanism | [README](modules/auto-updater/docs/README.md) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    App.tsx (Root)                    │
├──────────┬──────────┬──────────┬──────────┬─────────┤
│   Data   │ Analysis │ Forecast │   GIS    │Settings │
│  Editor  │Dashboard │          │          │ RegMgr  │
├──────────┴──────────┴──────┬───┴──────────┴─────────┤
│         Compliance Engine  │   Report Export         │
│    (types, logic, const)   │   (HTML/CSV/PDF/DOCX)   │
├────────────────────────────┼─────────────────────────┤
│              R Sidecar (Tauri ↔ R Bridge)            │
│    ┌──────────┬──────────┬──────────┬───────────┐    │
│    │ ARIMA.R  │Prophet.R │kriging.R │report.R   │    │
│    └──────────┴──────────┴──────────┴───────────┘    │
└──────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server (browser)
npm run dev

# Start Tauri desktop app
npm run tauri dev

# Run tests
npm test

# Build production
npm run build
```

### R Shiny Module (standalone)

```bash
Rscript r-shiny-filter/install_packages.R
Rscript -e "shiny::runApp('r-shiny-filter', launch.browser = TRUE)"
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Maps | Leaflet.js, react-leaflet |
| Desktop | Tauri 2 (Rust) |
| Statistics | R (ARIMA, Kriging, Prophet) |
| Reports | jsPDF, R Markdown |
| Build | Vite |
| Testing | Vitest |

---

## 📁 Source Layout

```
├── App.tsx              # Root component (orchestrator)
├── index.tsx            # Entry point
├── types.ts             # Shared TypeScript interfaces
├── constants.ts         # QCVN standards & colors
├── components/          # React UI components
├── services/            # Business logic & API services
├── utils/               # Pure logic functions
├── modules/             # 📦 Feature-based module docs & re-exports
├── tests/               # Vitest test files
├── r-shiny-filter/      # Standalone R Shiny app
├── src-tauri/           # Tauri Rust backend
│   ├── src/lib.rs       # Tauri commands
│   └── scripts/         # R scripts (ARIMA, Kriging, etc.)
└── .agent/              # Agent skills & workflows
```

---

## 📋 Standards Supported

- **QCVN 08-MT:2015** — Surface Water Quality (Irrigation)
- **QCVN 14:2008/BTNMT** — Domestic Wastewater
- **QCVN 05:2013/BTNMT** — Ambient Air Quality
- **Custom** — User-defined regulations via Regulation Manager
