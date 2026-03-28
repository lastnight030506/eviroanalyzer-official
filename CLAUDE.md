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
- Rust backend (`src-tauri/src/lib.rs`) executes R scripts via `run_r_script` command
- Finds Rscript at `C:\Program Files\R\R-X\bin\Rscript.exe` on Windows
- R scripts live in `src-tauri/scripts/` directory
- Service layer in `services/r-sidecar.ts` wraps Tauri invoke calls
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

### Agent Workflow Rules

#### Phase 1: Feature Decomposition & Documentation

For every feature service, decompose it into smaller, manageable modules. Each module must include:

- **`.agent` file**: Create a dedicated file named `[module_name].agent`
- **Mandatory Content**:
  - **Functionality**: Detailed description of what the module does
  - **Tasks**: List of specific technical tasks the module handles
  - **Purpose**: The "Why" behind this module and its value to the feature
  - **General Roadmap**: High-level architectural direction and how it integrates with the overall feature

#### Phase 2: Interactive Analysis Workflow

Before execution, follow this communication protocol:

1. **Prompt Analysis**: Deeply analyze the user's request to identify the specific feature involved
2. **Confirmation Loop**: Ask clarifying questions to confirm the correct feature/module
3. **Targeted Reading**: Once confirmed, read only:
   - The relevant `.agent` files of those specific modules
   - Associated `.md` documentation files for technical context
   - Avoid scanning unrelated files to maintain focus and efficiency

### Patterns
- **Type guards**: `filter((v): v is number => v !== null)`
- **Props drilling**: Acceptable for this app size (no context needed)
- **Recharts**: `isAnimationActive={false}` for performance
- **Dynamic theming**: Pass `isDarkMode` prop, compute styles object
