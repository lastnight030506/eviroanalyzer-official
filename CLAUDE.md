# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
# Development
npm run dev              # Start Vite dev server (http://localhost:3000)
npm run tauri dev         # Start Tauri desktop app

# Production
npm run build             # Build frontend for production
npm run tauri build       # Build Tauri desktop app (.exe)
npm run build:tauri       # Alternative Tauri build

# Testing
npm test                  # Run Vitest tests
npm test -- --run         # Run tests once (CI mode)

# Type checking
npx tsc --noEmit          # TypeScript validation
```

### Running as Localhost Web App (without Tauri desktop)

The app can run as a localhost web app for development. This requires running a Node.js server that executes R scripts.

```bash
# Terminal 1: Start the R sidecar server (port 3001)
npm run dev:server

# Terminal 2: Start Vite dev server (port 3000)
npm run dev

# Or run both together:
npm run dev:full
```

The server (`server.js`) is an Express server that:
- Executes R scripts via `Rscript.exe`
- Serves API at `http://localhost:3001`
- Endpoints:
  - `POST /api/rscript` - Execute R script
  - `GET /api/health` - Health check

### Requirements for localhost mode:
- R must be installed (finds Rscript automatically on Windows)
- Required R packages: jsonlite, haven, readr, readxl, dplyr, tidyr, janitor

## Architecture

### Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Desktop**: Tauri 2 (Rust backend)
- **Charts**: Recharts (wrap in `ResponsiveContainer` with `debounce={300}`)
- **Maps**: Leaflet.js, react-leaflet
- **Statistics**: R sidecar (ARIMA, Kriging, Prophet)
- **Testing**: Vitest

### Data Flow
```
App.tsx (state root)
  ├── DataEditor (sample entry via Spreadsheet)
  ├── ComplianceEngine → assessCompliance() in utils/logic.ts
  ├── Dashboard (charts from AssessmentResult[])
  └── ReportExport → HTML/CSV/PDF via services/report-export.ts
```

### R Sidecar Architecture
- **ALL statistical/logical processing MUST use R** - never implement statistics in TypeScript/JavaScript
- Architecture supports two modes:
  1. **Desktop (Tauri)**: Uses Rust backend `invoke("run_r_script")`
  2. **Browser (localhost)**: Uses `server.js` Express server at port 3001
- The `services/r-sidecar.ts` auto-detects which mode to use based on whether `__TAURI__` is defined in window
- Rust backend (`src-tauri/src/lib.rs`) executes R scripts via `run_r_script` command
- Rscript path: resolve via `where Rscript` or check common Windows paths (`C:\Program Files\R\R-*`)
- R scripts live in `src-tauri/scripts/` directory
- Falls back to browser-native downloads if Tauri APIs unavailable

### Compliance Assessment Logic (`utils/logic.ts`)
- `assessCompliance(data, sampleColumns, safetyMargin)` → `AssessmentResult[]`
- **max type**: Pass <80% limit, Warning 80-100%, Fail >limit
- **min type** (e.g., DO): Inverse logic
- Seed-based data generation via Base94 encoding (`encodeDatasetToSeed`)

### Key Types (`types.ts`)
- `SampleRow`: Dynamic columns "Sample 1", "Sample 2"... plus metadata
- `AssessmentResult`: Per-parameter compliance verdict
- `ComplianceStatus`: "Pass" | "Warning" | "Fail" | "N/A"

### Standards (`constants.ts`)
- QCVN 08-MT:2015 (Water - Irrigation)
- QCVN 14:2008/BTNMT (Domestic Wastewater)
- QCVN 05:2013/BTNMT (Air Quality)

### Directory Structure
```
src/                    # React frontend
  components/           # React components
  services/             # API and external service wrappers
  utils/                # Utility functions (logic.ts, helpers)
  types.ts              # TypeScript type definitions
src-tauri/              # Tauri/Rust backend
  src/lib.rs            # Rust entry point
  scripts/              # R scripts for statistical analysis
```
## Git Workflow
- Commit style: `type: short description` (e.g., `feat: add Kriging analysis`, `fix: resolve merge conflicts`)
- Branch: `master` is main branch
- Always push commits before pulling to avoid losing work

## Code Conventions

### Imports Order
```typescript
import React from 'react';
import { ExternalLib } from 'library';
import { AssessmentResult } from '../types';
import { getComplianceStats } from '../utils/logic';
import Dashboard from '../components/Dashboard';
```

### Component Structure
```typescript
interface Props { ... }
const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  // Hooks first
  const stats = useMemo(() => ..., []);

  // Handlers
  const handleClick = () => { ... };

  // Render
  return <div>...</div>;
};
```

### Tailwind Styling
- Use `dark:` prefix for dark mode (e.g., `dark:bg-slate-800`)
- Color palette: Slate (grays), Emerald (success), Amber (warning), Rose (danger), Sky (primary)
- Always include `transition-colors` for theme changes
- No custom CSS files — Tailwind only

### Agent Workflow
Use `.agent` files for feature decomposition: create `[module_name].agent` with Functionality, Tasks, Purpose, and General Roadmap sections.

### Patterns
- **Type guards**: `filter((v): v is number => v !== null)`
- **Props drilling**: Acceptable for this app size (no context needed)
- **Recharts**: `isAnimationActive={false}` for performance
- **Dynamic theming**: Pass `isDarkMode` prop, compute styles object
