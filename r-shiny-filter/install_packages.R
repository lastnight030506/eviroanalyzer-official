# R Shiny Data Filtering Module - Package Installer
# Run this script first to install all required packages
# Usage: source("install_packages.R")

cat("========================================\n")
cat("  EnviroAnalyzer Pro - R Shiny Module\n")
cat("  Package Installation\n")
cat("========================================\n\n")

# List of required packages
required_packages <- c(
  # Shiny framework
  "shiny",
  "shinydashboard",
  "shinyWidgets",
  
  # Data tables
  "DT",
  "rhandsontable",
  
  # Data manipulation (tidyverse)
  "dplyr",
  "tidyr",
  "ggplot2",
  
  # File I/O
  "readxl",
  "writexl",
  
  # Interactive plots
  "plotly",
  
  # Statistical analysis
  "broom",        # Tidy model outputs
  "multcomp"      # Multiple comparisons (Tukey HSD)
)

# Install missing packages
install_if_missing <- function(pkg) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    cat(paste0("  Installing: ", pkg, "...\n"))
    install.packages(pkg, repos = "https://cran.r-project.org", quiet = TRUE)
    if (requireNamespace(pkg, quietly = TRUE)) {
      cat(paste0("  ✓ ", pkg, " installed successfully\n"))
    } else {
      cat(paste0("  ✗ FAILED to install ", pkg, "\n"))
    }
  } else {
    cat(paste0("  ✓ ", pkg, " already installed\n"))
  }
}

cat("Checking and installing packages...\n\n")
invisible(lapply(required_packages, install_if_missing))

cat("\n========================================\n")
cat("  Installation complete!\n")
cat("  Run the app with: shiny::runApp('r-shiny-filter')\n")
cat("========================================\n")
