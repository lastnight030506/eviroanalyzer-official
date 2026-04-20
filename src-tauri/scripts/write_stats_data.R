# EnviroAnalyzer - Write Direct Statistics Data to Session
# Usage: Rscript write_stats_data.R <json_input>

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

  # Create lookup by variable name - handle JSON parsing which may return data.frame
  var_list <- if (is.list(variables) && !is.data.frame(variables)) {
    variables
  } else if (is.data.frame(variables)) {
    # Convert data.frame rows back to list of lists
    lapply(seq_len(nrow(variables)), function(i) as.list(variables[i, ]))
  } else {
    list()
  }
  var_lookup <- setNames(var_list, sapply(var_list, function(v) if (is.list(v)) v$name else v[["name"]]))

  # Convert numeric columns
  for (col in col_names) {
    var_info <- var_lookup[[col]]
    if (is.list(var_info)) {
      var_type <- var_info$type
    } else if (is.character(var_info)) {
      var_type <- var_info
    } else {
      var_type <- "character"
    }
    if (var_type == "numeric") {
      data[[col]] <- as.numeric(data[[col]])
    } else if (var_type == "factor") {
      data[[col]] <- as.factor(data[[col]])
    }
  }
} else {
  # Empty data frame with correct column types
  # Ensure variables is a list
  var_list <- if (is.list(variables) && !is.data.frame(variables)) {
    variables
  } else if (is.data.frame(variables)) {
    lapply(seq_len(nrow(variables)), function(i) as.list(variables[i, ]))
  } else {
    list()
  }
  data <- data.frame(
    sapply(var_list, function(v) {
      v_type <- if (is.list(v)) v$type else if (is.character(v)) v else "character"
      if (v_type == "numeric") numeric(0)
      else if (v_type == "factor") factor(character(0))
      else character(0)
    }, simplify = FALSE),
    stringsAsFactors = FALSE,
    check.names = FALSE
  )
  colnames(data) <- sapply(var_list, function(v) if (is.list(v)) v$name else v[["name"]])
}

# Store in R global environment
env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))
assign(env_name, data, envir = .GlobalEnv)

# Also build variable info like read_data.R does
# Ensure variables is a list of lists
var_list <- if (is.list(variables) && !is.data.frame(variables)) {
  variables
} else if (is.data.frame(variables)) {
  lapply(seq_len(nrow(variables)), function(i) as.list(variables[i, ]))
} else {
  list()
}
var_info <- lapply(var_list, function(var) {
  list(
    name = if (is.list(var)) var$name else var[["name"]],
    label = if (is.list(var) && !is.null(var$label)) var$label else "",
    type = if (is.list(var)) var$type else var[["type"]],
    levels = if (is.list(var) && !is.null(var$levels)) var$levels else NULL,
    missing_count = if (is.list(var) && !is.null(var$missing_count)) var$missing_count else 0
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
