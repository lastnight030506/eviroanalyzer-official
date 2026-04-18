# EnviroAnalyzer - Write Direct Statistics Data to Session
# Usage: Rscript write_stats_data.R <json_input>

required_packages <- c("jsonlite")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]
if (length(missing_packages) > 0) {
  cat(toJSON(list(success = FALSE, error = paste("Missing packages:", paste(missing_packages, collapse = ", ")))))
  quit(status = 1)
}

library(jsonlite)

args <- commandArgs(trailingOnly = TRUE)
input <- fromJSON(args[1])

session_id <- input$session_id
variables <- input$variables  # array of {name, label, type, levels, missing_count}
data_rows <- input$data       # array of RawDataRow objects

# Build R data frame from data_rows
if (length(data_rows) > 0) {
  # All rows have same columns
  col_names <- names(data_rows[[1]])
  data <- do.call(rbind, lapply(data_rows, function(row) {
    as.data.frame(row, stringsAsFactors = FALSE)
  }))
  rownames(data) <- NULL

  # Create lookup by variable name
  var_lookup <- setNames(lapply(variables, function(v) v), sapply(variables, function(v) v$name))

  # Convert numeric columns
  for (col in col_names) {
    if (var_lookup[[col]]$type == "numeric") {
      data[[col]] <- as.numeric(data[[col]])
    } else if (var_lookup[[col]]$type == "factor") {
      data[[col]] <- as.factor(data[[col]])
    }
  }
} else {
  # Empty data frame with correct column types
  data <- data.frame(
    sapply(variables, function(v) {
      if (v$type == "numeric") numeric(0)
      else if (v$type == "factor") factor(character(0))
      else character(0)
    }, simplify = FALSE),
    stringsAsFactors = FALSE,
    check.names = FALSE
  )
  colnames(data) <- sapply(variables, function(v) v$name)
}

# Store in R global environment
env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))
assign(env_name, data, envir = .GlobalEnv)

# Also build variable info like read_data.R does
var_info <- lapply(variables, function(var) {
  list(
    name = var$name,
    label = if (!is.null(var$label)) var$label else "",
    type = var$type,
    levels = if (!is.null(var$levels)) var$levels else NULL,
    missing_count = if (!is.null(var$missing_count)) var$missing_count else 0
  )
})

# Save session data to temp JSON file (same format as read_data.R)
session_file <- paste0("C:/Users/OS/AppData/Local/Temp/enviroanalyzer_session_", gsub("[^a-zA-Z0-9]", "_", session_id), ".json")
save_data <- lapply(seq_len(nrow(data)), function(i) {
  row <- as.list(data[i, ])
  names(row) <- names(data)
  row
})
writeLines(toJSON(list(data = save_data, columns = names(data)), auto_unbox = TRUE), session_file)

result <- list(
  success = TRUE,
  session_id = session_id,
  variables = var_info,
  row_count = nrow(data),
  column_count = ncol(data)
)

cat(toJSON(result, auto_unbox = TRUE, null = 'null'))
