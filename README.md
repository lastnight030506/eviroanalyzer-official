# EnviroAnalyzer Pro

<div align="center">

![EnviroAnalyzer Logo](src-tauri/icons/icon.png)

**Professional Environmental Compliance Assessment Tool**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)

</div>

---

## 📖 Overview

EnviroAnalyzer Pro is a desktop application for environmental compliance assessment based on Vietnamese National Technical Regulations (QCVN). It helps environmental engineers, compliance officers, and researchers analyze water, air, and soil quality data against regulatory standards.

## ✨ Features

### 🔬 Core Analysis
- **Compliance Assessment**: Automatically evaluate samples against QCVN standards
- **Pass/Warning/Fail Classification**: Color-coded status indicators
- **Statistical Analysis**: Mean, max, min, and percentage of limit calculations
- **Multiple Regulations**: Support for QCVN 08-MT:2015 (Water), QCVN 14:2008 (Wastewater), QCVN 05:2013 (Air)

### 📊 Visualization Dashboard
- **Bar Charts**: Compliance overview showing % of limit for each parameter
- **Pie Charts**: Status distribution (Pass/Warning/Fail counts)
- **Radar Charts**: Multi-parameter comparison visualization
- **Summary Cards**: Quick statistics at a glance

### 📈 Advanced Forecasting (R-powered)
- **ARIMA Models**: Time series prediction for environmental parameters
- **Confidence Intervals**: Upper/Lower bounds for forecasted values
- **Model Metrics**: AIC, MAE, RMSE, MAPE statistics

### 🗺️ GIS & Spatial Analysis (R-powered)
- **Kriging Interpolation**: Spatial prediction using gstat package
- **Interactive Maps**: Leaflet.js integration with multiple tile layers
- **Coordinate Input**: Support for Vietnamese geographic coordinates

### 📄 Automated Reporting
- **PDF Export**: Professional compliance reports via R Markdown
- **DOCX Export**: Microsoft Word format reports
- **Customizable**: Include all charts, tables, and statistics

### ⚙️ Regulation Management
- **CRUD Operations**: Create, Read, Update, Delete custom regulations
- **Import/Export**: JSON format for sharing regulations
- **Parameter Configuration**: Set limits, units, and threshold types (max/min)

### 🌙 User Experience
- **Dark Mode**: Full dark theme support
- **Auto-save**: Automatic data persistence
- **Seed-based Generation**: Reproducible mock data for testing
- **URL Sharing**: Encode datasets to shareable strings

---

## 🖥️ System Requirements

### Minimum Requirements
- **OS**: Windows 10/11, macOS 11+, or Linux (Ubuntu 20.04+)
- **RAM**: 4 GB
- **Disk**: 500 MB free space
- **Display**: 1280x720 resolution

### For Full Functionality (R Integration)
- **R**: Version 4.0 or higher
- **Required R Packages**:
  - `jsonlite` - JSON parsing
  - `forecast` - ARIMA time series
  - `gstat` - Kriging interpolation
  - `sp` - Spatial data handling
  - `rmarkdown` - Report generation
  - `knitr` - Document rendering

---

## 📦 Installation

### Option 1: Download Pre-built Installer

Download the latest release for your platform:
- **Windows**: `EnviroAnalyzer_x.x.x_x64-setup.exe`
- **macOS**: `EnviroAnalyzer_x.x.x_aarch64.dmg`
- **Linux**: `EnviroAnalyzer_x.x.x_amd64.AppImage`

### Option 2: Build from Source

```bash
# Clone repository
git clone https://github.com/yourusername/enviroanalyzer.git
cd enviroanalyzer

# Install dependencies
npm install

# Development mode
npm run tauri dev

# Build for production
npm run tauri build
```

---

## 🔧 R Environment Setup

For advanced features (Forecasting, GIS, PDF/DOCX export), install R and required packages:

### Step 1: Install R

Download and install R from: https://cran.r-project.org/

- **Windows**: Download `R-4.x.x-win.exe`
- **macOS**: Download `R-4.x.x.pkg`
- **Linux**: `sudo apt install r-base`

### Step 2: Install Required R Packages

Open R console (RGui or terminal) and run:

```r
# Core packages for Forecasting and GIS
install.packages(c("jsonlite", "forecast", "gstat", "sp"), 
                 repos = "https://cloud.r-project.org")

# For PDF/DOCX report generation
install.packages(c("rmarkdown", "knitr"), 
                 repos = "https://cloud.r-project.org")

# For PDF output (requires LaTeX)
# Option A: Use tinytex (recommended)
install.packages("tinytex")
tinytex::install_tinytex()

# Option B: Install full LaTeX distribution (MiKTeX on Windows)
```

### Step 3: Verify Installation

The app will display a green "R x.x.x" badge in the header when R is properly detected.

---

## 📱 User Guide

