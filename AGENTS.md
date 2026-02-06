# AGENTS.md - Coding Agent Instructions

## Project Overview

**EnviroAnalyzer Pro** - A Tauri + React + TypeScript desktop application for environmental compliance assessment (QCVN standards). Analyzes water quality parameters against Vietnamese regulatory standards.

**Stack**: React 18, TypeScript, Tailwind CSS, Recharts, Tauri (Rust), Vite

## Build Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run tauri dev        # Start Tauri dev (desktop app)

# Production Build
npm run build            # Build for production
npm run tauri build      # Build Tauri desktop app

# Type Checking
npm run tauri build -- --debug  # Debug build with symbols
```

**No test suite configured** - Add tests with `vitest` if needed.

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** - No `any` types, no `@ts-ignore`
- Use explicit return types on exported functions
- Prefer `interface` over `type` for object shapes
- Use union types for finite states: `type Status = 'Pass' | 'Warning' | 'Fail'`

### Naming Conventions

- Components: PascalCase (`Dashboard.tsx`, `DataEditor.tsx`)
- Utils/Hooks: camelCase (`logic.ts`, `useTheme.ts`)
- Types/Interfaces: PascalCase (`AssessmentResult`, `SampleRow`)
- Constants: UPPER_SNAKE_CASE (`COLORS`, `QCVN_STANDARDS`)
- CSS classes: Tailwind utility classes (no custom CSS files)

### Imports

```typescript
// Order: React → External libs → Internal (types → utils → components)
import React from 'react';
import { BarChart } from 'recharts';
import { AssessmentResult } from '../types';
import { getComplianceStats } from '../utils/logic';
import Dashboard from '../components/Dashboard';
```

### Component Structure

```typescript
interface Props {
  results: AssessmentResult[];
  isDarkMode: boolean;
}

const Component: React.FC<Props> = ({ results, isDarkMode }) => {
  // Hooks first
  const stats = getComplianceStats(results);
  
  // Handlers
  const handleClick = () => { ... };
  
  // Render
  return (<div>...</div>);
};

export default Component;
```

### Styling (Tailwind CSS)

- Use Tailwind utility classes exclusively
- Dark mode: `dark:` prefix classes (e.g., `dark:bg-slate-800`)
- Color palette: Slate (grays), Emerald (success), Amber (warning), Rose (danger), Sky (primary)
- Transitions: Always include `transition-colors` for theme changes
- Spacing: Use standard scale (4, 6, 8, etc.)

### Error Handling

- Validate inputs at component boundaries
- Use TypeScript strict null checks
- Return sensible defaults for empty states (see `assessCompliance` for pattern)
- No empty catch blocks - always handle or propagate

### State Management

- Use React hooks (`useState`, `useEffect`, `useMemo`)
- Lift state to common ancestor when needed
- Props drilling acceptable for this app size (no context needed yet)

### File Organization

```
/src
  /components     # React components
  /utils          # Pure logic functions
  types.ts        # Shared TypeScript interfaces
  constants.ts    # App constants (colors, standards)
  App.tsx         # Root component
  index.tsx       # Entry point
/src-tauri        # Rust backend (Tauri)
  /src
    lib.rs        # Tauri commands
    main.rs       # Entry point
```

### Git

- Do not commit without explicit user request
- Do not commit `.env` or credential files
- Standard `.gitignore` excludes: `node_modules`, `dist`, `*.log`

### Key Patterns

1. **Type guards**: Use `filter((v): v is number => v !== null)` for type narrowing
2. **Dynamic theming**: Pass `isDarkMode` prop, compute styles object
3. **Data flow**: Parent manages state → passes to children via props
4. **Chart config**: Use `isAnimationActive={false}` for performance
5. **Recharts**: Always wrap in `ResponsiveContainer` with `debounce={300}`
