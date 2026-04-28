# AGENTS.md - Coding Agent Instructions

## Project Overview

**EnviroAnalyzer Pro** - An R Shiny desktop-grade web application for environmental data filtering and statistical analysis. Provides interactive data import, outlier detection, ANOVA, hypothesis testing, and data export.

**Stack**: R, Shiny, bslib, ggplot2, plotly, DT, dplyr, tidyr, readxl, writexl, broom

## Build Commands

```bash
# Install dependencies (local .r-lib)
Rscript install_packages.R

# Run the Shiny app
Rscript run_app.R

# Or from R console
shiny::runApp('.')
```

**No test suite configured** — Add tests with `testthat` if needed.

## Code Style Guidelines

### R Code

- Use `<-` for assignment, `=` only in function arguments
- Prefer `snake_case` for function and variable names
- Prefix internal helpers with module name or keep them descriptive
- Avoid `suppressMessages` / `suppressWarnings` unless necessary; use `suppressPackageStartupMessages` for library loads

### Naming Conventions

- UI output IDs: `snake_case` (e.g., `outlier_table`, `anova_plot`)
- Reactive values: `camelCase` ending in descriptive noun (e.g., `raw_data`, `cleaned_data`)
- Functions: `snake_case`, descriptive verbs (e.g., `detect_outliers_iqr`, `run_anova_analysis`)
- Constants: UPPER_SNAKE_CASE (if any)

### Imports

```r
# Order: Base R → Tidyverse / Shiny ecosystem → Others
library(shiny)
library(bslib)
library(dplyr)
library(ggplot2)
```

### Module / Component Structure

```r
# UI panel for a tab
my_tab_ui <- function(id) {
  ns <- NS(id)
  tagList(
    # inputs
    # outputs
  )
}

# Server logic for a tab
my_tab_server <- function(id, data) {
  moduleServer(id, function(input, output, session) {
    # Reactives
    # Observers
    # Outputs
  })
}
```

> Current implementation is a monolithic `app.R` (UI + server + helpers). Future modularization can use Shiny modules.

### Styling (bslib + Custom CSS)

- Use `bs_theme()` for the base dark theme; override with custom CSS inside `tags$head(tags$style(HTML("...")))`
- Color palette: `#0ea5e9` (Sky/primary), `#10b981` (Emerald/success), `#f59e0b` (Amber/warning), `#ef4444` (Rose/danger), `#64748b` (Slate/muted)
- Dark backgrounds: `#0b1120` (body), `#0f172a` (sidebar/input), `#1e293b` (card)
- Text: `#e2e8f0` (primary), `#94a3b8` (secondary), `#64748b` (muted)
- Always test hover/focus states for accessibility

### Error Handling

- Wrap file I/O and stats computations in `tryCatch(..., error = function(e) { showNotification(...) })`
- Use `req()` to guard reactive outputs against `NULL` data
- Return sensible defaults for empty states (e.g., empty data frames with message columns)
- No silent failures — notify the user via `showNotification()`

### State Management

- Use `reactiveVal()` and `reactive()` for state
- Keep `raw_data()` immutable; mutate via `cleaned_data()` or separate reactive vals
- Reset downstream results when upstream data changes (e.g., `reset_analysis_results()`)
- Sheet-based Excel data stored in `reactiveVal(list())` with `active_sheet()` tracking

### File Organization

```
├── app.R                   # Main Shiny app (UI, server, helpers)
├── run_app.R               # Launcher script
├── install_packages.R      # Dependency installer
├── sample_data.csv         # Demo data
├── test_data.csv           # Additional test data
├── modules/                # Design docs & re-export stubs for planned features
├── .r-lib/                 # Local R package library (auto-created, gitignored)
└── uploads/                # Uploaded file storage (gitignored)
```

### Git

- **Always commit** when explicitly requested or after completing requested file changes
- Do not commit `.env`, credential files, or `uploads/`
- Standard `.gitignore` excludes: `.r-lib/`, `.Rhistory`, `*.log`, `shiny.log`, `shiny.err`, `uploads/`

### Key Patterns

1. **Freeze inputs before updating**: `freezeReactiveValue(input, "id")` before `updateSelectInput()` to avoid reactive loops
2. **Data caching**: Use `bindCache()` on expensive reactives where appropriate
3. **Plot theming**: Wrap ggplot in `plotly::ggplotly()` with dark hover labels; disable mode bar via `config(displayModeBar = FALSE)`
4. **DT tables**: Use `server = TRUE`, `deferRender = TRUE`, and explicit scroll dimensions for large data
5. **Sheet tabs**: Render custom buttons that call `Shiny.setInputValue()` for multi-sheet Excel navigation
