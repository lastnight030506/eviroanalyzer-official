# EnviroAnalyzer - Independent Samples T-Test
# Usage: Rscript ttest_independent.R <json_input>

library(jsonlite)
library(effsize)

required_packages <- c("effsize")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]
if (length(missing_packages) > 0) {
  cat(toJSON(list(success = FALSE, error = paste("Missing packages:", paste(missing_packages, collapse = ", ")))))
  quit(status = 1)
}

args <- commandArgs(trailingOnly = TRUE)
input <- fromJSON(args[1])

session_id <- input$session_id
formula <- input$formula  # e.g., "BOD5 ~ Group"

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

  f <- as.formula(formula)
  result <- t.test(f, data = data, var.equal = TRUE)
  effect <- cohen.d(f, data = data)

  cat(toJSON(list(
    success = TRUE,
    test = "independent",
    formula = formula,
    t_statistic = result$statistic,
    df = result$parameter,
    p_value = result$p.value,
    ci_lower = result$conf.int[1],
    ci_upper = result$conf.int[2],
    effect_size = effect$estimate,
    mean_difference = diff(result$estimate)
  ), auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})
