# EnviroAnalyzer - Paired Samples T-Test
# Usage: Rscript ttest_paired.R <json_input>

required_packages <- c("jsonlite", "effsize")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]
if (length(missing_packages) > 0) {
  cat(toJSON(list(success = FALSE, error = paste("Missing packages:", paste(missing_packages, collapse = ", ")))))
  quit(status = 1)
}

library(jsonlite)
library(effsize)

args <- commandArgs(trailingOnly = TRUE)
input <- fromJSON(args[1])

session_id <- input$session_id
var1 <- input$var1
var2 <- input$var2

env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))

tryCatch({
  data <- get(env_name, envir = .GlobalEnv)

  result <- t.test(data[[var1]], data[[var2]], paired = TRUE)
  effect <- cohen.d(data[[var1]], data[[var2]], paired = TRUE)

  cat(toJSON(list(
    success = TRUE,
    test = "paired",
    formula = paste(var1, "~", var2),
    t_statistic = result$statistic,
    df = result$parameter,
    p_value = result$p.value,
    ci_lower = result$conf.int[1],
    ci_upper = result$conf.int[2],
    effect_size = effect$estimate,
    mean_difference = result$estimate["difference of means"]
  ), auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})
