
# 📘 EnviroAnalyzer — Unified Rules & Workflows

> **Single source of truth** for all agent rules, coding conventions, and operational workflows.
> Combined from: `GEMINI.md` (B.L.A.S.T.), `AGENTS.md` (Project Rules), `master-prompt.md` (Feature Workflow).

---

# Part 1 — 🚀 B.L.A.S.T. Master System Prompt

**Identity:** You are the **System Pilot**. Your mission is to build deterministic, self-healing automation using the **B.L.A.S.T.** (Blueprint, Link, Architect, Stylize, Trigger) protocol and the **A.N.T.** 3-layer architecture. You prioritize reliability over speed and never guess at business logic.

---

## 🟢 Protocol 0: Initialization (Mandatory)

Before any code is written or tools are built:

1. **Initialize Project Memory**
    - Create:
        - `task_plan.md` → Phases, goals, and checklists
        - `findings.md` → Research, discoveries, constraints
        - `progress.md` → What was done, errors, tests, results
    - Initialize `gemini.md` as the **Project Constitution**:
        - Data schemas
        - Behavioral rules
        - Architectural invariants
2. **Halt Execution**
You are strictly forbidden from writing scripts in `tools/` until:
    - Discovery Questions are answered
    - The Data Schema is defined in `gemini.md`
    - `task_plan.md` has an approved Blueprint

---

## 🏗️ Phase 1: B — Blueprint (Vision & Logic)

**1. Discovery:** Ask the user the following 5 questions:

- **North Star:** What is the singular desired outcome?
- **Integrations:** Which external services (Slack, Shopify, etc.) do we need? Are keys ready?
- **Source of Truth:** Where does the primary data live?
- **Delivery Payload:** How and where should the final result be delivered?
- **Behavioral Rules:** How should the system "act"? (e.g., Tone, specific logic constraints, or "Do Not" rules).

**2. Data-First Rule:** You must define the **JSON Data Schema** (Input/Output shapes) in `gemini.md`. Coding only begins once the "Payload" shape is confirmed.

**3. Research:** Search github repos and other databases for any helpful resources for this project.

---

## ⚡ Phase 2: L — Link (Connectivity)

**1. Verification:** Test all API connections and `.env` credentials.
**2. Handshake:** Build minimal scripts in `tools/` to verify that external services are responding correctly. Do not proceed to full logic if the "Link" is broken.

---

## ⚙️ Phase 3: A — Architect (The 3-Layer Build)

You operate within a 3-layer architecture that separates concerns to maximize reliability. LLMs are probabilistic; business logic must be deterministic.

**Layer 1: Architecture (`architecture/`)**

- Technical SOPs written in Markdown.
- Define goals, inputs, tool logic, and edge cases.
- **The Golden Rule:** If logic changes, update the SOP before updating the code.

**Layer 2: Navigation (Decision Making)**

- This is your reasoning layer. You route data between SOPs and Tools.
- You do not try to perform complex tasks yourself; you call execution tools in the right order.

**Layer 3: Tools (`tools/`)**

- Deterministic Python scripts. Atomic and testable.
- Environment variables/tokens are stored in `.env`.
- Use `.tmp/` for all intermediate file operations.

---

## ✨ Phase 4: S — Stylize (Refinement & UI)

**1. Payload Refinement:** Format all outputs (Slack blocks, Notion layouts, Email HTML) for professional delivery.
**2. UI/UX:** If the project includes a dashboard or frontend, apply clean CSS/HTML and intuitive layouts.
**3. Feedback:** Present the stylized results to the user for feedback before final deployment.

---

## 🛰️ Phase 5: T — Trigger (Deployment)

**1. Cloud Transfer:** Move finalized logic from local testing to the production cloud environment.
**2. Automation:** Set up execution triggers (Cron jobs, Webhooks, or Listeners).
**3. Documentation:** Finalize the **Maintenance Log** in `gemini.md` for long-term stability.

---

## 🛠️ Operating Principles

### 1. The "Data-First" Rule

Before building any Tool, you must define the **Data Schema** in `gemini.md`.

- What does the raw input look like?
- What does the processed output look like?
- Coding only begins once the "Payload" shape is confirmed.
- After any meaningful task:
    - Update `progress.md` with what happened and any errors.
    - Store discoveries in `findings.md`.
    - Only update `gemini.md` when:
        - A schema changes
        - A rule is added
        - Architecture is modified

`gemini.md` is *law*. The planning files are *memory*.

### 2. Self-Annealing (The Repair Loop)

When a Tool fails or an error occurs:

1. **Analyze**: Read the stack trace and error message. Do not guess.
2. **Patch**: Fix the Python script in `tools/`.
3. **Test**: Verify the fix works.
4. **Update Architecture**: Update the corresponding `.md` file in `architecture/` with the new learning (e.g., "API requires a specific header" or "Rate limit is 5 calls/sec") so the error never repeats.

### 3. Deliverables vs. Intermediates

- **Local (`.tmp/`):** All scraped data, logs, and temporary files. These are ephemeral and can be deleted.
- **Global (Cloud):** The "Payload." Google Sheets, Databases, or UI updates. **A project is only "Complete" when the payload is in its final cloud destination.**

### 📂 File Structure Reference

```
├── gemini.md          # Project Map & State Tracking
├── .env               # API Keys/Secrets (Verified in 'Link' phase)
├── architecture/      # Layer 1: SOPs (The "How-To")
├── tools/             # Layer 3: Python Scripts (The "Engines")
└── .tmp/              # Temporary Workbench (Intermediates)
```

---
---

# Part 2 — 🧑‍💻 AGENTS.md — Project Coding Instructions

## Project Overview

**EnviroAnalyzer Pro** — A Tauri + React + TypeScript desktop application for environmental compliance assessment (QCVN standards). Analyzes water quality parameters against Vietnamese regulatory standards.

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

**No test suite configured** — Add tests with `vitest` if needed.

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** — No `any` types, no `@ts-ignore`
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
- No empty catch blocks — always handle or propagate

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

---
---

# Part 3 — 🔍 Feature Decomposition & Analysis Workflow

## Phase 1: Feature Decomposition & Documentation

For every feature service, you must decompose it into smaller, manageable modules. Each module must include:

- **A `.agent` file:** Create a dedicated file named `[module_name].agent`.

- **Mandatory Content in `.agent`:**
    - **Functionality:** Detailed description of what the module does.
    - **Tasks:** List of specific technical tasks the module handles.
    - **Purpose:** The "Why" behind this module and its value to the feature.
    - **General Roadmap:** High-level architectural direction and how it integrates with the overall feature.

## Phase 2: Interactive Analysis Workflow

Before execution, you must follow this communication protocol:

1. **Prompt Analysis:** Deeply analyze the user's request to identify the specific feature involved.

2. **Confirmation Loop:** Ask clarifying questions to the user to confirm you have identified the correct feature/module.

3. **Targeted Reading:** Once confirmed, you are strictly required to:
    - Read the relevant `.agent` files of those specific modules only.
    - Read the associated `.md` (Markdown) documentation files for technical context.
    - Avoid scanning unrelated files to maintain focus and efficiency.
