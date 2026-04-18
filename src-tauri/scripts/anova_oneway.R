# EnviroAnalyzer - One-Way ANOVA with Post-Hoc
# Usage: Rscript anova_oneway.R <json_input>

required_packages <- c("jsonlite", "car", "multcomp")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]
if (length(missing_packages) > 0) {
  cat(toJSON(list(success = FALSE, error = paste("Missing packages:", paste(missing_packages, collapse = ", ")))))
  quit(status = 1)
}

library(jsonlite)
library(car)
library(multcomp)

args <- commandArgs(trailingOnly = TRUE)
input <- fromJSON(args[1])

session_id <- input$session_id
formula <- input$formula  # e.g., "BOD5 ~ Group"
posthoc <- input$posthoc  # "tukey", "games-howell", or "none"

env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))

tryCatch({
  data <- get(env_name, envir = .GlobalEnv)

  f <- as.formula(formula)
  model <- aov(f, data = data)
  summary_df <- summary(model)[[1]]

  # Group means
  group_means <- aggregate(f[[2]] ~ f[[3]], data = data, FUN = function(x) c(mean = mean(x), sd = sd(x), n = length(x)))
  colnames(group_means) <- c("group", "stats")
  group_info <- lapply(1:nrow(group_means), function(i) {
    list(
      group = as.character(group_means$group[i]),
      mean = group_means$stats[i, "mean"],
      sd = group_means$stats[i, "sd"],
      n = group_means$stats[i, "n"]
    )
  })

  ss_between <- summary_df$"Sum Sq"[1]
  ss_total <- ss_between + summary_df$"Sum Sq"[2]
  effect_size <- ss_between / ss_total
  result <- list(
    success = TRUE,
    between_df = as.integer(summary_df$Df[1]),
    within_df = as.integer(summary_df$Df[2]),
    F_statistic = as.numeric(summary_df$"F value"[1]),
    p_value = as.numeric(summary_df$"Pr(>F)"[1]),
    effect_size = effect_size,
    group_means = group_info
  )

  # Post-hoc tests
  if (posthoc == "tukey") {
    tukey <- TukeyHSD(model)
    posthoc_results <- lapply(rownames(tukey[[1]]), function(comp) {
      list(
        comparison = comp,
        estimate = tukey[[1]][comp, "diff"],
        p_value = tukey[[1]][comp, "p adj"],
        ci_lower = tukey[[1]][comp, "lwr"],
        ci_upper = tukey[[1]][comp, "upr"]
      )
    })
    result$posthoc <- posthoc_results
  }

  cat(toJSON(result, auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})
