# EnviroAnalyzer - Descriptive Statistics
# Usage: Rscript desc_stats.R <json_input>

required_packages <- c("jsonlite", "psych", "moments")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]
if (length(missing_packages) > 0) {
  cat(toJSON(list(success = FALSE, error = paste("Missing packages:", paste(missing_packages, collapse = ", ")))))
  quit(status = 1)
}

library(jsonlite)
library(psych)
library(moments)

args <- commandArgs(trailingOnly = TRUE)
input <- fromJSON(args[1])

session_id <- input$session_id
variables <- input$variables

env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))

tryCatch({
  data <- get(env_name, envir = .GlobalEnv)

  results <- lapply(variables, function(var_name) {
    col <- data[[var_name]]
    if (!is.numeric(col)) {
      return(list(variable = var_name, error = "Not numeric"))
    }

    col <- col[!is.na(col)]
    n <- length(col)

    list(
      variable = var_name,
      n = n,
      mean = mean(col),
      median = median(col),
      sd = sd(col),
      skewness = skewness(col),
      kurtosis = kurtosis(col),
      min = min(col),
      max = max(col),
      p25 = quantile(col, 0.25),
      p75 = quantile(col, 0.75),
      se = sd(col) / sqrt(n)
    )
  })

  cat(toJSON(list(success = TRUE, results = results), auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})