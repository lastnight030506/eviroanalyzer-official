# EnviroAnalyzer - Syntax Builder (helper for generating R code)
# Usage: Rscript syntax_builder.R <json_input>

library(jsonlite)

args <- commandArgs(trailingOnly = TRUE)
input <- fromJSON(args[1])

operation <- input$operation
params <- input$params

tryCatch({
  r_code <- switch(operation,
    "load_data" = sprintf("%s <- read_%s(\"%s\")",
      params$data_name %||% "data",
      params$file_type,
      params$file_path)),

    "descriptives" = sprintf("psych::describe(data[c(\"%s\")])",
      paste(params$variables, collapse = "\", \""))),

    "ttest" = sprintf("t.test(%s, data = data, var.equal = TRUE)",
      params$formula)),

    "anova" = sprintf("summary(aov(%s, data = data))",
      params$formula)),

    "correlation" = sprintf("psych::corr.test(data[c(\"%s\")], method = \"%s\")",
      paste(params$variables, collapse = "\", \""),
      params$method)),

    "linear_regression" = sprintf("summary(lm(%s, data = data))",
      params$formula)),

    "logistic_regression" = sprintf("summary(glm(%s, data = data, family = binomial()))",
      params$formula)),

    "histogram" = sprintf("ggplot(data, aes(x = %s)) + geom_histogram(bins = 30)",
      params$var)),

    "boxplot" = sprintf("ggplot(data, aes(y = %s)) + geom_boxplot()",
      params$var)),

    "scatter" = sprintf("ggplot(data, aes(x = %s, y = %s)) + geom_point() + geom_smooth(method = 'lm')",
      params$x_var, params$y_var)),

    "barplot" = sprintf("ggplot(data, aes(x = %s)) + geom_bar()",
      params$var)),

    operation
  )

  cat(toJSON(list(
    success = TRUE,
    operation = operation,
    r_code = r_code
  ), auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})
