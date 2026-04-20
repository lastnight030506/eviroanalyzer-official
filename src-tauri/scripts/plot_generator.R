# EnviroAnalyzer - Plot Generator (ggplot2 -> plotly HTML)
# Usage: Rscript plot_generator.R <json_input>

library(jsonlite)
library(ggplot2)
library(plotly)

required_packages <- c("ggplot2", "plotly")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]
if (length(missing_packages) > 0) {
  cat(toJSON(list(success = FALSE, error = paste("Missing packages:", paste(missing_packages, collapse = ", ")))))
  quit(status = 1)
}

args <- commandArgs(trailingOnly = TRUE)
input <- fromJSON(args[1])

session_id <- input$session_id
plot_type <- input$plot_type  # "histogram", "boxplot", "scatter", "bar"
x_var <- input$x_var
y_var <- input$y_var
group_by <- input$group_by

env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))

tryCatch({
  data <- get(env_name, envir = .GlobalEnv)

  p <- switch(plot_type,
    histogram = {
      if (!is.null(group_by)) {
        ggplot(data, aes_string(x = x_var, fill = group_by)) + geom_histogram(alpha = 0.6, position = "dodge", bins = 30)
      } else {
        ggplot(data, aes_string(x = x_var)) + geom_histogram(fill = "#10b981", bins = 30, alpha = 0.7)
      }
    },
    boxplot = {
      if (!is.null(group_by)) {
        ggplot(data, aes_string(x = group_by, y = y_var, fill = group_by)) + geom_boxplot(alpha = 0.7) + theme(legend.position = "none")
      } else {
        ggplot(data, aes_string(x = "All", y = y_var)) + geom_boxplot(fill = "#10b981", alpha = 0.7)
      }
    },
    scatter = {
      if (!is.null(group_by)) {
        ggplot(data, aes_string(x = x_var, y = y_var, color = group_by)) + geom_point(alpha = 0.6) + geom_smooth(method = "lm", se = FALSE)
      } else {
        ggplot(data, aes_string(x = x_var, y = y_var)) + geom_point(color = "#10b981", alpha = 0.6) + geom_smooth(method = "lm", se = FALSE)
      }
    },
    bar = {
      if (!is.null(group_by)) {
        ggplot(data, aes_string(x = x_var, fill = group_by)) + geom_bar(alpha = 0.7, position = "dodge")
      } else {
        ggplot(data, aes_string(x = x_var)) + geom_bar(fill = "#10b981", alpha = 0.7)
      }
    }
  )

  # Convert to plotly HTML
  html_content <- ggplotly(p) %>% htmltools::html_print()

  cat(toJSON(list(
    success = TRUE,
    plot_type = plot_type,
    html_content = html_content,
    dimensions = list(width = 800, height = 500)
  ), auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})
