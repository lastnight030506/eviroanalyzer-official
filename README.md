# EnviroAnalyzer Pro

> 🌿 Professional Environmental Data Filtering & Statistical Analysis Module

An **R Shiny** application for importing, exploring, cleaning, and statistically analyzing environmental sample data. It provides interactive outlier detection, ANOVA, hypothesis testing, linear regression, composite variable creation, and data-export capabilities through a dark-themed, responsive UI.

---

## ✨ Features

| Tab | What it does |
|-----|--------------|
| **Data Import** | Upload CSV / Excel, paste tab-separated data, or load built-in sample data. Multi-sheet Excel support with sheet tabs. |
| **Outlier Detection** | Detect outliers per numeric column using the IQR method (configurable *k*). Interactive boxplots and detail tables. |
| **ANOVA Analysis** | One-way ANOVA with Tukey HSD post-hoc tests and group-comparison plots. |
| **Data Cleaning** | Remove, Winsorize (cap), or replace outliers with `NA`. Export cleaned data as CSV or Excel. |
| **Statistical Inference** | Normality check (Shapiro-Wilk), independent / paired t-tests, chi-square test of independence, and correlation heatmap. Includes composite variable builder and Cronbach's Alpha reliability analysis. |
| **Regression Analysis** | Linear regression with composite variable support. Scatter plots with regression line, correlation coefficient, and automatic hypothesis interpretation. |

### Statistical Highlights

- **Composite Variables**: Create row-wise mean scores from multiple Likert-scale items or measurements. Works in both Statistical Inference and Regression tabs.
- **Cronbach's Alpha**: Internal consistency reliability check using the `psych` package.
- **Directional T-tests**: Choose alternative hypothesis direction (Two-sided / Less / Greater) for independent t-tests.
- **Group Descriptives**: Automatic Mean, SD, and *n* table for t-test group comparisons.
- **Regression Modeling**: Supports single-column or multi-column composite variables for both independent (X) and dependent (Y) variables.

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
Rscript install_packages.R
```

This installs required packages into a local `.r-lib` folder.

### 2. Run the app

```bash
# Option A — launcher script
Rscript run_app.R

# Option B — from an R console
shiny::runApp('.')
```

The app will be available at `http://127.0.0.1:3819` (or an auto-assigned port).

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| UI Framework | R Shiny + bslib (Bootstrap 5) |
| Tables | DT (DataTables) |
| Visualization | ggplot2 + plotly |
| Data Wrangling | dplyr, tidyr |
| I/O | readxl, writexl |
| Statistics | R base stats, broom, psych |

---

## 📁 Source Layout

```
├── app.R                   # Main Shiny application (UI + server + logic)
├── run_app.R               # Convenience launcher (port 3819)
├── install_packages.R      # Installs required R packages locally
├── sample_data.csv         # Built-in demo data (water quality stations)
├── test_data.csv           # Additional test data
├── modules/                # 📦 Feature-based design docs & barrel re-exports
│   ├── compliance-engine/
│   ├── data-editor/
│   ├── dashboard/
│   ├── forecasting/
│   ├── gis-spatial/
│   ├── report-export/
│   ├── r-shiny-filter/
│   └── ...
├── .r-lib/                 # Local R package library (auto-created)
└── uploads/                # Uploaded file storage
```

> **Note:** The `modules/` directory contains design documentation and re-export stubs for planned expansion (e.g., compliance engine, dashboard, GIS). The current, fully functional implementation lives in **`app.R`**.

---

## 📋 Supported Data Formats

- **CSV** (`.csv`)
- **Excel** (`.xlsx`, `.xls`) — multiple sheets supported
- **Paste / tab-separated** text

---

## 🧪 Sample Data

The included `sample_data.csv` contains water-quality measurements for Vietnamese monitoring stations:

```csv
Station_ID,Station_Name,Date,pH,DO,BOD5,COD,TSS,NH4,NO3,PO4,Turbidity,Temperature,Group
ST001,Song Sai Gon - Binh Phuoc,2024-01-15,7.2,5.8,12.5,28.3,45.2,1.2,4.5,0.35,18.5,28.2,A
ST002,Kenh Nhieu Loc,2024-01-15,6.5,3.2,35.2,68.5,95.3,4.5,8.2,1.25,45.8,28.5,B
```

Load it instantly via **Data Import → Load Sample**.

---

## 📄 License

MIT License — Copyright (c) 2024 EnviroAnalyzer Pro
