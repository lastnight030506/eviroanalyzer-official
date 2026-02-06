# EnviroAnalyzer - R Sidecar Health Check
# Usage: Rscript health_check.R
# Returns JSON response to stdout

# Check if jsonlite is available
if (!requireNamespace("jsonlite", quietly = TRUE)) {
  # Fallback: manual JSON construction
  cat(sprintf(
    '{"status":"ok","r_version":"%s.%s","timestamp":"%s","message":"R Sidecar operational (jsonlite not installed)"}',
    R.version$major,
    R.version$minor,
    format(Sys.time(), "%Y-%m-%dT%H:%M:%S")
  ))
} else {
  library(jsonlite)
  
  result <- list(
    status = "ok",
    r_version = paste(R.version$major, R.version$minor, sep = "."),
    timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%S"),
    message = "R Sidecar is operational",
    packages = list(
      jsonlite = as.character(packageVersion("jsonlite"))
    )
  )
  
  # Output JSON to stdout
  cat(toJSON(result, auto_unbox = TRUE))
}
