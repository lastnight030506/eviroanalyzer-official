# map_data.R
# Maps imported variables to QCVN parameters and transforms to SampleRow[] format

library(dplyr)
library(jsonlite)
library(stringr)

# Get input parameters from command line
args <- commandArgs(trailingOnly = TRUE)
input_json <- args[1]

# Parse input - use simplifyDataFrame=FALSE to keep arrays as lists
input <- fromJSON(input_json, simplifyDataFrame = FALSE)

session_id <- input$session_id
mappings <- input$mappings
sample_prefix <- input$sample_prefix
qcvn_params <- input$qcvn_params

# Data: can come from input$data, session file, or global env
data <- NULL

# Helper function to create data frame from list of rows
create_df_from_rows <- function(row_list, col_names) {
  df <- NULL
  for (r in row_list) {
    vals <- unlist(r, use.names = TRUE)
    vals <- vals[col_names]
    row_df <- as.data.frame(t(vals), stringsAsFactors = FALSE, check.names = FALSE)
    if (is.null(df)) {
      df <- row_df
    } else {
      df <- rbind(df, row_df)
    }
  }
  rownames(df) <- NULL
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
    session_data <- fromJSON(session_file, simplifyDataFrame = FALSE)
    data <- create_df_from_rows(session_data$data, session_data$columns)
  }
}

# Fall back to R session global env
if (is.null(data)) {
  env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))
  data <- get(env_name, envir = .GlobalEnv)
}

# Convert factor columns to character
for (col in colnames(data)) {
  if (is.factor(data[[col]])) {
    data[[col]] <- as.character(data[[col]])
  }
}

# Identify sample columns
all_cols <- colnames(data)
sample_cols <- all_cols[-1]

if (!is.null(sample_prefix) && sample_prefix != "") {
  sample_cols <- grep(paste0("^", sample_prefix), sample_cols, value = TRUE, ignore.case = TRUE)
  if (length(sample_cols) == 0) {
    sample_cols <- all_cols[-1]
  }
}

# Build qcvn_param lookup
qcvn_lookup <- setNames(lapply(qcvn_params, function(p) as.list(p)), sapply(qcvn_params, function(p) p$id))

# Process mappings
mapped_rows <- list()
unmapped_variables <- character()

for (i in seq_along(mappings)) {
  mapping <- mappings[[i]]
  imported_var <- mapping$imported_var
  qcvn_param <- mapping$qcvn_param
  is_manual <- mapping$is_manual

  # If qcvn_param is null/empty, add to unmapped
  if (is.null(qcvn_param) || is.na(qcvn_param) || qcvn_param == "") {
    unmapped_variables <- c(unmapped_variables, imported_var)
    next
  }

  # Get the QCVN parameter definition
  if (!qcvn_param %in% names(qcvn_lookup)) {
    unmapped_variables <- c(unmapped_variables, imported_var)
    next
  }

  param_def <- qcvn_lookup[[qcvn_param]]

  # Build the SampleRow
  sample_row <- list(
    id = qcvn_param,
    parameterId = qcvn_param,
    parameterName = param_def$name,
    unit = param_def$unit,
    limit = as.numeric(param_def$limit),
    type = param_def$type
  )

  # Add sample values - find the row where parameter matches imported_var
  param_vals <- tolower(as.character(data$parameter))
  search_term <- tolower(imported_var)
  idx <- which(param_vals == search_term)

  if (length(idx) == 0) {
    # Try partial match
    idx <- which(grepl(search_term, param_vals, fixed = TRUE))
  }

  if (length(idx) > 0) {
    for (col in sample_cols) {
      val <- data[[col]][idx[1]]
      sample_row[[col]] <- if (!is.na(val) && val != "") as.numeric(val) else NA
    }
    mapped_rows[[qcvn_param]] <- sample_row
  } else {
    unmapped_variables <- c(unmapped_variables, imported_var)
  }
}

# Calculate mapping quality
total_mappings <- length(mappings)
mapped_count <- length(mapped_rows)
auto_mapped <- sum(sapply(mappings, function(m) !isTRUE(m$is_manual) && !is.null(m$qcvn_param) && m$qcvn_param != ""))
manually_mapped <- sum(sapply(mappings, function(m) isTRUE(m$is_manual) && !is.null(m$qcvn_param) && m$qcvn_param != ""))
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
