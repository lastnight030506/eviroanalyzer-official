# EnviroAnalyzer - ARIMA Time Series Forecasting
# Usage: Rscript forecast_arima.R <json_input>
# Input JSON: {"values": [1,2,3,...], "periods": 5, "parameter": "BOD5"}
# Output JSON: {"forecast": [...], "lower": [...], "upper": [...], "fitted": [...]}

args <- commandArgs(trailingOnly = TRUE)

# Check required packages
required_packages <- c("jsonlite", "forecast")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]

if (length(missing_packages) > 0) {
  result <- list(
    success = FALSE,
    error = paste("Missing R packages:", paste(missing_packages, collapse = ", "), 
                  ". Install with: install.packages(c('jsonlite', 'forecast'))")
  )
  cat(sprintf('{"success":false,"error":"Missing packages: %s"}', paste(missing_packages, collapse = ", ")))
  quit(status = 1)
}

library(jsonlite)
library(forecast)

tryCatch({
  # Parse input JSON
  if (length(args) == 0) {
    stop("No input provided. Usage: Rscript forecast_arima.R '<json_input>'")
  }
  
  input <- fromJSON(args[1])
  
  values <- as.numeric(input$values)
  periods <- as.integer(input$periods %||% 5)
  parameter_name <- input$parameter %||% "Parameter"
  confidence_level <- as.numeric(input$confidence %||% 0.95)
  
  # Validate input
  if (length(values) < 3) {
    stop("Need at least 3 data points for forecasting")
  }
  
  # Create time series
  ts_data <- ts(values)
  
  # Fit ARIMA model (auto.arima selects best parameters)
  fit <- auto.arima(ts_data, 
                    seasonal = FALSE,
                    stepwise = TRUE,
                    approximation = FALSE,
                    trace = FALSE)
  
  # Generate forecast
  fc <- forecast(fit, h = periods, level = confidence_level * 100)
  
  # Prepare output
  result <- list(
    success = TRUE,
    parameter = parameter_name,
    model = paste0("ARIMA(", paste(arimaorder(fit), collapse = ","), ")"),
    aic = round(AIC(fit), 2),
    bic = round(BIC(fit), 2),
    historical = values,
    fitted = as.numeric(fitted(fit)),
    residuals = as.numeric(residuals(fit)),
    forecast = list(
      periods = periods,
      mean = round(as.numeric(fc$mean), 4),
      lower = round(as.numeric(fc$lower), 4),
      upper = round(as.numeric(fc$upper), 4)
    ),
    accuracy = list(
      mae = round(mean(abs(residuals(fit))), 4),
      rmse = round(sqrt(mean(residuals(fit)^2)), 4),
      mape = round(mean(abs(residuals(fit) / values)) * 100, 2)
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
