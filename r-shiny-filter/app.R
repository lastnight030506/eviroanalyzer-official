# ============================================================
# EnviroAnalyzer Pro - R Shiny Data Filtering Module
# All statistical logic uses R base & R libraries
# ============================================================

library(shiny)
library(shinydashboard)
library(shinyWidgets)
library(DT)
library(rhandsontable)
library(dplyr)
library(tidyr)
library(ggplot2)
library(plotly)
library(readxl)
library(writexl)
library(broom)

# ============================================================
# HELPER FUNCTIONS (Pure R Logic)
# ============================================================

#' Detect outliers using IQR method
#' @param x numeric vector
#' @param k multiplier for IQR (default 1.5)
#' @return logical vector (TRUE = outlier)
detect_outliers_iqr <- function(x, k = 1.5) {
  x <- as.numeric(x)
  q <- stats::quantile(x, probs = c(0.25, 0.75), na.rm = TRUE)
  iqr_val <- stats::IQR(x, na.rm = TRUE)
  lower <- q[1] - k * iqr_val
  upper <- q[2] + k * iqr_val
  is_outlier <- !is.na(x) & (x < lower | x > upper)
  return(is_outlier)
}

#' Get outlier bounds using IQR
#' @param x numeric vector
#' @param k multiplier for IQR (default 1.5)
#' @return named list with lower, upper, q1, q3, iqr
get_outlier_bounds <- function(x, k = 1.5) {
  x <- as.numeric(x)
  q <- stats::quantile(x, probs = c(0.25, 0.75), na.rm = TRUE)
  iqr_val <- stats::IQR(x, na.rm = TRUE)
  list(
    q1 = q[1],
    q3 = q[2],
    iqr = iqr_val,
    lower = q[1] - k * iqr_val,
    upper = q[2] + k * iqr_val
  )
}

#' Cap (Winsorize) outliers to IQR bounds
#' @param x numeric vector
#' @param k multiplier for IQR (default 1.5)
#' @return numeric vector with outliers capped
cap_outliers <- function(x, k = 1.5) {
  x <- as.numeric(x)
  bounds <- get_outlier_bounds(x, k)
  x_capped <- ifelse(x < bounds$lower, bounds$lower,
                      ifelse(x > bounds$upper, bounds$upper, x))
  return(x_capped)
}

#' Run one-way ANOVA
#' @param data data.frame
#' @param value_col name of numeric column
#' @param group_col name of grouping column
#' @return list with anova_table, tukey_results, model
run_anova_analysis <- function(data, value_col, group_col) {
  formula_str <- paste0("`", value_col, "` ~ factor(`", group_col, "`)")
  model <- stats::aov(stats::as.formula(formula_str), data = data)
  anova_tidy <- broom::tidy(model)
  
  tukey_result <- NULL
  tukey_tidy <- NULL
  n_groups <- length(unique(data[[group_col]]))
  if (n_groups >= 2) {
    tryCatch({
      tukey_result <- stats::TukeyHSD(model)
      tukey_tidy <- as.data.frame(tukey_result[[1]])
      tukey_tidy$comparison <- rownames(tukey_tidy)
      tukey_tidy <- tukey_tidy[, c("comparison", "diff", "lwr", "upr", "p adj")]
      colnames(tukey_tidy) <- c("Comparison", "Difference", "Lower CI", "Upper CI", "P-value")
    }, error = function(e) {
      message("Tukey HSD failed: ", e$message)
    })
  }
  
  list(
    anova_table = anova_tidy,
    tukey_table = tukey_tidy,
    model = model
  )
}

#' Get numeric column names from data
get_numeric_cols <- function(data) {
  names(data)[sapply(data, is.numeric)]
}

#' Get non-numeric column names from data
get_factor_cols <- function(data) {
  names(data)[sapply(data, function(x) is.character(x) || is.factor(x))]
}

