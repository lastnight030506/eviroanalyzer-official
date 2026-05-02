# Install missing packages for EnviroAnalyzer
# Run this in R or Rscript from the project root

pkgs <- c("shiny", "bslib", "shinydashboard", "shinyWidgets", "DT", "rhandsontable",
          "dplyr", "tidyr", "ggplot2", "plotly", "readxl", "writexl", "broom", "psych")

local_lib <- file.path(getwd(), ".r-lib")
dir.create(local_lib, recursive = TRUE, showWarnings = FALSE)
.libPaths(c(normalizePath(local_lib, winslash = "/", mustWork = FALSE), .libPaths()))

install_if_missing <- function(pkg) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    cat("Installing:", pkg, "\n")
    install.packages(pkg, repos = "https://cloud.r-project.org", dependencies = TRUE, lib = local_lib)
  } else {
    cat(pkg, "already installed\n")
  }
}

invisible(lapply(pkgs, install_if_missing))
cat("\nDone! Local library:", normalizePath(local_lib, winslash = "/", mustWork = FALSE), "\n")
cat("Run: shiny::runApp('.')\n")
