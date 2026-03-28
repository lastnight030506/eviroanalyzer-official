# map_data.R
# Maps imported variables to QCVN parameters and transforms to SampleRow[] format

library(dplyr)
library(jsonlite)
library(stringr)

# Get input parameters from command line
args <- commandArgs(trailingOnly = TRUE)
input_json <- args[1]

# Parse input
input <- fromJSON(input_json)

session_id <- input$session_id
mappings <- input$mappings
sample_prefix <- input$sample_prefix
qcvn_params <- input$qcvn_params

# Data: can come from input$data, session file, or global env
data <- NULL

# Helper function to create data frame from list of rows using dplyr::bind_rows
create_df_from_rows <- function(row_list, col_names) {
  # Use dplyr's bind_rows which handles this elegantly
  df <- bind_rows(row_list)
  # Ensure column order matches
  df <- df[, col_names, drop = FALSE]
  df
}

# Check if data is passed directly in input
if (!is.null(input$data) && length(input$data) > 0) {
  data <- create_df_from_rows(input$data, input$columns)
}

# If no direct data, try session file
if (is.null(data)) {
  session_file <- paste0("C:/Users/OS/AppData/Local/Temp/enviroanalyzer_session_", gsub("[^a-zA-Z0-9]", "_", session_id), ".json")
  if (file.exists(session_file)) {
    session_data <- fromJSON(session_file)
    data <- create_df_from_rows(session_data$data, session_data$columns)
  }
}

# Fall back to R session global env
if (is.null(data)) {
  env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))
  data <- get(env_name, envir = .GlobalEnv)
}

# Identify sample columns (all columns except the first metadata column)
# The first column is typically "parameter" or similar metadata
all_cols <- colnames(data)
sample_cols <- all_cols[-1]

# Also filter to only columns matching sample_prefix pattern if specified
if (!is.null(sample_prefix) && sample_prefix != "") {
  sample_cols <- grep(paste0("^", sample_prefix), sample_cols, value = TRUE, ignore.case = TRUE)
  if (length(sample_cols) == 0) {
    sample_cols <- all_cols[-1]
  }
}

# Build qcvn_param lookup from qcvn_params
qcvn_lookup <- setNames(lapply(seq_len(nrow(qcvn_params)), function(i) {
  as.list(qcvn_params[i, ])
}), qcvn_params$id)

# Process mappings
mapped_rows <- list()
unmapped_variables <- character()

for (i in seq_len(nrow(mappings))) {
  mapping <- mappings[i, ]
  imported_var <- mapping$imported_var
  qcvn_param <- mapping$qcvn_param
  is_manual <- mapping$is_manual

  # Check if this imported variable exists in data columns
  if (!imported_var %in% all_cols) {
    next
  }

  # If qcvn_param is null, add to unmapped_variables
  if (is.null(qcvn_param) || is.na(qcvn_param) || qcvn_param == "") {
    unmapped_variables <- c(unmapped_variables, imported_var)
    next
  }

  # Get the QCVN parameter definition
  if (!qcvn_param %in% names(qcvn_lookup)) {
    next
  }

  param_def <- qcvn_lookup[[qcvn_param]]

  # Build the SampleRow
  sample_row <- list(
    id = qcvn_param,
    parameterId = qcvn_param,
    parameterName = param_def$name,
    unit = param_def$unit,
    limit = param_def$limit,
    type = param_def$type
  )

  # Add sample values - find the row using imported_var
  for (col in sample_cols) {
    # Find row where parameter column matches imported_var (case-insensitive)
    idx <- which(tolower(data$parameter) == tolower(imported_var))
    if (length(idx) > 0) {
      val <- data[[col]][idx[1]]  # Take first match
      sample_row[[col]] <- if (!is.na(val)) val else NA
    } else {
      sample_row[[col]] <- NA
    }
  }

  mapped_rows[[qcvn_param]] <- sample_row
}

# Calculate mapping quality
total_mappings <- nrow(mappings)
mapped_count <- length(mapped_rows)
auto_mapped <- sum(!mappings$is_manual & !is.null(mappings$qcvn_param) & !is.na(mappings$qcvn_param) & mappings$qcvn_param != "")
manually_mapped <- sum(mappings$is_manual & !is.null(mappings$qcvn_param) & !is.na(mappings$qcvn_param) & mappings$qcvn_param != "")
unmapped_count <- length(unmapped_variables)

mapping_quality <- list(
  total = total_mappings,
  mapped = mapped_count,
  auto_mapped = auto_mapped,
  manually_mapped = manually_mapped,
  unmapped = unmapped_count
)

# Build output
output <- list(
  success = TRUE,
  sample_rows = mapped_rows,
  unmapped_variables = unmapped_variables,
  mapping_quality = mapping_quality
)

# Print JSON to stdout
output_json <- toJSON(output, auto_unbox = TRUE, na = 'null', pretty = FALSE)
cat(output_json)
