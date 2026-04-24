# ============================================================
# EnviroAnalyzer Pro - R Shiny Data Filtering Module
# All statistical logic uses R base & R libraries
# ============================================================

library(shiny)
library(bslib)
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
# THEME & UI
# ============================================================
dark_theme <- bs_theme(
  version = 5,
  bootswatch = "darkly",
  primary = "#0ea5e9",
  secondary = "#64748b",
  success = "#10b981",
  warning = "#f59e0b",
  danger = "#ef4444",
  info = "#38bdf8",
  base_font = font_google("Inter"),
  heading_font = font_google("Inter"),
  code_font = font_google("Fira Code"),
  "navbar-bg" = "#0f172a",
  "body-bg" = "#0b1120",
  "body-color" = "#e2e8f0",
  "card-bg" = "#1e293b",
  "card-border-color" = "#334155",
  "input-bg" = "#0f172a",
  "input-border-color" = "#334155",
  "input-color" = "#e2e8f0"
)

ui <- page_sidebar(
  theme = dark_theme,
  title = tags$span(
    tags$i(class = "fas fa-leaf", style = "color: #10b981; margin-right: 8px;"),
    "EnviroAnalyzer Pro"
  ),
  window_title = "EnviroAnalyzer Pro",
  fillable = TRUE,
  
  sidebar = sidebar(
    width = 260,
    class = "bg-dark",
    title = tags$div(
      style = "font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;",
      "Navigation"
    ),
    navset_pill_list(
      id = "tabs",
      widths = c(12, 12),
      nav_panel("Data Import", value = "import", icon = icon("upload")),
      nav_panel("Outlier Detection", value = "outliers", icon = icon("magnifying-glass")),
      nav_panel("ANOVA Analysis", value = "anova", icon = icon("chart-column")),
      nav_panel("Data Cleaning", value = "cleaning", icon = icon("filter"))
    ),
    tags$hr(style = "border-color: #334155;"),
    tags$div(
      style = "font-size: 11px; color: #64748b; padding: 0 4px;",
      tags$p("EnviroAnalyzer Pro"),
      tags$p("R Shiny Data Filtering Module"),
      tags$p(paste("R version:", R.version.string))
    )
  ),
  
  # Custom CSS overrides
  tags$head(tags$style(HTML("
    :root { --ea-primary: #0ea5e9; --ea-success: #10b981; --ea-warning: #f59e0b; --ea-danger: #ef4444; }
    body { background-color: #0b1120 !important; }
    .bslib-page-sidebar > .bslib-sidebar-layout > .bslib-sidebar { background: #0f172a !important; border-right: 1px solid #1e293b; }
    .nav-pills .nav-link { color: #94a3b8; border-radius: 8px; margin-bottom: 4px; font-size: 14px; }
    .nav-pills .nav-link:hover { background: #1e293b; color: #e2e8f0; }
    .nav-pills .nav-link.active { background: linear-gradient(135deg, #0ea5e9, #38bdf8); color: #fff; font-weight: 600; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); height: 100%; display: flex; flex-direction: column; }
    .card-body { flex: 1 1 auto; }
    .card-header { background: #0f172a; border-bottom: 1px solid #334155; color: #e2e8f0; font-weight: 600; border-radius: 12px 12px 0 0 !important; }
    .btn-primary { background: linear-gradient(135deg, #0ea5e9, #38bdf8); border: none; font-weight: 500; }
    .btn-success { background: linear-gradient(135deg, #10b981, #34d399); border: none; font-weight: 500; }
    .btn-danger { background: linear-gradient(135deg, #ef4444, #f87171); border: none; font-weight: 500; }
    .btn-warning { background: linear-gradient(135deg, #f59e0b, #fbbf24); border: none; color: #0f172a; font-weight: 500; }
    .btn { border-radius: 8px; transition: all 0.2s ease; }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .form-control, .form-select { background: #0f172a; border: 1px solid #334155; color: #e2e8f0; border-radius: 8px; width: 100% !important; }
    .form-control:focus, .form-select:focus { border-color: #0ea5e9; box-shadow: 0 0 0 0.2rem rgba(14,165,233,0.25); }
    .shiny-input-container { width: 100% !important; max-width: 100% !important; }
    .selectize-control { width: 100% !important; }
    .selectize-input { background: #0f172a !important; border: 1px solid #334155 !important; color: #e2e8f0 !important; border-radius: 8px; width: 100% !important; }
    .selectize-dropdown { background: #1e293b; border: 1px solid #334155; color: #e2e8f0; }
    .selectize-dropdown .active { background: #0ea5e9; color: #fff; }
    .value-box { border-radius: 12px; border: 1px solid #334155; }
    table.dataTable tbody tr:hover { background-color: #1e293b !important; }
    .dataTables_wrapper .dataTables_length, .dataTables_wrapper .dataTables_filter, .dataTables_wrapper .dataTables_info, .dataTables_wrapper .dataTables_paginate { color: #94a3b8 !important; }
    .dataTables_wrapper .dataTables_paginate .paginate_button { color: #94a3b8 !important; }
    .dataTables_wrapper .dataTables_paginate .paginate_button.current { background: #0ea5e9 !important; color: #fff !important; border: none; }
    .shiny-notification { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 8px; }
    .tab-content { padding-top: 12px; }
    .nav-tabs .nav-link { color: #94a3b8; border: none; border-bottom: 2px solid transparent; }
    .nav-tabs .nav-link:hover { color: #e2e8f0; border-bottom-color: #334155; }
    .nav-tabs .nav-link.active { color: #0ea5e9; background: transparent; border-bottom-color: #0ea5e9; }
    hr { border-color: #334155; }
    .text-muted { color: #64748b !important; }
    textarea { width: 100% !important; box-sizing: border-box; }
    .plotly { width: 100% !important; }
    /* Upload drop zone */
    .upload-zone { border: 2px dashed #334155; border-radius: 12px; padding: 24px; text-align: center; transition: all 0.2s ease; cursor: pointer; }
    .upload-zone:hover { border-color: #0ea5e9; background: #0f172a; }
    .upload-zone.has-file { border-color: #10b981; background: #064e3b; }
    .upload-zone .btn-file { background: transparent; border: none; color: #94a3b8; }
    /* Stat badges */
    .stat-badge { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 6px 12px; display: flex; align-items: center; gap: 8px; flex: 1; min-width: 100px; }
    .stat-badge .stat-icon { font-size: 14px; color: #64748b; }
    .stat-badge .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-badge .stat-value { font-size: 16px; font-weight: 700; color: #e2e8f0; }
    /* Sheet tabs */
    .sheet-tabs { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
    .sheet-tab { background: #0f172a; border: 1px solid #334155; color: #94a3b8; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.15s ease; }
    .sheet-tab:hover { background: #1e293b; color: #e2e8f0; }
    .sheet-tab.active { background: linear-gradient(135deg, #0ea5e9, #38bdf8); color: #fff; border-color: transparent; font-weight: 600; }
    /* rhandsontable dark */
    .handsontable .htCore td { background: #1e293b !important; color: #e2e8f0 !important; border-color: #334155 !important; }
    .handsontable .htCore th { background: #0f172a !important; color: #94a3b8 !important; border-color: #334155 !important; }
    .handsontable .htCore tr:hover td { background: #0f172a !important; }
    .handsontable .wtHider { width: 100% !important; }
    .htContainer { width: 100% !important; }
    /* Progress bar */
    .shiny-file-input-progress { display: none; }
  "))),
  
  uiOutput("tab_content")
)

# ============================================================
# SERVER
# ============================================================
server <- function(input, output, session) {
  
  # ---- DYNAMIC TAB CONTENT ----
  output$tab_content <- renderUI({
    tab <- req(input$tabs)
    if (tab == "import") {
      layout_columns(
        col_widths = c(4, 8),
        card(
          card_header(tags$span(icon("upload"), " Upload Data")),
          uiOutput("upload_zone_ui"),
          tags$hr(),
          actionButton("load_sample", tags$span(icon("database"), " Load Sample"),
                       class = "btn-outline-success w-100 mb-2"),
          tags$h6("Paste Data (Tab-separated)"),
          tags$textarea(
            id = "paste_data", rows = 4,
            style = "width:100%; font-family: monospace; font-size: 12px; background:#0f172a; color:#e2e8f0; border:1px solid #334155; border-radius:8px; padding:8px; box-sizing:border-box;",
            placeholder = "Paste tab-separated data here...\nHeader1\tHeader2\tHeader3\nVal1\tVal2\tVal3"
          ),
          actionButton("parse_paste", tags$span(icon("clipboard"), " Parse"),
                       class = "btn-outline-primary w-100 mt-2")
        ),
        card(
          card_header(tags$span(icon("table"), " Data Preview")),
          full_screen = TRUE,
          uiOutput("data_summary_info"),
          uiOutput("sheet_tabs_ui"),
          tags$div(style = "height: 600px; overflow: auto; width: 100%;",
                   rHandsontableOutput("preview_table", width = "100%", height = "100%")
          )
        )
      )
    } else if (tab == "outliers") {
      layout_columns(
        col_widths = c(3, 9),
        card(
          card_header(tags$span(icon("sliders"), " Configuration")),
          selectInput("outlier_cols", "Select Columns", choices = NULL, multiple = TRUE),
          numericInput("iqr_multiplier", "IQR Multiplier (k)", value = 1.5, min = 0.5, max = 5, step = 0.1),
          tags$p(class = "text-muted", style = "font-size: 11px;",
                 "k=1.5: Standard outliers | k=3.0: Extreme outliers"),
          actionButton("detect_outliers", "Detect Outliers",
                       icon = icon("magnifying-glass"), class = "btn-primary w-100"),
          tags$hr(),
          uiOutput("outlier_summary_box")
        ),
        card(
          card_header(tags$span(icon("chart-column"), " Boxplot Visualization")),
          full_screen = TRUE,
          plotlyOutput("boxplot_chart", height = "400px"),
          tags$hr(),
          tags$h6("Outlier Details"),
          DT::dataTableOutput("outlier_table")
        )
      )
    } else if (tab == "anova") {
      layout_columns(
        col_widths = c(3, 9),
        card(
          card_header(tags$span(icon("calculator"), " ANOVA Configuration")),
          selectInput("anova_value_col", "Numeric Variable", choices = NULL),
          selectInput("anova_group_col", "Grouping Variable", choices = NULL),
          actionButton("run_anova", "Run ANOVA",
                       icon = icon("play"), class = "btn-primary w-100"),
          tags$hr(),
          uiOutput("anova_interpretation")
        ),
        card(
          card_header(tags$span(icon("chart-bar"), " ANOVA Results")),
          full_screen = TRUE,
          navset_card_tab(
            nav_panel("ANOVA Table", DT::dataTableOutput("anova_result_table")),
            nav_panel("Tukey HSD", DT::dataTableOutput("tukey_table")),
            nav_panel("Group Comparison Plot", plotlyOutput("anova_plot", height = "450px"))
          )
        )
      )
    } else if (tab == "cleaning") {
      layout_columns(
        col_widths = c(4, 8),
        card(
          card_header(tags$span(icon("broom"), " Cleaning Options")),
          selectInput("clean_cols", "Columns to Clean", choices = NULL, multiple = TRUE),
          numericInput("clean_iqr_k", "IQR Multiplier (k)", value = 1.5, min = 0.5, max = 5, step = 0.1),
          radioButtons("clean_method", "Cleaning Method",
                       choices = c(
                         "Remove Outlier Rows" = "remove",
                         "Cap to IQR Bounds (Winsorize)" = "cap",
                         "Replace with NA" = "na"
                       ), selected = "cap"),
          actionButton("apply_cleaning", "Apply Cleaning",
                       icon = icon("wand-magic-sparkles"), class = "btn-warning w-100"),
          tags$hr(),
          tags$h6("Export Cleaned Data"),
          downloadButton("download_csv", "Download CSV", class = "btn-success w-100 mb-2"),
          downloadButton("download_xlsx", "Download Excel", class = "btn-primary w-100"),
          tags$hr(),
          uiOutput("cleaning_summary")
        ),
        card(
          card_header(tags$span(icon("table"), " Cleaned Data Preview")),
          DT::dataTableOutput("cleaned_table")
        )
      )
    }
  })
  
  # Reactive: raw uploaded data
  raw_data <- reactiveVal(NULL)
  
  # Reactive: cleaned data
  cleaned_data <- reactiveVal(NULL)
  
  # Reactive: outlier detection results
  outlier_results <- reactiveVal(NULL)
  
  # Reactive: ANOVA results
  anova_results <- reactiveVal(NULL)
  
  # Reactive: sheets data (list of dataframes)
  sheets_data <- reactiveVal(list())
  
  # Reactive: active sheet name
  active_sheet <- reactiveVal("Sheet 1")
  
  # Reactive: uploaded filename
  uploaded_filename <- reactiveVal(NULL)
  
  # ---- FILE UPLOAD ----
  observeEvent(input$file_upload, {
    req(input$file_upload)
    ext <- tools::file_ext(input$file_upload$datapath)
    uploaded_filename(input$file_upload$name)
    
    withProgress(message = "Reading file...", value = 0, {
      tryCatch({
        if (ext == "csv") {
          incProgress(0.3, detail = "Parsing CSV")
          data <- utils::read.csv(input$file_upload$datapath, stringsAsFactors = FALSE)
          sheets_data(list("Sheet 1" = data))
          active_sheet("Sheet 1")
          raw_data(data)
          cleaned_data(data)
          update_column_selectors(data)
          incProgress(0.7, detail = "Done")
        } else if (ext %in% c("xlsx", "xls")) {
          incProgress(0.2, detail = "Reading sheets")
          sheet_names <- readxl::excel_sheets(input$file_upload$datapath)
          all_sheets <- lapply(sheet_names, function(s) {
            as.data.frame(readxl::read_excel(input$file_upload$datapath, sheet = s))
          })
          names(all_sheets) <- sheet_names
          sheets_data(all_sheets)
          active_sheet(sheet_names[1])
          raw_data(all_sheets[[1]])
          cleaned_data(all_sheets[[1]])
          update_column_selectors(all_sheets[[1]])
          incProgress(0.8, detail = "Done")
        } else {
          stop("Unsupported file format. Use CSV or Excel.")
        }
        
        showNotification(paste("Loaded", input$file_upload$name), type = "message")
      }, error = function(e) {
        showNotification(paste("Error:", e$message), type = "error")
      })
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
      
      sheets_data(list("Sheet 1" = data))
      active_sheet("Sheet 1")
      uploaded_filename("sample_data.csv")
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
      
      sheets_data(list("Sheet 1" = data))
      active_sheet("Sheet 1")
      uploaded_filename("pasted_data")
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
  
  # ---- UPLOAD ZONE UI ----
  output$upload_zone_ui <- renderUI({
    has_file <- !is.null(uploaded_filename())
    tags$div(
      class = paste("upload-zone", if (has_file) "has-file" else ""),
      if (has_file) {
        tags$div(
          tags$div(style = "color: #10b981; font-size: 24px; margin-bottom: 8px;", icon("circle-check")),
          tags$div(style = "color: #e2e8f0; font-weight: 600;", uploaded_filename()),
          tags$div(style = "color: #64748b; font-size: 12px; margin-top: 4px;", "File loaded successfully")
        )
      } else {
        tags$div(
          tags$div(style = "color: #64748b; font-size: 32px; margin-bottom: 8px;", icon("cloud-arrow-up")),
          tags$div(style = "color: #94a3b8; font-weight: 500;", "Drop file here or click to browse"),
          tags$div(style = "color: #64748b; font-size: 11px; margin-top: 4px;", "Supports CSV, Excel (.xlsx, .xls)")
        )
      },
      fileInput("file_upload", label = NULL,
                accept = c(".csv", ".xlsx", ".xls"),
                buttonLabel = tags$span(icon("folder-open"), " Browse"),
                placeholder = "No file selected")
    )
  })
  
  # ---- SHEET TABS UI ----
  output$sheet_tabs_ui <- renderUI({
    req(sheets_data())
    sheets <- names(sheets_data())
    if (length(sheets) <= 1) return(NULL)
    tags$div(
      class = "sheet-tabs",
      lapply(sheets, function(s) {
        is_active <- s == active_sheet()
        tags$button(
          class = paste("sheet-tab", if (is_active) "active" else ""),
          onclick = sprintf("Shiny.setInputValue('sheet_tab_click', '%s', {priority: 'event'})", s),
          tags$span(icon("table"), s)
        )
      })
    )
  })
  
  observeEvent(input$sheet_tab_click, {
    req(input$sheet_tab_click)
    active_sheet(input$sheet_tab_click)
    # Also update raw_data to the selected sheet for other tabs
    df <- sheets_data()[[input$sheet_tab_click]]
    if (!is.null(df)) {
      raw_data(df)
      cleaned_data(df)
      update_column_selectors(df)
    }
  })
  
  # ---- DATA PREVIEW ----
  output$preview_table <- renderRHandsontable({
    req(sheets_data(), active_sheet())
    df <- sheets_data()[[active_sheet()]]
    req(df)
    rhandsontable(df, stretchH = "all", rowHeaders = TRUE, height = NULL) %>%
      hot_cols(manualColumnResize = TRUE, columnSorting = TRUE) %>%
      hot_context_menu(allowRowEdit = FALSE, allowColEdit = FALSE)
  })
  
  output$data_summary_info <- renderUI({
    req(raw_data())
    d <- raw_data()
    num_cols <- get_numeric_cols(d)
    tags$div(
      style = "display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;",
      tags$div(class = "stat-badge",
               tags$span(class = "stat-icon", icon("table")),
               tags$div(tags$div(class = "stat-label", "Rows"),
                        tags$div(class = "stat-value", nrow(d)))),
      tags$div(class = "stat-badge",
               tags$span(class = "stat-icon", icon("columns")),
               tags$div(tags$div(class = "stat-label", "Columns"),
                        tags$div(class = "stat-value", ncol(d)))),
      tags$div(class = "stat-badge",
               tags$span(class = "stat-icon", icon("hashtag")),
               tags$div(tags$div(class = "stat-label", "Numeric"),
                        tags$div(class = "stat-value", length(num_cols)))),
      tags$div(class = "stat-badge",
               tags$span(class = "stat-icon", icon("triangle-exclamation")),
               tags$div(tags$div(class = "stat-label", "Missing"),
                        tags$div(class = "stat-value", style = if (sum(is.na(d)) > 0) "color: #ef4444;" else "", sum(is.na(d)))))
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
