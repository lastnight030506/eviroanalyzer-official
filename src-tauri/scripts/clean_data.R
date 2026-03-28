# EnviroAnalyzer - Data Cleaning Script
# Usage: Rscript clean_data.R <json_input>

required_packages <- c("dplyr", "tidyr", "janitor", "jsonlite", "stringr")
missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]
if (length(missing_packages) > 0) {
  cat(toJSON(list(success = FALSE, error = paste("Missing packages:", paste(missing_packages, collapse = ", ")))))
  quit(status = 1)
}

library(dplyr)
library(tidyr)
library(janitor)
library(jsonlite)
library(stringr)

args <- commandArgs(trailingOnly = TRUE)
input <- fromJSON(args[1])

session_id <- input$session_id
operations <- input$operations

# Session file path
session_file <- paste0("C:/Users/OS/AppData/Local/Temp/enviroanalyzer_session_", gsub("[^a-zA-Z0-9]", "_", session_id), ".json")

# Retrieve stored session data (from file or global env)
if (file.exists(session_file)) {
  session_data <- fromJSON(session_file)
  # Convert list of rows to data frame properly
  row_list <- lapply(session_data$data, function(row) {
    as.data.frame(row, stringsAsFactors = FALSE)
  })
  data <- do.call(rbind, row_list)
  colnames(data) <- session_data$columns
} else {
  env_name <- paste0("stats_session_", gsub("[^a-zA-Z0-9]", "_", session_id))
  data <- get(env_name, envir = .GlobalEnv)
}

# Track statistics
initial_row_count <- nrow(data)
removed_count <- 0
imputed_values <- list()
messages <- c()

