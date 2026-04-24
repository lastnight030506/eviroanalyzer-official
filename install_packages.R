# Install missing packages for EnviroAnalyzer
# Run this in R or Rscript

pkgs <- c("shiny","shinydashboard","shinyWidgets","DT","rhandsontable",
          "dplyr","tidyr","ggplot2","plotly","readxl","writexl","broom")

install_if_missing <- function(pkg) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    cat("Installing:", pkg, "\n")
    install.packages(pkg, repos = "https://cloud.r-project.org", dependencies = TRUE)
  } else {
    cat(pkg, "already installed\n")
  }
}

invisible(lapply(pkgs, install_if_missing))
cat("\nDone! Run: shiny::runApp()\n")
