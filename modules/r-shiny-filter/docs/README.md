# 🔬 R Shiny Filter

> Standalone browser-based R Shiny app for interactive environmental data filtering and exploration.

## Overview

A self-contained R Shiny web application that provides advanced data filtering, exploration, and visualization for environmental datasets. Runs independently in a web browser — no Tauri desktop app required.

## Source Files

| File | Location | Description |
|------|----------|-------------|
| `app.R` | [`r-shiny-filter/app.R`](../../r-shiny-filter/app.R) | Main Shiny application (~27KB) |
| `install_packages.R` | [`r-shiny-filter/install_packages.R`](../../r-shiny-filter/install_packages.R) | R package installer |
| `sample_data.csv` | [`r-shiny-filter/sample_data.csv`](../../r-shiny-filter/sample_data.csv) | Demo environmental dataset |

## How to Run

```bash
# 1. Install R packages (first time only)
Rscript r-shiny-filter/install_packages.R

# 2. Launch the Shiny app
Rscript -e "shiny::runApp('r-shiny-filter', launch.browser = TRUE)"
```

## Features

- Load data from CSV files or use built-in sample data
- Interactive filtering controls (by parameter, range, location)
- Reactive data tables with real-time filtering
- Summary statistics and visualizations
- Export filtered data subsets

## Dependencies

- **R** (must be installed separately)
- R packages: `shiny` + dependencies from `install_packages.R`
- **No TypeScript dependencies** — fully standalone R application

## Relationship to Main App

This is a **companion tool**, not integrated into the Tauri desktop app. It's useful for:
- Quick data exploration without launching the full desktop app
- Environments where Tauri/Rust is not available
- Users who prefer browser-based R workflows
