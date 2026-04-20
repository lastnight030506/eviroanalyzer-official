# EnviroAnalyzer - Data Import (CSV, Excel, SPSS)
# Usage: Rscript read_data.R <json_input>

library(jsonlite)
library(haven)
library(readr)
library(readxl)

required_packages <- c("haven", "readr", "readxl")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]
if (length(missing_packages) > 0) {
  cat(toJSON(list(success = FALSE, error = paste("Missing packages:", paste(missing_packages, collapse = ", ")))))
  quit(status = 1)
}

args <- commandArgs(trailingOnly = TRUE)
# Read JSON from file (passed via temp file to handle Unicode filenames)
input_file <- args[1]
if (is.null(input_file) || !file.exists(input_file)) {
  stop("Input file not found")
}
input <- fromJSON(input_file)

# Decode URL-encoded filepath (from TypeScript encodeURIComponent)
file_path <- URLdecode(input$file_path)
file_type <- input$file_type
return_data <- is.null(input$return_data) || isTRUE(input$return_data)  # Default to TRUE if not specified

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

  # Convert data to list of rows for JSON
  # as.list(data.frame) gives list of COLUMNS, not rows - fix this
  data_preview <- lapply(seq_len(min(10, nrow(data))), function(i) {
    row <- as.list(data[i, ])
    # Convert any complex types to simple values
    names(row) <- names(data)
    row
  })

  result <- list(
    success = TRUE,
    session_id = session_id,
    variables = var_info,
    row_count = nrow(data),
    column_count = ncol(data),
    data_preview = data_preview
  )

  if (return_data) {
    # Convert rows to list
    result$data <- lapply(seq_len(nrow(data)), function(i) {
      row <- as.list(data[i, ])
      names(row) <- names(data)
      row
    })
  }

  # Save session data to temp file for other scripts to use
  session_file <- paste0("C:/Users/OS/AppData/Local/Temp/enviroanalyzer_session_", gsub("[^a-zA-Z0-9]", "_", session_id), ".json")
  tryCatch({
    save_data <- lapply(seq_len(nrow(data)), function(i) {
      row <- as.list(data[i, ])
      names(row) <- names(data)
      row
    })
    writeLines(toJSON(list(data = save_data, columns = names(data)), auto_unbox = TRUE), session_file)
  }, error = function(e) {
    # Silently fail - session file is optional
  })

  cat(toJSON(result, auto_unbox = TRUE, null = 'null'))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})