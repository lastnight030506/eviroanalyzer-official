# EnviroAnalyzer - Prophet Time Series Forecasting
# Usage: Rscript forecast_prophet.R <json_input>
# Input JSON: {"values": [1,2,3,...], "dates": ["2024-01-01",...], "periods": 5}
# Output JSON: {"forecast": [...], "trend": [...], "lower": [...], "upper": [...]}

args <- commandArgs(trailingOnly = TRUE)

# Check required packages
required_packages <- c("jsonlite", "prophet")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]

if (length(missing_packages) > 0) {
  cat(sprintf('{"success":false,"error":"Missing packages: %s. Install with: install.packages(c(\'jsonlite\', \'prophet\'))"}', 
              paste(missing_packages, collapse = ", ")))
  quit(status = 1)
}

library(jsonlite)
suppressMessages(library(prophet))

tryCatch({
  if (length(args) == 0) {
    stop("No input provided")
  }
  
  input <- fromJSON(args[1])
  
  values <- as.numeric(input$values)
  periods <- as.integer(input$periods %||% 5)
  parameter_name <- input$parameter %||% "Parameter"
  
  # Generate dates if not provided
  if (!is.null(input$dates) && length(input$dates) == length(values)) {
    dates <- as.Date(input$dates)
  } else {
    # Assume monthly data if no dates provided
    dates <- seq(Sys.Date() - length(values) + 1, by = "month", length.out = length(values))
  }
  
  # Validate
  if (length(values) < 3) {
    stop("Need at least 3 data points for forecasting")
  }
  
  # Prepare Prophet dataframe
  df <- data.frame(ds = dates, y = values)
  
  # Fit Prophet model (suppress verbose output)
  suppressMessages({
    model <- prophet(df, 
                     yearly.seasonality = FALSE,
                     weekly.seasonality = FALSE,
                     daily.seasonality = FALSE)
  })
  
  # Create future dataframe
  future <- make_future_dataframe(model, periods = periods, freq = "month")
  
  # Predict
  forecast_df <- predict(model, future)
  
  # Extract forecast data
  n_historical <- length(values)
  forecast_indices <- (n_historical + 1):(n_historical + periods)
  
  result <- list(
    success = TRUE,
    parameter = parameter_name,
    model = "Prophet",
    historical = values,
    fitted = round(forecast_df$yhat[1:n_historical], 4),
    forecast = list(
      periods = periods,
      dates = as.character(forecast_df$ds[forecast_indices]),
      mean = round(forecast_df$yhat[forecast_indices], 4),
      lower = round(forecast_df$yhat_lower[forecast_indices], 4),
      upper = round(forecast_df$yhat_upper[forecast_indices], 4),
      trend = round(forecast_df$trend[forecast_indices], 4)
    )
  )
  
  cat(toJSON(result, auto_unbox = TRUE))
  
}, error = function(e) {
  error_result <- list(
    success = FALSE,
    error = as.character(e$message)
  )
  cat(toJSON(error_result, auto_unbox = TRUE))
  quit(status = 1)
})
