# EnviroAnalyzer - Data Import (CSV, Excel, SPSS)
# Usage: Rscript read_data.R <json_input>

required_packages <- c("jsonlite", "haven", "readr", "readxl")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]
if (length(missing_packages) > 0) {
  cat(toJSON(list(success = FALSE, error = paste("Missing packages:", paste(missing_packages, collapse = ", ")))))
  quit(status = 1)
}

library(jsonlite)
library(haven)
library(readr)
library(readxl)

args <- commandArgs(trailingOnly = TRUE)
input <- fromJSON(args[1])

file_path <- input$file_path
file_type <- input$file_type

# Session storage - use global env to persist data
session_id <- input$session_id
if (is.null(session_id)) session_id <- as.character(Sys.time())
env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))

tryCatch({
  # Read the file based on type
  if (file_type == "csv") {
    data <- read_csv(file_path, show_col_types = FALSE)
  } else if (file_type == "excel") {
    data <- read_excel(file_path)
  } else if (file_type == "sav") {
    data <- read_sav(file_path)
  } else {
    stop("Unsupported file type")
  }

  # Store in session environment
  assign(env_name, data, envir = .GlobalEnv)

  # Extract variable information
  var_info <- lapply(names(data), function(var_name) {
    col <- data[[var_name]]
    var_type <- class(col)[1]

    # Determine type
    if (is.numeric(col)) {
      type <- "numeric"
    } else if (is.factor(col) || is.character(col)) {
      type <- if (length(unique(col)) <= 10) "factor" else "character"
    } else {
      type <- "character"
    }

    # Get levels for factors
    levels <- NULL
    if (type == "factor") {
      levels <- levels(col)
    }

    list(
      name = var_name,
      label = attr(col, "label") %||% "",
      type = type,
      levels = levels,
      missing_count = sum(is.na(col))
    )
  })

  result <- list(
    success = TRUE,
    session_id = session_id,
    variables = var_info,
    row_count = nrow(data),
    column_count = ncol(data)
  )

  cat(toJSON(result, auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})