# ============================================================
# UI
# ============================================================
ui <- dashboardPage(
  skin = "blue",
  
  dashboardHeader(
    title = tags$span(
      tags$i(class = "fas fa-leaf", style = "color: #10b981;"),
      " EnviroAnalyzer Filter"
    ),
    titleWidth = 280
  ),
  
  dashboardSidebar(
    width = 280,
    sidebarMenu(
      id = "tabs",
      menuItem("Data Import", tabName = "import", icon = icon("upload")),
      menuItem("Outlier Detection", tabName = "outliers", icon = icon("search")),
      menuItem("ANOVA Analysis", tabName = "anova", icon = icon("chart-bar")),
      menuItem("Data Cleaning", tabName = "cleaning", icon = icon("filter"))
    ),
    tags$hr(),
    tags$div(
      style = "padding: 10px 15px; color: #8899aa; font-size: 11px;",
      tags$p("EnviroAnalyzer Pro"),
      tags$p("R Shiny Data Filtering Module"),
      tags$p(paste("R version:", R.version.string))
    )
  ),
  
  dashboardBody(
    # Custom CSS
    tags$head(tags$style(HTML("
      .content-wrapper { background-color: #f0f4f8; }
      .box { border-top: 3px solid #3b82f6; border-radius: 8px; }
      .box-header { background: white; }
      .skin-blue .main-header .logo { font-weight: bold; }
      .info-box { border-radius: 8px; }
      .btn-primary { background-color: #3b82f6; border-color: #3b82f6; }
      .btn-success { background-color: #10b981; border-color: #10b981; }
      .btn-danger  { background-color: #ef4444; border-color: #ef4444; }
      .btn-warning { background-color: #f59e0b; border-color: #f59e0b; }
      .nav-tabs-custom > .tab-content { padding: 15px; }
      table.dataTable tbody tr:hover { background-color: #eff6ff !important; }
      .outlier-row { background-color: #fef2f2 !important; color: #991b1b; font-weight: 600; }
    "))),
    
    tabItems(
      # ========== TAB 1: DATA IMPORT ==========
      tabItem(
        tabName = "import",
        fluidRow(
          box(
            title = "Upload Data", width = 4, status = "primary", solidHeader = TRUE,
            fileInput("file_upload", "Choose CSV or Excel file",
                      accept = c(".csv", ".xlsx", ".xls")),
            tags$hr(),
            actionButton("load_sample", "Load Sample Data",
                         icon = icon("database"), class = "btn-success btn-block"),
            tags$hr(),
            tags$h4("Paste Data (Tab-separated)"),
            tags$textarea(
              id = "paste_data", rows = 6,
              style = "width:100%; font-family: monospace; font-size: 12px;",
              placeholder = "Paste tab-separated data here...\nHeader1\\tHeader2\\tHeader3\nVal1\\tVal2\\tVal3"
            ),
            actionButton("parse_paste", "Parse Pasted Data",
                         icon = icon("clipboard"), class = "btn-primary btn-block")
          ),
          box(
            title = "Data Preview", width = 8, status = "info", solidHeader = TRUE,
            tags$div(
              style = "margin-bottom: 10px;",
              uiOutput("data_summary_info")
            ),
            DT::dataTableOutput("preview_table")
          )
        )
      ),
      
      # ========== TAB 2: OUTLIER DETECTION ==========
      tabItem(
        tabName = "outliers",
        fluidRow(
          box(
            title = "Configuration", width = 3, status = "primary", solidHeader = TRUE,
            selectInput("outlier_cols", "Select Columns", choices = NULL, multiple = TRUE),
            numericInput("iqr_multiplier", "IQR Multiplier (k)", value = 1.5, min = 0.5, max = 5, step = 0.1),
            tags$p(class = "text-muted", style = "font-size: 11px;",
                   "k=1.5: Standard outliers | k=3.0: Extreme outliers"),
            actionButton("detect_outliers", "Detect Outliers",
                         icon = icon("search"), class = "btn-primary btn-block"),
            tags$hr(),
            uiOutput("outlier_summary_box")
          ),
          box(
            title = "Boxplot Visualization", width = 9, status = "info", solidHeader = TRUE,
            plotlyOutput("boxplot_chart", height = "400px"),
            tags$hr(),
            tags$h4("Outlier Details"),
            DT::dataTableOutput("outlier_table")
          )
        )
      ),
      
      # ========== TAB 3: ANOVA ANALYSIS ==========
      tabItem(
        tabName = "anova",
        fluidRow(
          box(
            title = "ANOVA Configuration", width = 3, status = "primary", solidHeader = TRUE,
            selectInput("anova_value_col", "Numeric Variable", choices = NULL),
            selectInput("anova_group_col", "Grouping Variable", choices = NULL),
            actionButton("run_anova", "Run ANOVA",
                         icon = icon("calculator"), class = "btn-primary btn-block"),
            tags$hr(),
            uiOutput("anova_interpretation")
          ),
          box(
            title = "ANOVA Results", width = 9, status = "info", solidHeader = TRUE,
            tabsetPanel(
              tabPanel(
                "ANOVA Table",
                tags$br(),
                DT::dataTableOutput("anova_result_table")
              ),
              tabPanel(
                "Tukey HSD",
                tags$br(),
                DT::dataTableOutput("tukey_table")
              ),
              tabPanel(
                "Group Comparison Plot",
                tags$br(),
                plotlyOutput("anova_plot", height = "450px")
              )
            )
          )
        )
      ),
      
      # ========== TAB 4: DATA CLEANING ==========
      tabItem(
        tabName = "cleaning",
        fluidRow(
          box(
            title = "Cleaning Options", width = 4, status = "primary", solidHeader = TRUE,
            selectInput("clean_cols", "Columns to Clean", choices = NULL, multiple = TRUE),
            numericInput("clean_iqr_k", "IQR Multiplier (k)", value = 1.5, min = 0.5, max = 5, step = 0.1),
            radioButtons("clean_method", "Cleaning Method",
                         choices = c(
                           "Remove Outlier Rows" = "remove",
                           "Cap to IQR Bounds (Winsorize)" = "cap",
                           "Replace with NA" = "na"
                         ), selected = "cap"),
            actionButton("apply_cleaning", "Apply Cleaning",
                         icon = icon("broom"), class = "btn-warning btn-block"),
            tags$hr(),
            tags$h4("Export Cleaned Data"),
            downloadButton("download_csv", "Download CSV", class = "btn-success btn-block"),
            tags$br(),
            downloadButton("download_xlsx", "Download Excel", class = "btn-primary btn-block"),
            tags$hr(),
            uiOutput("cleaning_summary")
          ),
          box(
            title = "Cleaned Data Preview", width = 8, status = "info", solidHeader = TRUE,
            DT::dataTableOutput("cleaned_table")
          )
        )
      )
    )
  )
)

# ============================================================
# SERVER
# ============================================================
server <- function(input, output, session) {
  
  # Reactive: raw uploaded data
  raw_data <- reactiveVal(NULL)
  
  # Reactive: cleaned data
  cleaned_data <- reactiveVal(NULL)
  
  # Reactive: outlier detection results
  outlier_results <- reactiveVal(NULL)
  
  # Reactive: ANOVA results
  anova_results <- reactiveVal(NULL)
  
  # ---- FILE UPLOAD ----
  observeEvent(input$file_upload, {
    req(input$file_upload)
    ext <- tools::file_ext(input$file_upload$datapath)
    
    tryCatch({
      data <- if (ext == "csv") {
        utils::read.csv(input$file_upload$datapath, stringsAsFactors = FALSE)
      } else if (ext %in% c("xlsx", "xls")) {
        readxl::read_excel(input$file_upload$datapath) %>% as.data.frame()
      } else {
        stop("Unsupported file format. Use CSV or Excel.")
      }
      
      raw_data(data)
      cleaned_data(data)
      update_column_selectors(data)
      showNotification(paste("Loaded", nrow(data), "rows,", ncol(data), "columns"), type = "message")
    }, error = function(e) {
      showNotification(paste("Error:", e$message), type = "error")
    })
  })
  
  # ---- LOAD SAMPLE DATA ----
  observeEvent(input$load_sample, {
    sample_path <- file.path(getwd(), "r-shiny-filter", "sample_data.csv")
    if (!file.exists(sample_path)) {
      sample_path <- file.path(getwd(), "sample_data.csv")
    }
    
    tryCatch({
      if (file.exists(sample_path)) {
        data <- utils::read.csv(sample_path, stringsAsFactors = FALSE)
      } else {
        # Generate minimal sample if file not found
        set.seed(42)
        data <- data.frame(
          Station = rep(paste0("ST0", 1:4), each = 5),
          pH = round(stats::rnorm(20, 7, 0.8), 1),
          DO = round(stats::rnorm(20, 5, 1.5), 1),
          BOD5 = round(stats::rnorm(20, 25, 15), 1),
          COD = round(stats::rnorm(20, 50, 25), 1),
          TSS = round(stats::rnorm(20, 60, 30), 1),
          Group = rep(c("A", "A", "B", "C"), each = 5),
          stringsAsFactors = FALSE
        )
      }
      
      raw_data(data)
      cleaned_data(data)
      update_column_selectors(data)
      showNotification(paste("Loaded sample data:", nrow(data), "rows"), type = "message")
    }, error = function(e) {
      showNotification(paste("Error loading sample:", e$message), type = "error")
    })
  })
  
  # ---- PASTE DATA ----
  observeEvent(input$parse_paste, {
    req(nchar(input$paste_data) > 0)
    tryCatch({
      con <- textConnection(input$paste_data)
      data <- utils::read.delim(con, stringsAsFactors = FALSE)
      close(con)
      
      # Try to convert columns to numeric where possible
      for (col in names(data)) {
        converted <- suppressWarnings(as.numeric(data[[col]]))
        if (sum(is.na(converted)) <= sum(is.na(data[[col]]))) {
          # Only convert if it doesn't produce more NAs
          non_na_original <- data[[col]][!is.na(data[[col]]) & data[[col]] != ""]
          non_na_converted <- converted[!is.na(data[[col]]) & data[[col]] != ""]
          if (length(non_na_original) > 0 && sum(is.na(non_na_converted)) < length(non_na_original) * 0.5) {
            data[[col]] <- converted
          }
        }
      }
      
      raw_data(data)
      cleaned_data(data)
      update_column_selectors(data)
      showNotification(paste("Parsed", nrow(data), "rows,", ncol(data), "columns"), type = "message")
    }, error = function(e) {
      showNotification(paste("Parse error:", e$message), type = "error")
    })
  })
  
  # ---- UPDATE COLUMN SELECTORS ----
  update_column_selectors <- function(data) {
    num_cols <- get_numeric_cols(data)
    fac_cols <- get_factor_cols(data)
    
    updateSelectInput(session, "outlier_cols", choices = num_cols, selected = num_cols[1:min(3, length(num_cols))])
    updateSelectInput(session, "clean_cols", choices = num_cols, selected = num_cols[1:min(3, length(num_cols))])
    updateSelectInput(session, "anova_value_col", choices = num_cols, selected = num_cols[1])
    updateSelectInput(session, "anova_group_col", choices = c(fac_cols, num_cols), selected = if (length(fac_cols) > 0) fac_cols[length(fac_cols)] else num_cols[1])
  }
  
  # ---- DATA PREVIEW ----
  output$preview_table <- DT::renderDataTable({
    req(raw_data())
    DT::datatable(
      raw_data(),
      options = list(pageLength = 15, scrollX = TRUE, dom = "frtip"),
      class = "compact stripe hover",
      rownames = FALSE
    )
  })
  
  output$data_summary_info <- renderUI({
    req(raw_data())
    d <- raw_data()
    num_cols <- get_numeric_cols(d)
    tags$div(
      class = "row",
      tags$div(class = "col-sm-3",
               tags$div(class = "info-box bg-aqua",
                        tags$span(class = "info-box-icon", icon("table")),
                        tags$div(class = "info-box-content",
                                 tags$span(class = "info-box-text", "Rows"),
                                 tags$span(class = "info-box-number", nrow(d))))),
      tags$div(class = "col-sm-3",
               tags$div(class = "info-box bg-green",
                        tags$span(class = "info-box-icon", icon("columns")),
                        tags$div(class = "info-box-content",
                                 tags$span(class = "info-box-text", "Columns"),
                                 tags$span(class = "info-box-number", ncol(d))))),
      tags$div(class = "col-sm-3",
               tags$div(class = "info-box bg-yellow",
                        tags$span(class = "info-box-icon", icon("hashtag")),
                        tags$div(class = "info-box-content",
                                 tags$span(class = "info-box-text", "Numeric"),
                                 tags$span(class = "info-box-number", length(num_cols))))),
      tags$div(class = "col-sm-3",
               tags$div(class = "info-box bg-red",
                        tags$span(class = "info-box-icon", icon("exclamation-triangle")),
                        tags$div(class = "info-box-content",
                                 tags$span(class = "info-box-text", "Missing"),
                                 tags$span(class = "info-box-number", sum(is.na(d))))))
    )
  })
  
  # ---- OUTLIER DETECTION ----
  observeEvent(input$detect_outliers, {
    req(raw_data(), input$outlier_cols)
    data <- raw_data()
    k <- input$iqr_multiplier
    cols <- input$outlier_cols
    
    # Build outlier results using R stats
    results <- lapply(cols, function(col) {
      x <- data[[col]]
      if (!is.numeric(x)) return(NULL)
      
      outliers <- detect_outliers_iqr(x, k)
      bounds <- get_outlier_bounds(x, k)
      bps <- grDevices::boxplot.stats(x, coef = k)
      
      list(
        column = col,
        n_total = sum(!is.na(x)),
        n_outliers = sum(outliers, na.rm = TRUE),
        pct_outliers = round(sum(outliers, na.rm = TRUE) / sum(!is.na(x)) * 100, 1),
        q1 = bounds$q1,
        q3 = bounds$q3,
        iqr = bounds$iqr,
        lower = bounds$lower,
        upper = bounds$upper,
        outlier_indices = which(outliers),
        outlier_values = x[outliers]
      )
    })
    results <- Filter(Negate(is.null), results)
    outlier_results(results)
    
    showNotification("Outlier detection complete!", type = "message")
  })
  
  # Boxplot
  output$boxplot_chart <- renderPlotly({
    req(raw_data(), input$outlier_cols)
    data <- raw_data()
    cols <- input$outlier_cols
    
    # Reshape for ggplot
    plot_data <- data %>%
      dplyr::select(dplyr::all_of(cols)) %>%
      tidyr::pivot_longer(cols = dplyr::everything(), names_to = "Parameter", values_to = "Value") %>%
      dplyr::filter(!is.na(Value))
    
    p <- ggplot2::ggplot(plot_data, ggplot2::aes(x = Parameter, y = Value, fill = Parameter)) +
      ggplot2::geom_boxplot(alpha = 0.7, outlier.colour = "#ef4444", outlier.size = 3, outlier.shape = 16) +
      ggplot2::geom_jitter(width = 0.15, alpha = 0.4, size = 1.5, color = "#3b82f6") +
      ggplot2::theme_minimal(base_size = 13) +
      ggplot2::theme(
        legend.position = "none",
        panel.grid.minor = ggplot2::element_blank(),
        axis.title.x = ggplot2::element_blank()
      ) +
      ggplot2::labs(y = "Value", title = "Distribution & Outliers by Parameter") +
      ggplot2::scale_fill_brewer(palette = "Set2")
    
    plotly::ggplotly(p, tooltip = c("x", "y")) %>%
      plotly::layout(hoverlabel = list(bgcolor = "white"))
  })
  
  # Outlier summary
  output$outlier_summary_box <- renderUI({
    req(outlier_results())
    results <- outlier_results()
    
    total_outliers <- sum(sapply(results, function(r) r$n_outliers))
    
    tags$div(
      tags$h4(style = "color: #ef4444;", icon("exclamation-circle"), paste(total_outliers, "outliers found")),
      tags$hr(),
      lapply(results, function(r) {
        tags$div(
          style = "margin-bottom: 8px; padding: 8px; background: #f8fafc; border-radius: 6px;",
          tags$strong(r$column),
          tags$br(),
          tags$span(style = "font-size: 12px; color: #64748b;",
                    paste0(r$n_outliers, " / ", r$n_total, " (", r$pct_outliers, "%)"))
        )
      })
    )
  })
  
  # Outlier detail table
  output$outlier_table <- DT::renderDataTable({
    req(outlier_results())
    results <- outlier_results()
    
    detail_rows <- lapply(results, function(r) {
      if (length(r$outlier_values) == 0) return(NULL)
      data.frame(
        Column = r$column,
        Row_Index = r$outlier_indices,
        Value = r$outlier_values,
        Lower_Bound = round(r$lower, 3),
        Upper_Bound = round(r$upper, 3),
        Status = ifelse(r$outlier_values < r$lower, "Below Lower", "Above Upper"),
        stringsAsFactors = FALSE
      )
    })
    
    detail_df <- do.call(rbind, Filter(Negate(is.null), detail_rows))
    
    if (is.null(detail_df) || nrow(detail_df) == 0) {
      detail_df <- data.frame(Message = "No outliers detected", stringsAsFactors = FALSE)
    }
    
    DT::datatable(
      detail_df,
      options = list(pageLength = 10, dom = "frtip"),
      class = "compact stripe hover",
      rownames = FALSE
    ) %>%
      DT::formatStyle("Status",
                       backgroundColor = DT::styleEqual(
                         c("Below Lower", "Above Upper"),
                         c("#fef2f2", "#fefce8")
                       ))
  })
  
  # ---- ANOVA ANALYSIS ----
  observeEvent(input$run_anova, {
    req(raw_data(), input$anova_value_col, input$anova_group_col)
    data <- raw_data()
    
    tryCatch({
      result <- run_anova_analysis(data, input$anova_value_col, input$anova_group_col)
      anova_results(result)
      showNotification("ANOVA analysis complete!", type = "message")
    }, error = function(e) {
      showNotification(paste("ANOVA error:", e$message), type = "error")
    })
  })
  
  output$anova_result_table <- DT::renderDataTable({
    req(anova_results())
    tbl <- anova_results()$anova_table
    tbl$p.value <- formatC(tbl$p.value, format = "e", digits = 3)
    DT::datatable(tbl, options = list(dom = "t"), rownames = FALSE, class = "compact stripe")
  })
  
  output$tukey_table <- DT::renderDataTable({
    req(anova_results())
    tbl <- anova_results()$tukey_table
    if (is.null(tbl)) {
      return(DT::datatable(data.frame(Message = "Tukey HSD requires at least 2 groups"), rownames = FALSE))
    }
    tbl$`P-value` <- formatC(tbl$`P-value`, format = "e", digits = 3)
    DT::datatable(tbl, options = list(dom = "t", scrollX = TRUE), rownames = FALSE, class = "compact stripe") %>%
      DT::formatRound(c("Difference", "Lower CI", "Upper CI"), digits = 3)
  })
  
  output$anova_plot <- renderPlotly({
    req(raw_data(), input$anova_value_col, input$anova_group_col)
    data <- raw_data()
    val_col <- input$anova_value_col
    grp_col <- input$anova_group_col
    
    p <- ggplot2::ggplot(data, ggplot2::aes_string(x = paste0("`", grp_col, "`"),
                                                    y = paste0("`", val_col, "`"),
                                                    fill = paste0("`", grp_col, "`"))) +
      ggplot2::geom_boxplot(alpha = 0.6, outlier.shape = NA) +
      ggplot2::geom_jitter(width = 0.2, alpha = 0.5, size = 2, color = "#1e293b") +
      ggplot2::stat_summary(fun = mean, geom = "point", shape = 18, size = 4, color = "#ef4444") +
      ggplot2::theme_minimal(base_size = 13) +
      ggplot2::theme(legend.position = "none") +
      ggplot2::labs(
        title = paste("Group Comparison:", val_col, "by", grp_col),
        x = grp_col, y = val_col
      ) +
      ggplot2::scale_fill_brewer(palette = "Pastel1")
    
    plotly::ggplotly(p, tooltip = c("x", "y"))
  })
  
  output$anova_interpretation <- renderUI({
    req(anova_results())
    tbl <- anova_results()$anova_table
    p_val <- tbl$p.value[1]
    
    if (is.na(p_val)) {
      return(tags$div(class = "text-muted", "Could not compute p-value."))
    }
    
    sig_level <- if (p_val < 0.001) "Highly significant (p < 0.001)"
                 else if (p_val < 0.01) "Very significant (p < 0.01)"
                 else if (p_val < 0.05) "Significant (p < 0.05)"
                 else "Not significant (p >= 0.05)"
    
    color <- if (p_val < 0.05) "#10b981" else "#f59e0b"
    
    tags$div(
      tags$h4(style = paste0("color:", color, ";"), icon("chart-line"), "Interpretation"),
      tags$p(style = "font-size: 13px;",
             tags$strong("F-value:"), round(tbl$statistic[1], 3)),
      tags$p(style = "font-size: 13px;",
             tags$strong("P-value:"), formatC(p_val, format = "e", digits = 3)),
      tags$p(style = paste0("font-size: 13px; font-weight: bold; color:", color, ";"),
             sig_level),
      if (p_val < 0.05) {
        tags$p(style = "font-size: 12px; color: #64748b;",
               "Groups are statistically different. Check Tukey HSD for pairwise comparisons.")
      } else {
        tags$p(style = "font-size: 12px; color: #64748b;",
               "No significant difference between groups at alpha = 0.05.")
      }
    )
  })
  
  # ---- DATA CLEANING ----
  observeEvent(input$apply_cleaning, {
    req(raw_data(), input$clean_cols)
    data <- raw_data()
    k <- input$clean_iqr_k
    cols <- input$clean_cols
    method <- input$clean_method
    
    original_rows <- nrow(data)
    
    if (method == "remove") {
      # Identify rows with any outlier in selected columns
      outlier_mask <- rep(FALSE, nrow(data))
      for (col in cols) {
        if (is.numeric(data[[col]])) {
          outlier_mask <- outlier_mask | detect_outliers_iqr(data[[col]], k)
        }
      }
      data <- data[!outlier_mask, ]
    } else if (method == "cap") {
      for (col in cols) {
        if (is.numeric(data[[col]])) {
          data[[col]] <- cap_outliers(data[[col]], k)
        }
      }
    } else if (method == "na") {
      for (col in cols) {
        if (is.numeric(data[[col]])) {
          outliers <- detect_outliers_iqr(data[[col]], k)
          data[[col]][outliers] <- NA
        }
      }
    }
    
    cleaned_data(data)
    removed <- original_rows - nrow(data)
    showNotification(
      paste("Cleaning applied!", if (method == "remove") paste(removed, "rows removed") else "Values adjusted"),
      type = "message"
    )
  })
  
  output$cleaned_table <- DT::renderDataTable({
    req(cleaned_data())
    DT::datatable(
      cleaned_data(),
      options = list(pageLength = 15, scrollX = TRUE, dom = "frtip"),
      class = "compact stripe hover",
      rownames = FALSE
    )
  })
  
  output$cleaning_summary <- renderUI({
    req(raw_data(), cleaned_data())
    orig <- raw_data()
    clean <- cleaned_data()
    
    tags$div(
      tags$h4(icon("info-circle"), "Summary"),
      tags$p(paste("Original:", nrow(orig), "rows")),
      tags$p(paste("Cleaned:", nrow(clean), "rows")),
      if (nrow(orig) != nrow(clean)) {
        tags$p(style = "color: #ef4444; font-weight: bold;",
               paste("Removed:", nrow(orig) - nrow(clean), "rows"))
      }
    )
  })
  
  # ---- DOWNLOAD HANDLERS ----
  output$download_csv <- downloadHandler(
    filename = function() {
      paste0("cleaned_data_", Sys.Date(), ".csv")
    },
    content = function(file) {
      req(cleaned_data())
      utils::write.csv(cleaned_data(), file, row.names = FALSE)
    }
  )
  
  output$download_xlsx <- downloadHandler(
    filename = function() {
      paste0("cleaned_data_", Sys.Date(), ".xlsx")
    },
    content = function(file) {
      req(cleaned_data())
      writexl::write_xlsx(cleaned_data(), file)
    }
  )
}

# ============================================================
# RUN APP
# ============================================================
shinyApp(ui = ui, server = server)
