# EnviroAnalyzer - Correlation Analysis
# Usage: Rscript correlation.R <json_input>

required_packages <- c("jsonlite", "psych")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]
if (length(missing_packages) > 0) {
  cat(toJSON(list(success = FALSE, error = paste("Missing packages:", paste(missing_packages, collapse = ", ")))))
  quit(status = 1)
}

library(jsonlite)
library(psych)

args <- commandArgs(trailingOnly = TRUE)
input <- fromJSON(args[1])

session_id <- input$session_id
variables <- input$variables
method <- input$method  # "pearson" or "spearman"

env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))

tryCatch({
  data <- get(env_name, envir = .GlobalEnv)
  subdata <- data[variables]

  if (method == "pearson") {
    cors <- psych::corr.test(subdata, use = "pairwise", method = "pearson")
  } else {
    cors <- psych::corr.test(subdata, use = "pairwise", method = "spearman")
  }

  n_vars <- length(variables)
  matrix_entries <- list()
  idx <- 1
  for (i in 1:(n_vars-1)) {
    for (j in (i+1):n_vars) {
      matrix_entries[[idx]] <- list(
        var1 = variables[i],
        var2 = variables[j],
        correlation = cors$r[i, j],
        p_value = cors$p[i, j]
      )
      idx <- idx + 1
    }
  }

  cat(toJSON(list(
    success = TRUE,
    method = method,
    matrix = matrix_entries,
    n_obs = cors$n
  ), auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})
