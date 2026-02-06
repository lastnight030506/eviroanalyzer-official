# EnviroAnalyzer - Kriging Spatial Interpolation
# Usage: Rscript kriging.R <json_input>
# Input JSON: {"points": [{"lat": 10.0, "lng": 106.0, "value": 25.5}, ...], "grid_size": 50}
# Output JSON: {"grid": [...], "variogram": {...}, "bounds": {...}}

args <- commandArgs(trailingOnly = TRUE)

# Check required packages
required_packages <- c("jsonlite", "gstat", "sp")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]

if (length(missing_packages) > 0) {
  cat(sprintf('{"success":false,"error":"Missing packages: %s. Install with: install.packages(c(\'jsonlite\', \'gstat\', \'sp\'))"}', 
              paste(missing_packages, collapse = ", ")))
  quit(status = 1)
}

library(jsonlite)
library(gstat)
library(sp)

tryCatch({
  if (length(args) == 0) {
    stop("No input provided")
  }
  
  input <- fromJSON(args[1])
  
  points <- input$points
  grid_size <- as.integer(input$grid_size %||% 50)
  parameter_name <- input$parameter %||% "Value"
  
  # Validate
  if (length(points) < 4) {
    stop("Need at least 4 sample points for Kriging interpolation")
  }
  
  # Extract coordinates and values
  coords <- data.frame(
    x = sapply(points, function(p) p$lng),
    y = sapply(points, function(p) p$lat),
    value = sapply(points, function(p) p$value)
  )
  
  # Create spatial points dataframe
  coordinates(coords) <- ~ x + y
  
  # Calculate bounding box with 10% padding
  bbox <- coords@bbox
  x_range <- bbox[1, 2] - bbox[1, 1]
  y_range <- bbox[2, 2] - bbox[2, 1]
  padding <- 0.1
  
  x_min <- bbox[1, 1] - x_range * padding
  x_max <- bbox[1, 2] + x_range * padding
  y_min <- bbox[2, 1] - y_range * padding
  y_max <- bbox[2, 2] + y_range * padding
  
  # Create prediction grid
  grid <- expand.grid(
    x = seq(x_min, x_max, length.out = grid_size),
    y = seq(y_min, y_max, length.out = grid_size)
  )
  gridded(grid) <- ~ x + y
  
  # Fit variogram model
  v <- variogram(value ~ 1, coords)
  v_fit <- fit.variogram(v, vgm(c("Sph", "Exp", "Gau")))
  
  # Perform Ordinary Kriging
  kriging_result <- krige(value ~ 1, coords, grid, v_fit, debug.level = 0)
  
  # Convert to output format
  output_grid <- data.frame(
    lng = coordinates(kriging_result)[, 1],
    lat = coordinates(kriging_result)[, 2],
    value = round(kriging_result$var1.pred, 4),
    variance = round(kriging_result$var1.var, 4)
  )
  
  # Calculate statistics
  stats <- list(
    min = round(min(output_grid$value), 4),
    max = round(max(output_grid$value), 4),
    mean = round(mean(output_grid$value), 4),
    sd = round(sd(output_grid$value), 4)
  )
  
  result <- list(
    success = TRUE,
    parameter = parameter_name,
    grid_size = grid_size,
    bounds = list(
      lng_min = round(x_min, 6),
      lng_max = round(x_max, 6),
      lat_min = round(y_min, 6),
      lat_max = round(y_max, 6)
    ),
    variogram = list(
      model = as.character(v_fit$model[2]),
      nugget = round(v_fit$psill[1], 4),
      sill = round(sum(v_fit$psill), 4),
      range = round(v_fit$range[2], 4)
    ),
    statistics = stats,
    sample_points = length(points),
    grid_points = nrow(output_grid),
    grid = output_grid
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
