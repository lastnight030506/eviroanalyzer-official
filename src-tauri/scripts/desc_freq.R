# EnviroAnalyzer - Frequency Tables
# Usage: Rscript desc_freq.R <json_input>

library(jsonlite)

args <- commandArgs(trailingOnly = TRUE)
input <- fromJSON(args[1])

session_id <- input$session_id
variables <- input$variables

env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))
session_file <- paste0("C:/Users/OS/AppData/Local/Temp/enviroanalyzer_session_", gsub("[^a-zA-Z0-9]", "_", session_id), ".json")

tryCatch({
  # First try to get from global environment
  if (exists(env_name, envir = .GlobalEnv)) {
    data <- get(env_name, envir = .GlobalEnv)
  } else if (file.exists(session_file)) {
    # Load from saved session file
    session_data <- fromJSON(session_file)
    data <- do.call(rbind, lapply(session_data$data, function(row) {
      as.data.frame(row, stringsAsFactors = FALSE)
    }))
    rownames(data) <- NULL
  } else {
    stop("Data not found in R session. Please load data first.")
  }

  results <- lapply(variables, function(var_name) {
    col <- data[[var_name]]
    valid <- col[!is.na(col)]

    if (is.numeric(valid) && length(unique(valid)) > 10) {
      return(list(variable = var_name, error = "Too many unique values for frequency table"))
    }

    freq_table <- table(valid, useNA = "ifany")
    total <- sum(freq_table)
    total_valid <- sum(freq_table[!is.na(names(freq_table))])
    total_missing <- freq_table[which(is.na(names(freq_table)))]
    if (length(total_missing) == 0) total_missing <- 0

    counts <- lapply(names(freq_table), function(level) {
      n <- as.integer(freq_table[level])
      pct <- (n / total) * 100
      valid_pct <- ifelse(is.na(level), 0, (n / total_valid) * 100)
      list(
        level = ifelse(is.na(level), "Missing", level),
        n = n,
        percent = round(pct, 2),
        valid_percent = round(valid_pct, 2)
      )
    })

    list(
      variable = var_name,
      counts = counts,
      total_valid = as.integer(total_valid),
      total_missing = as.integer(total_missing)
    )
  })

  cat(toJSON(list(success = TRUE, results = results), auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})
