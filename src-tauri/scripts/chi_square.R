# EnviroAnalyzer - Chi-Square Test
# Usage: Rscript chi_square.R <json_input>

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
var1 <- input$var1
var2 <- input$var2

env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))

tryCatch({
  data <- get(env_name, envir = .GlobalEnv)

  tbl <- table(data[[var1]], data[[var2]], useNA = "ifany")
  result <- chisq.test(tbl)

  # Cramers V
  n <- sum(tbl)
  min_dim <- min(nrow(tbl), ncol(tbl)) - 1
  cramers_v <- sqrt(result$statistic / (n * min_dim))

  cat(toJSON(list(
    success = TRUE,
    statistic = result$statistic,
    df = result$parameter,
    p_value = result$p.value,
    cramers_v = cramers_v,
    observed = lapply(1:nrow(tbl), function(i) as.integer(tbl[i, ])),
    expected = lapply(1:nrow(result$expected), function(i) as.numeric(result$expected[i, ]))
  ), auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})