### Getting Started

1. **Launch the app** - EnviroAnalyzer will start with default QCVN 08-MT:2015 regulation
2. **Generate or Enter Data** - Use the Data Generator or manually input values
3. **View Results** - Switch to Analysis tab to see compliance charts
4. **Run Advanced Analysis** - Use Forecast or GIS tabs for R-powered features
5. **Export Report** - Click PDF or DOCX buttons to generate reports

### Tabs Overview

| Tab | Description |
|-----|-------------|
| **Data** | Enter/edit sample data, generate mock datasets |
| **Analysis** | View compliance charts and statistics |
| **Forecast** | Run ARIMA time series predictions |
| **GIS** | Spatial interpolation with Kriging |
| **Settings** | Manage regulations, check for updates |

### Data Input Methods

1. **Manual Entry**: Click cells in the data table to edit values
2. **Mock Generation**: Enter sample count and seed, click "Generate Dataset"
3. **Seed Sharing**: Copy the seed string to share reproducible datasets

### Understanding Results

| Status | Color | Meaning |
|--------|-------|---------|
| **Pass** | 🟢 Green | Value ≤ 80% of limit |
| **Warning** | 🟡 Yellow | Value between 80-100% of limit |
| **Fail** | 🔴 Red | Value exceeds limit |

### Regulation Management

1. Go to **Settings** tab
2. Click **+ Add Regulation** to create new
3. Fill in Name, Category, Description
4. Click **+ Add Parameter** for each parameter
5. Set Name, Unit, Limit, and Type (max/min)
6. Click **Save Regulation**

### Export/Import Regulations

- **Export**: Click download icon to save regulations as JSON
- **Import**: Click upload icon to load regulations from JSON file
- **Reset**: Click refresh icon to restore default QCVN standards

---

## 🔄 Auto-Update

EnviroAnalyzer Pro includes automatic update checking:

1. Go to **Settings** tab
2. Scroll to **Software Updates** section
3. Click **Check for Updates**
4. If available, click **Download & Install**
5. The app will restart with the new version

---

## 🛠️ Troubleshooting

### R Not Detected (Shows "R N/A")

1. Ensure R is installed in default location:
   - Windows: `C:\Program Files\R\R-x.x.x`
   - macOS: `/usr/local/bin/R`
2. Restart the application after installing R
3. Check Settings → Debug R Paths for detailed info

### PDF Export Fails

1. Install `rmarkdown` package: `install.packages("rmarkdown")`
2. Install LaTeX via tinytex: 
   ```r
   install.packages("tinytex")
   tinytex::install_tinytex()
   ```
3. Restart R session and try again

### Forecast/GIS Not Working

1. Verify all required packages are installed:
   ```r
   library(jsonlite)
   library(forecast)
   library(gstat)
   library(sp)
   ```
2. Check for package errors in R console
3. Update packages: `update.packages(ask = FALSE)`

### Data Not Saving

1. Check write permissions for AppData folder
2. Ensure disk space is available
3. Try exporting regulations manually as backup

---

## 🏗️ Project Structure

```
enviroanalyzer/
├── App.tsx              # Main React component
├── components/          # React components
│   ├── Dashboard.tsx    # Charts and stats
│   ├── DataEditor.tsx   # Data input table
│   ├── Forecast.tsx     # ARIMA forecasting
│   ├── GISMap.tsx       # Kriging interpolation
│   └── RegulationManager.tsx  # Regulation CRUD
├── services/            # Business logic
│   ├── regulations.ts   # Regulation persistence
│   └── updater.ts       # Auto-update service
├── utils/
│   └── logic.ts         # Compliance calculations
├── types.ts             # TypeScript interfaces
├── constants.ts         # QCVN standards data
├── src-tauri/           # Rust backend
│   ├── src/lib.rs       # Tauri commands
│   └── scripts/         # R scripts
│       ├── health_check.R
│       ├── forecast_arima.R
│       ├── kriging.R
│       └── generate_report.R
└── tests/               # Test suites
    ├── logic.test.ts
    ├── tauri-integration.test.ts
    └── e2e-workflows.test.ts
```

---

## 📜 Vietnamese Regulations Supported

| Code | Name | Category |
|------|------|----------|
| QCVN 08-MT:2015 | National Technical Regulation on Surface Water Quality | Water |
| QCVN 14:2008/BTNMT | National Technical Regulation on Domestic Wastewater | Water |
| QCVN 05:2013/BTNMT | National Technical Regulation on Ambient Air Quality | Air |

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Desktop app framework
- [React](https://reactjs.org/) - UI library
- [Recharts](https://recharts.org/) - Charting library
- [Leaflet](https://leafletjs.com/) - Interactive maps
- [R Project](https://www.r-project.org/) - Statistical computing

---

<div align="center">
Made with ❤️ for Environmental Protection
</div>