tryCatch({

  for (op in operations) {
    switch(op$op,

      "remove_empty" = {
        if (op$type == "rows") {
          before <- nrow(data)
          data <- data %>% remove_empty(which = "rows")
          removed_count <- removed_count + (before - nrow(data))
          if (before > nrow(data)) {
            messages <- c(messages, paste0("Removed ", before - nrow(data), " empty rows"))
          }
        } else if (op$type == "cols") {
          before <- ncol(data)
          data <- data %>% remove_empty(which = "cols")
          removed_count <- removed_count + (before - ncol(data))
          if (before > ncol(data)) {
            messages <- c(messages, paste0("Removed ", before - ncol(data), " empty columns"))
          }
        }
      },

      "handle_na" = {
        cols <- op$columns
        method <- op$method

        for (col_name in cols) {
          if (!col_name %in% names(data)) next
          na_count <- sum(is.na(data[[col_name]]))

          if (method == "mean" && is.numeric(data[[col_name]])) {
            val <- mean(data[[col_name]], na.rm = TRUE)
            data[[col_name]][is.na(data[[col_name]])] <- val
            imputed_values[[col_name]] <- val
            messages <- c(messages, paste0("Imputed ", na_count, " NA in ", col_name, " with mean"))
          } else if (method == "median" && is.numeric(data[[col_name]])) {
            val <- median(data[[col_name]], na.rm = TRUE)
            data[[col_name]][is.na(data[[col_name]])] <- val
            imputed_values[[col_name]] <- val
            messages <- c(messages, paste0("Imputed ", na_count, " NA in ", col_name, " with median"))
          } else if (method == "mode") {
            vals <- data[[col_name]][!is.na(data[[col_name]])]
            freq <- table(vals, useNA = "no")
            val <- names(freq)[which.max(freq)]
            if (length(val) > 0) {
              data[[col_name]][is.na(data[[col_name]])] <- val
              imputed_values[[col_name]] <- val
              messages <- c(messages, paste0("Imputed ", na_count, " NA in ", col_name, " with mode"))
            }
          } else if (method == "remove") {
            before <- nrow(data)
            data <- data %>% filter(!is.na(!!sym(col_name)))
            removed_count <- removed_count + (before - nrow(data))
            messages <- c(messages, paste0("Removed ", before - nrow(data), " rows with NA in ", col_name))
          }
        }
      },

      "remove_outliers" = {
        col_name <- op$column
        method <- op$method
        threshold <- op$threshold

        if (!col_name %in% names(data) || !is.numeric(data[[col_name]])) next

        if (method == "iqr") {
          Q1 <- quantile(data[[col_name]], 0.25, na.rm = TRUE)
          Q3 <- quantile(data[[col_name]], 0.75, na.rm = TRUE)
          IQR_val <- Q3 - Q1
          lower <- Q1 - threshold * IQR_val
          upper <- Q3 + threshold * IQR_val

          before <- nrow(data)
          data <- data %>%
            filter(data[[col_name]] >= lower & data[[col_name]] <= upper)
          removed <- before - nrow(data)
          removed_count <- removed_count + removed

          if (removed > 0) {
            messages <- c(messages, paste0("Removed ", removed, " outliers from ", col_name))
          }
        }
      },

      "log_transform" = {
        col_name <- op$column
        if (!col_name %in% names(data) || !is.numeric(data[[col_name]])) next

        if (any(data[[col_name]] <= 0, na.rm = TRUE)) {
          messages <- c(messages, paste0("Warning: log_transform on ", col_name, " skipped due to non-positive values"))
        } else {
          data[[col_name]] <- log(data[[col_name]])
          messages <- c(messages, paste0("Applied log transform to ", col_name))
        }
      },

      "standardize" = {
        col_name <- op$column
        if (!col_name %in% names(data) || !is.numeric(data[[col_name]])) next

        data[[col_name]] <- (data[[col_name]] - mean(data[[col_name]], na.rm = TRUE)) / sd(data[[col_name]], na.rm = TRUE)
        messages <- c(messages, paste0("Standardized ", col_name))
      },

      "normalize" = {
        col_name <- op$column
        if (!col_name %in% names(data) || !is.numeric(data[[col_name]])) next

        min_val <- min(data[[col_name]], na.rm = TRUE)
        max_val <- max(data[[col_name]], na.rm = TRUE)
        data[[col_name]] <- (data[[col_name]] - min_val) / (max_val - min_val)
        messages <- c(messages, paste0("Normalized ", col_name))
      },

      "rename" = {
        old_name <- op$old
        new_name <- op$new
        if (old_name %in% names(data)) {
          data <- data %>% rename(!!new_name := !!sym(old_name))
          messages <- c(messages, paste0("Renamed ", old_name, " to ", new_name))
        }
      },

      "filter" = {
        col_name <- op$column
        operator <- op$operator
        value <- op$value

        if (!col_name %in% names(data)) next

        before <- nrow(data)
        data <- switch(operator,
          ">" = data %>% filter(data[[col_name]] > value),
          "<" = data %>% filter(data[[col_name]] < value),
          ">=" = data %>% filter(data[[col_name]] >= value),
          "<=" = data %>% filter(data[[col_name]] <= value),
          "==" = data %>% filter(data[[col_name]] == value),
          "!=" = data %>% filter(data[[col_name]] != value),
          data
        )
        filtered <- before - nrow(data)
        if (filtered > 0) {
          messages <- c(messages, paste0("Filtered ", filtered, " rows where ", col_name, " ", operator, " ", value))
        }
      },

      "convert_type" = {
        col_name <- op$column
        as_type <- op$as

        if (!col_name %in% names(data)) next

        if (as_type == "numeric") {
          data[[col_name]] <- as.numeric(data[[col_name]])
          messages <- c(messages, paste0("Converted ", col_name, " to numeric"))
        } else if (as_type == "factor") {
          data[[col_name]] <- as.factor(data[[col_name]])
          messages <- c(messages, paste0("Converted ", col_name, " to factor"))
        }
      }
    )
  }

  # Update session data - save to file and global env
  assign(env_name, data, envir = .GlobalEnv)
  tryCatch({
    save_data <- lapply(seq_len(nrow(data)), function(i) {
      row <- as.list(data[i, ])
      names(row) <- names(data)
      row
    })
    writeLines(toJSON(list(data = save_data, columns = names(data)), auto_unbox = TRUE), session_file)
  }, error = function(e) {
    # Silently fail
  })

  # Build result
  message_text <- paste(messages, collapse = "; ")

  result <- list(
    success = TRUE,
    session_id = session_id,
    cleaned_row_count = nrow(data),
    removed_count = removed_count,
    imputed_values = if (length(imputed_values) > 0) imputed_values else NULL,
    message = if (message_text != "") message_text else "Data cleaning completed"
  )

  cat(toJSON(result, auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = as.character(e$message)), auto_unbox = TRUE))
  quit(status = 1)
})
