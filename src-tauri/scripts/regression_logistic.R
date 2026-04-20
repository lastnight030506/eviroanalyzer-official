# EnviroAnalyzer - Logistic Regression
# Usage: Rscript regression_logistic.R <json_input>

library(jsonlite)
library(broom)

required_packages <- c("broom")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]
if (length(missing_packages) > 0) {
  cat(toJSON(list(success = FALSE, error = paste("Missing packages:", paste(missing_packages, collapse = ", ")))))
  quit(status = 1)
}

args <- commandArgs(trailingOnly = TRUE)
input <- fromJSON(args[1])

session_id <- input$session_id
formula <- input$formula  # e.g., "Status ~ COD + pH"

env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))

tryCatch({
  data <- get(env_name, envir = .GlobalEnv)

  model <- glm(as.formula(formula), data = data, family = binomial())
  summary_model <- summary(model)

  # Coefficients with odds ratios and CIs
  conf_int <- exp(confint(model))
  coef_df <- broom::tidy(model)

  coefficients <- lapply(1:nrow(coef_df), function(i) {
    list(
      term = coef_df$term[i],
      estimate = coef_df$estimate[i],
      std_error = coef_df$std.error[i],
      z_statistic = coef_df$statistic[i],
      p_value = coef_df$p.value[i],
      odds_ratio = exp(coef_df$estimate[i]),
      ci_lower = conf_int[i, 1],
      ci_upper = conf_int[i, 2]
    )
  })

  # Pseudo R-squared (McFadden)
  null_deviance <- model$null.deviance
  deviance <- model$deviance
  pseudo_r2 <- 1 - (deviance / null_deviance)

  cat(toJSON(list(
    success = TRUE,
    formula = formula,
    n_obs = nrow(model$data),
    deviance = deviance,
    pseudo_r2 = pseudo_r2,
    coefficients = coefficients
  ), auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})
