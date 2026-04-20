# EnviroAnalyzer - Linear Regression
# Usage: Rscript regression_linear.R <json_input>

library(jsonlite)
library(broom)
library(car)

required_packages <- c("broom", "car")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]
if (length(missing_packages) > 0) {
  cat(toJSON(list(success = FALSE, error = paste("Missing packages:", paste(missing_packages, collapse = ", ")))))
  quit(status = 1)
}

args <- commandArgs(trailingOnly = TRUE)
input <- fromJSON(args[1])

session_id <- input$session_id
formula <- input$formula  # e.g., "BOD5 ~ COD + pH + DO"

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

  model <- lm(as.formula(formula), data = data)
  summary_model <- summary(model)

  # Coefficients with confidence intervals
  conf_int <- confint(model)
  coef_df <- broom::tidy(model)

  coefficients <- lapply(1:nrow(coef_df), function(i) {
    list(
      term = coef_df$term[i],
      estimate = coef_df$estimate[i],
      std_error = coef_df$std.error[i],
      t_statistic = coef_df$statistic[i],
      p_value = coef_df$p.value[i],
      ci_lower = conf_int[i, 1],
      ci_upper = conf_int[i, 2]
    )
  })

  # VIF values
  vif_values <- car::vif(model)
  vif_list <- lapply(names(vif_values), function(term) {
    list(term = term, vif = vif_values[term])
  })

  cat(toJSON(list(
    success = TRUE,
    formula = formula,
    n_obs = nrow(model$model),
    r_squared = summary_model$r.squared,
    adj_r_squared = summary_model$adj.r.squared,
    f_statistic = summary_model$fstatistic[1],
    f_p_value = pf(summary_model$fstatistic[1], summary_model$fstatistic[2], summary_model$fstatistic[3], lower.tail = FALSE),
    coefficients = coefficients,
    vif = vif_list
  ), auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})
