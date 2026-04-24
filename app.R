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
# HYPOTHESIS TESTING FUNCTIONS
# ============================================================

#' Chi-square Test of Independence
#' @param data data.frame
#' @param var1 categorical column 1
#' @param var2 categorical column 2
#' @return list with table, test_result, plot_data
run_chi_square <- function(data, var1, var2) {
  tbl <- table(data[[var1]], data[[var2]])
  test <- stats::chisq.test(tbl)
  expected <- test$expected
  
  list(
    observed = as.data.frame.matrix(tbl),
    expected = as.data.frame.matrix(expected),
    statistic = test$statistic,
    df = test$parameter,
    p_value = test$p.value,
    method = "Chi-square Test of Independence"
  )
}

#' Independent T-test with Levene's check
#' @param data data.frame
#' @param value_col numeric column
#' @param group_col binary grouping column
#' @return list with test results
run_ttest_independent <- function(data, value_col, group_col) {
  vals <- data[[value_col]]
  grp <- data[[group_col]]
  
  # Levene's test (using car::leveneTest or manual)
  grp_levels <- unique(grp[!is.na(grp)])
  if (length(grp_levels) != 2) stop("Grouping variable must have exactly 2 levels")
  
  g1 <- vals[grp == grp_levels[1] & !is.na(vals)]
  g2 <- vals[grp == grp_levels[2] & !is.na(vals)]
  
  # Manual Levene: absolute deviations from median
  med1 <- median(g1, na.rm = TRUE)
  med2 <- median(g2, na.rm = TRUE)
  dev1 <- abs(g1 - med1)
  dev2 <- abs(g2 - med2)
  levene_f <- stats::var.test(dev1, dev2)$statistic
  levene_p <- stats::var.test(dev1, dev2)$p.value
  
  var_equal <- levene_p > 0.05
  
  test <- stats::t.test(vals ~ grp, data = data, var.equal = var_equal)
  
  list(
    method = if (var_equal) "Independent T-test (equal variance)" else "Independent T-test (Welch's)",
    statistic = test$statistic,
    df = test$parameter,
    p_value = test$p.value,
    mean_g1 = mean(g1, na.rm = TRUE),
    mean_g2 = mean(g2, na.rm = TRUE),
    sd_g1 = stats::sd(g1, na.rm = TRUE),
    sd_g2 = stats::sd(g2, na.rm = TRUE),
    levene_p = levene_p,
    var_equal = var_equal,
    g1_name = as.character(grp_levels[1]),
    g2_name = as.character(grp_levels[2])
  )
}

#' Paired T-test
#' @param data data.frame
#' @param before_col numeric column (before)
#' @param after_col numeric column (after)
#' @return list with test results
run_ttest_paired <- function(data, before_col, after_col) {
  before <- data[[before_col]]
  after <- data[[after_col]]
  
  test <- stats::t.test(before, after, paired = TRUE)
  diff <- before - after
  
  list(
    method = "Paired T-test",
    statistic = test$statistic,
    df = test$parameter,
    p_value = test$p.value,
    mean_before = mean(before, na.rm = TRUE),
    mean_after = mean(after, na.rm = TRUE),
    mean_diff = mean(diff, na.rm = TRUE),
    sd_diff = stats::sd(diff, na.rm = TRUE)
  )
}

#' Shapiro-Wilk Normality Test
#' @param x numeric vector
#' @return list with statistic, p_value, is_normal
run_shapiro_test <- function(x) {
  x <- x[!is.na(x)]
  if (length(x) < 3 || length(x) > 5000) {
    return(list(statistic = NA, p_value = NA, is_normal = NA, note = "Sample size must be 3-5000"))
  }
  test <- stats::shapiro.test(x)
  list(
    statistic = test$statistic,
    p_value = test$p.value,
    is_normal = test$p.value > 0.05,
    note = NULL
  )
}

#' Generate Q-Q plot data
#' @param x numeric vector
#' @return ggplot object
make_qq_plot <- function(x, title = "Q-Q Plot") {
  x <- x[!is.na(x)]
  df <- data.frame(sample = x)
  ggplot2::ggplot(df, ggplot2::aes(sample = sample)) +
    ggplot2::stat_qq(alpha = 0.7, color = "#0ea5e9", size = 2) +
    ggplot2::stat_qq_line(color = "#ef4444", linetype = "dashed", size = 1) +
    ggplot2::theme_minimal(base_size = 13) +
    ggplot2::theme(
      plot.background = ggplot2::element_rect(fill = "#1e293b", color = NA),
      panel.background = ggplot2::element_rect(fill = "#1e293b", color = NA),
      plot.title = ggplot2::element_text(color = "#e2e8f0"),
      axis.text = ggplot2::element_text(color = "#94a3b8"),
      axis.title = ggplot2::element_text(color = "#94a3b8"),
      panel.grid.major = ggplot2::element_line(color = "#334155"),
      panel.grid.minor = ggplot2::element_line(color = "#1e293b")
    ) +
    ggplot2::labs(title = title, x = "Theoretical Quantiles", y = "Sample Quantiles")
}

#' Correlation matrix with heatmap data
#' @param data data.frame
#' @param cols numeric columns
#' @return list with matrix, p_values
run_correlation <- function(data, cols) {
  df <- data[, cols, drop = FALSE]
  df <- df[sapply(df, is.numeric)]
  
  cor_mat <- stats::cor(df, use = "pairwise.complete.obs")
  
  # p-values
  p_mat <- matrix(NA, ncol = ncol(cor_mat), nrow = nrow(cor_mat))
  for (i in seq_len(ncol(df))) {
    for (j in seq_len(ncol(df))) {
      if (i != j) {
        test <- stats::cor.test(df[[i]], df[[j]])
        p_mat[i, j] <- test$p.value
      } else {
        p_mat[i, j] <- 0
      }
    }
  }
  colnames(p_mat) <- colnames(cor_mat)
  rownames(p_mat) <- rownames(cor_mat)
  
  list(correlation = cor_mat, p_values = p_mat)
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
      nav_panel("Data Cleaning", value = "cleaning", icon = icon("filter")),
      nav_panel("Statistical Inference", value = "hypothesis", icon = icon("flask"))
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
    
    /* === GLOBAL INPUT FIXES === */
    /* Remove conflicting z-index on inputs */
    .shiny-input-container { width: 100% !important; max-width: 100% !important; position: relative; margin-bottom: 16px !important; }
    /* Ensure labels sit above inputs */
    .shiny-input-container > label { position: relative; z-index: 2; display: block; margin-bottom: 6px; font-weight: 500; color: #e2e8f0; }
    /* Natural height for all inputs */
    .shiny-input-container .form-control { height: auto; min-height: 38px; line-height: 1.5; }
    /* Radio buttons spacing */
    .shiny-input-container .radio { margin-bottom: 10px; padding: 2px 0; }
    .shiny-input-container .radio label { display: flex; align-items: center; gap: 8px; color: #e2e8f0; }
    /* Numeric input */
    .shiny-input-container input[type='number'] { height: auto; min-height: 38px; padding: 8px 12px; }
    /* Selectize dropdown */
    .selectize-control { width: 100% !important; position: relative; z-index: auto; }
    .selectize-input { background: #0f172a !important; border: 1px solid #334155 !important; color: #e2e8f0 !important; border-radius: 8px; width: 100% !important; min-height: 38px; padding: 8px 12px; line-height: 1.5; }
    .selectize-dropdown { background: #1e293b; border: 1px solid #334155; color: #e2e8f0; z-index: 1000; }
    .selectize-dropdown .active { background: #0ea5e9; color: #fff; }
    /* File input */
    .shiny-input-container .input-group { display: flex; flex-direction: column; gap: 4px; }
    .shiny-input-container .form-file { height: auto; }
    
    /* === CARD LAYOUT FIXES === */
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); height: auto; min-height: 100%; display: flex; flex-direction: column; }
    .card-body { flex: 1 1 auto; padding: 16px; overflow: visible; }
    .card-header { background: #0f172a; border-bottom: 1px solid #334155; color: #e2e8f0; font-weight: 600; border-radius: 12px 12px 0 0 !important; padding: 12px 16px; }
    
    /* === BUTTON FIXES === */
    .btn-primary { background: linear-gradient(135deg, #0ea5e9, #38bdf8); border: none; font-weight: 500; }
    .btn-success { background: linear-gradient(135deg, #10b981, #34d399); border: none; font-weight: 500; }
    .btn-danger { background: linear-gradient(135deg, #ef4444, #f87171); border: none; font-weight: 500; }
    .btn-warning { background: linear-gradient(135deg, #f59e0b, #fbbf24); border: none; color: #0f172a; font-weight: 500; }
    .btn { border-radius: 8px; transition: all 0.2s ease; margin-bottom: 8px; }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .btn:last-child { margin-bottom: 0; }
    
    /* === FORM CONTROL FIXES === */
    .form-control, .form-select { background: #0f172a; border: 1px solid #334155; color: #e2e8f0; border-radius: 8px; width: 100% !important; height: auto; min-height: 38px; padding: 8px 12px; }
    .form-control:focus, .form-select:focus { border-color: #0ea5e9; box-shadow: 0 0 0 0.2rem rgba(14,165,233,0.25); }
    
    /* === VALUE BOX & BADGES === */
    .value-box { border-radius: 12px; border: 1px solid #334155; }
    .stat-badge { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 6px 12px; display: flex; align-items: center; gap: 8px; flex: 1; min-width: 100px; }
    .stat-badge .stat-icon { font-size: 14px; color: #64748b; }
    .stat-badge .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-badge .stat-value { font-size: 16px; font-weight: 700; color: #e2e8f0; }
    
    /* === TABLE FIXES === */
    table.dataTable { color: #e2e8f0 !important; }
    table.dataTable thead th { background: #0f172a !important; color: #e2e8f0 !important; border-bottom: 1px solid #293548 !important; font-weight: 600; font-size: 13px; padding: 8px 12px !important; }
    table.dataTable tbody td { border-bottom: 1px solid #293548 !important; color: #e2e8f0 !important; padding: 6px 12px !important; }
    table.dataTable tbody tr:hover td { background: #172033 !important; }
    table.dataTable tbody tr.odd { background-color: rgba(15,23,42,0.3) !important; }
    table.dataTable tbody tr.odd:hover { background-color: #172033 !important; }
    .dataTables_wrapper .dataTables_length, .dataTables_wrapper .dataTables_filter, .dataTables_wrapper .dataTables_info, .dataTables_wrapper .dataTables_paginate { color: #94a3b8 !important; }
    .dataTables_wrapper .dataTables_paginate .paginate_button { color: #94a3b8 !important; }
    .dataTables_wrapper .dataTables_paginate .paginate_button.current { background: #0ea5e9 !important; color: #fff !important; border: none; }
    .dataTables_scrollHead { border-bottom: 1px solid #293548 !important; }
    .dataTables_scrollBody { overflow-x: auto !important; overflow-y: auto !important; }
    .dataTables_scrollHeadInner { width: 100% !important; }
    
    /* === TAB & NAV FIXES === */
    .tab-content { padding-top: 12px; }
    .nav-tabs .nav-link { color: #94a3b8; border: none; border-bottom: 2px solid transparent; }
    .nav-tabs .nav-link:hover { color: #e2e8f0; border-bottom-color: #334155; }
    .nav-tabs .nav-link.active { color: #0ea5e9; background: transparent; border-bottom-color: #0ea5e9; }
    hr { border-color: #334155; }
    .text-muted { color: #64748b !important; }
    textarea { width: 100% !important; box-sizing: border-box; }
    .plotly { width: 100% !important; }
    
    /* === UPLOAD DROP ZONE === */
    .upload-zone { border: 2px dashed #334155; border-radius: 12px; padding: 24px; text-align: center; transition: all 0.2s ease; cursor: pointer; }
    .upload-zone:hover { border-color: #0ea5e9; background: #0f172a; }
    .upload-zone.has-file { border-color: #10b981; background: #064e3b; }
    .upload-zone .btn-file { background: transparent; border: none; color: #94a3b8; }
    
    /* === SHEET TABS === */
    .sheet-tabs { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
    .sheet-tab { background: #0f172a; border: 1px solid #334155; color: #94a3b8; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.15s ease; }
    .sheet-tab:hover { background: #1e293b; color: #e2e8f0; }
    .sheet-tab.active { background: linear-gradient(135deg, #0ea5e9, #38bdf8); color: #fff; border-color: transparent; font-weight: 600; }
    
    /* === PREVIEW TABLE === */
    .preview-container { width: 100%; overflow-y: auto; overflow-x: auto; }
    .preview-container .dataTables_wrapper { width: 100% !important; }
    .preview-container table.dataTable { table-layout: fixed !important; width: 100% !important; }
    .preview-container table.dataTable th { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .preview-container table.dataTable td { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .preview-card .card-body { padding: 12px 0 0 0 !important; }
    .preview-card .card-body > div { padding: 0 12px; }
    
    /* === PROGRESS BAR === */
    .shiny-file-input-progress { display: none; }
    
    /* === NO-DATA WARNING === */
    .no-data-warning { text-align: center; padding: 60px 20px; color: #64748b; }
    .no-data-warning .fa-3x { margin-bottom: 16px; }
    
    /* === NOTIFICATION & MODAL SOLID BG === */
    .shiny-notification { background: #1e293b !important; color: #e2e8f0 !important; border: 1px solid #334155 !important; border-radius: 8px; opacity: 1 !important; z-index: 9999; }
    .shiny-notification-close { color: #94a3b8 !important; }
    .modal-content { background: #1e293b !important; color: #e2e8f0 !important; border: 1px solid #334155; }
    .modal-backdrop { opacity: 0.8 !important; }
    
    /* === OUTLIER SUMMARY === */
    .outlier-stat-card { margin-bottom: 8px; padding: 8px 10px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; }
    
    /* === TAB ISOLATION === */
    .shinyjs-hide { display: none !important; }
    .tab-pane { position: relative; }
    
    /* === CLEANING TAB === */
    .cleaning-card { background: #1a1f2c !important; border: 1px solid #334155; position: relative; }
    .cleaning-card .card-body { background: #1a1f2c !important; }
    .cleaning-table-container { width: 100%; overflow: hidden; }
    .cleaning-table-container .dataTables_wrapper { width: 100% !important; }
    .cleaning-table-container table.dataTable { table-layout: fixed !important; width: 100% !important; }
    .cleaning-table-container .dataTables_scroll { overflow: hidden; }
    .cleaning-table-container .dataTables_filter { float: none; text-align: left; margin-bottom: 12px; padding: 0 4px; }
    .cleaning-table-container .dataTables_filter input { background: #0f172a; border: 1px solid #334155; color: #e2e8f0; border-radius: 6px; padding: 4px 8px; }
    .cleaning-actions { margin-bottom: 10px; }
    .cleaning-actions .btn { margin-bottom: 10px; }
    
    /* === HYPOTHESIS TAB === */
    .hypothesis-card { background: #1a1f2c !important; border: 1px solid #334155; position: relative; }
    .hypothesis-card .card-body { background: #1a1f2c !important; }
    .hypothesis-table-container { width: 100%; overflow: hidden; }
    .hypothesis-table-container .dataTables_wrapper { width: 100% !important; }
    .hypothesis-table-container table.dataTable { table-layout: fixed !important; width: 100% !important; }
  "))),
  
  # ---- TAB: HYPOTHESIS TESTING ----
  conditionalPanel(
    condition = "input.tabs == 'hypothesis'",
    style = "position: relative; z-index: 1;",
    uiOutput("hypothesis_no_data"),
    conditionalPanel(
      condition = "input.hypothesis_value_col != null || input.hypothesis_cat1 != null",
      layout_columns(
        col_widths = c(3, 9),
        card(
          class = "hypothesis-card",
          card_header(tags$span(icon("flask"), " Test Configuration")),
          selectInput("hypothesis_test_type", "Select Test",
                      choices = c(
                        "Normality Check" = "normality",
                        "Independent T-test" = "ttest_ind",
                        "Paired T-test" = "ttest_paired",
                        "Chi-square Test" = "chisq",
                        "Correlation Heatmap" = "correlation"
                      ), selected = "normality"),
          conditionalPanel(
            condition = "input.hypothesis_test_type == 'normality'",
            selectInput("hypothesis_value_col", "Numeric Variable", choices = NULL)
          ),
          conditionalPanel(
            condition = "input.hypothesis_test_type == 'ttest_ind'",
            selectInput("ttest_value_col", "Numeric Variable", choices = NULL),
            selectInput("ttest_group_col", "Grouping Variable (2 levels)", choices = NULL)
          ),
          conditionalPanel(
            condition = "input.hypothesis_test_type == 'ttest_paired'",
            selectInput("ttest_before", "Before Measurement", choices = NULL),
            selectInput("ttest_after", "After Measurement", choices = NULL)
          ),
          conditionalPanel(
            condition = "input.hypothesis_test_type == 'chisq'",
            selectInput("chisq_var1", "Variable 1", choices = NULL),
            selectInput("chisq_var2", "Variable 2", choices = NULL)
          ),
          conditionalPanel(
            condition = "input.hypothesis_test_type == 'correlation'",
            selectInput("corr_cols", "Select Numeric Variables", choices = NULL, multiple = TRUE)
          ),
          actionButton("run_hypothesis", "Run Test",
                       icon = icon("play"), class = "btn-primary w-100 mt-2")
        ),
        card(
          class = "hypothesis-card",
          card_header(tags$span(icon("chart-bar"), " Results")),
          full_screen = TRUE,
          uiOutput("hypothesis_summary"),
          tags$hr(),
          navset_card_tab(
            nav_panel("Summary Table", DT::dataTableOutput("hypothesis_table")),
            nav_panel("Visualization", plotlyOutput("hypothesis_plot", height = "500px"))
          )
        )
      )
    )
  ),
  
  # ---- TAB: DATA IMPORT ----
  conditionalPanel(
    condition = "input.tabs == 'import'",
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
        class = "preview-card",
        uiOutput("data_summary_info"),
        uiOutput("sheet_tabs_ui"),
        tags$div(class = "preview-container", style = "height: calc(100vh - 280px); min-height: 300px;",
                 DT::dataTableOutput("preview_table", width = "100%", height = "100%")
        )
      )
    )
  ),
  
  # ---- TAB: OUTLIER DETECTION ----
  conditionalPanel(
    condition = "input.tabs == 'outliers'",
    style = "position: relative; z-index: 1;",
    uiOutput("outlier_no_data"),
    conditionalPanel(
      condition = "input.outlier_cols != null && input.outlier_cols != ''",
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
    )
  ),
  
  # ---- TAB: ANOVA ANALYSIS ----
  conditionalPanel(
    condition = "input.tabs == 'anova'",
    style = "position: relative; z-index: 1;",
    uiOutput("anova_no_data"),
    conditionalPanel(
      condition = "input.anova_value_col != null && input.anova_value_col != ''",
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
    )
  ),
  
  # ---- TAB: DATA CLEANING ----
  conditionalPanel(
    condition = "input.tabs == 'cleaning'",
    style = "position: relative; z-index: 2;",
    uiOutput("cleaning_no_data"),
    conditionalPanel(
      condition = "input.clean_cols != null && input.clean_cols != ''",
      layout_columns(
        col_widths = c(4, 8),
        card(
          class = "cleaning-card",
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
                       icon = icon("wand-magic-sparkles"), class = "btn-warning w-100 mb-3"),
          tags$hr(),
          tags$h6("Export Cleaned Data"),
          tags$div(class = "cleaning-actions",
            downloadButton("download_csv", "Download CSV", class = "btn-success w-100 mb-2"),
            downloadButton("download_xlsx", "Download Excel", class = "btn-primary w-100 mb-2")
          ),
          tags$hr(),
          uiOutput("cleaning_summary")
        ),
        card(
          class = "cleaning-card",
          card_header(tags$span(icon("table"), " Cleaned Data Preview")),
          tags$div(class = "cleaning-table-container",
            DT::dataTableOutput("cleaned_table", width = "100%", height = "100%")
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
  
  # ---- NO-DATA WARNINGS ----
  output$outlier_no_data <- renderUI({
    req(is.null(raw_data()))
    tags$div(class = "no-data-warning",
             tags$div(icon("file-circle-question", class = "fa-3x")),
             tags$h4("No Data Loaded"),
             tags$p("Import data first using the Data Import tab.")
    )
  })
  
  output$anova_no_data <- renderUI({
    req(is.null(raw_data()))
    tags$div(class = "no-data-warning",
             tags$div(icon("file-circle-question", class = "fa-3x")),
             tags$h4("No Data Loaded"),
             tags$p("Import data first using the Data Import tab.")
    )
  })
  
  output$hypothesis_no_data <- renderUI({
    req(is.null(raw_data()))
    tags$div(class = "no-data-warning",
             tags$div(icon("file-circle-question", class = "fa-3x")),
             tags$h4("No Data Loaded"),
             tags$p("Import data first using the Data Import tab.")
    )
  })
  
  output$cleaning_no_data <- renderUI({
    req(is.null(raw_data()))
    tags$div(class = "no-data-warning",
             tags$div(icon("file-circle-question", class = "fa-3x")),
             tags$h4("No Data Loaded"),
             tags$p("Import data first using the Data Import tab.")
    )
  })
  
  # Reactive: raw uploaded data
  raw_data <- reactiveVal(NULL)
  
  # Reactive: cleaned data
  cleaned_data <- reactiveVal(NULL)
  
  # Reactive: outlier detection results
  outlier_results <- reactiveVal(NULL)
  
  # Reactive: ANOVA results
  anova_results <- reactiveVal(NULL)
  
  # Reactive: Hypothesis test results
  hypothesis_results <- reactiveVal(NULL)
  
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
    all_cols <- names(data)
    
    updateSelectInput(session, "outlier_cols", choices = num_cols, selected = num_cols[1:min(3, length(num_cols))])
    updateSelectInput(session, "clean_cols", choices = num_cols, selected = num_cols[1:min(3, length(num_cols))])
    updateSelectInput(session, "anova_value_col", choices = num_cols, selected = num_cols[1])
    updateSelectInput(session, "anova_group_col", choices = c(fac_cols, num_cols), selected = if (length(fac_cols) > 0) fac_cols[length(fac_cols)] else num_cols[1])
    
    # Hypothesis testing inputs
    updateSelectInput(session, "hypothesis_value_col", choices = num_cols, selected = if (length(num_cols) > 0) num_cols[1] else NULL)
    updateSelectInput(session, "ttest_value_col", choices = num_cols, selected = if (length(num_cols) > 0) num_cols[1] else NULL)
    updateSelectInput(session, "ttest_group_col", choices = c(fac_cols, num_cols), selected = if (length(fac_cols) > 0) fac_cols[1] else if (length(num_cols) > 0) num_cols[1] else NULL)
    updateSelectInput(session, "ttest_before", choices = num_cols, selected = if (length(num_cols) > 0) num_cols[1] else NULL)
    updateSelectInput(session, "ttest_after", choices = num_cols, selected = if (length(num_cols) > 1) num_cols[2] else if (length(num_cols) > 0) num_cols[1] else NULL)
    updateSelectInput(session, "chisq_var1", choices = all_cols, selected = if (length(all_cols) > 0) all_cols[1] else NULL)
    updateSelectInput(session, "chisq_var2", choices = all_cols, selected = if (length(all_cols) > 1) all_cols[2] else if (length(all_cols) > 0) all_cols[1] else NULL)
    updateSelectInput(session, "corr_cols", choices = num_cols, selected = num_cols[1:min(4, length(num_cols))])
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
  output$preview_table <- DT::renderDataTable({
    req(sheets_data(), active_sheet())
    df <- sheets_data()[[active_sheet()]]
    req(df)
    DT::datatable(
      df,
      options = list(
        scrollX = TRUE,
        scrollY = "calc(100vh - 360px)",
        scrollCollapse = TRUE,
        paging = FALSE,
        autoWidth = FALSE,
        searching = TRUE,
        info = FALSE,
        ordering = TRUE,
        columnDefs = list(list(width = "120px", targets = "_all"))
      ),
      class = "compact row-border",
      rownames = TRUE,
      fillContainer = TRUE,
      style = "default",
      selection = "none"
    )
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
    req(outlier_results(), raw_data())
    results <- outlier_results()
    data <- raw_data()
    cols <- sapply(results, function(r) r$column)
    if (length(cols) == 0) return(NULL)
    
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
        axis.title.x = ggplot2::element_blank(),
        plot.title = ggplot2::element_text(color = "#e2e8f0"),
        axis.text = ggplot2::element_text(color = "#94a3b8"),
        axis.title = ggplot2::element_text(color = "#94a3b8")
      ) +
      ggplot2::labs(y = "Value", title = "Distribution & Outliers by Parameter") +
      ggplot2::scale_fill_brewer(palette = "Set2")
    
    plotly::ggplotly(p, tooltip = c("x", "y")) %>%
      plotly::layout(hoverlabel = list(bgcolor = "#1e293b", font = list(color = "#e2e8f0")))
  })
  
  # Outlier summary
  output$outlier_summary_box <- renderUI({
    req(outlier_results())
    results <- outlier_results()
    
    total_outliers <- sum(sapply(results, function(r) r$n_outliers))
    
    alert_color <- if (total_outliers == 0) "#10b981" else "#ef4444"
    alert_icon <- if (total_outliers == 0) "circle-check" else "exclamation-circle"
    alert_text <- if (total_outliers == 0) "No outliers detected" else paste(total_outliers, "outliers found")
    
    tags$div(
      tags$h4(style = paste0("color:", alert_color, ";"), icon(alert_icon), alert_text),
      tags$hr(),
      lapply(results, function(r) {
        tags$div(
          class = "outlier-stat-card",
          tags$strong(r$column),
          tags$br(),
          tags$span(style = "font-size: 12px; color: #94a3b8;",
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
    
    dt <- DT::datatable(
      detail_df,
      options = list(pageLength = 10, dom = "frtip"),
      class = "compact row-border",
      rownames = FALSE
    )
    
    if ("Status" %in% colnames(detail_df)) {
      dt <- dt %>%
        DT::formatStyle("Status",
                         backgroundColor = DT::styleEqual(
                           c("Below Lower", "Above Upper"),
                           c("#451a1a", "#422006")
                         ))
    }
    dt
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
  
  # ---- HYPOTHESIS TESTING ----
  observeEvent(input$run_hypothesis, {
    req(raw_data())
    data <- raw_data()
    test_type <- input$hypothesis_test_type
    
    result <- tryCatch({
      if (test_type == "normality") {
        req(input$hypothesis_value_col)
        x <- data[[input$hypothesis_value_col]]
        sw <- run_shapiro_test(x)
        list(
          type = "normality",
          test_name = "Shapiro-Wilk Normality Test",
          variable = input$hypothesis_value_col,
          statistic = sw$statistic,
          df = length(x[!is.na(x)]),
          p_value = sw$p_value,
          interpretation = if (is.na(sw$p_value)) "N/A" else if (sw$is_normal) "Data appears normally distributed (p > 0.05)" else "Data deviates from normality (p <= 0.05)",
          is_significant = !sw$is_normal,
          plot = make_qq_plot(x, paste("Q-Q Plot:", input$hypothesis_value_col))
        )
      } else if (test_type == "ttest_ind") {
        req(input$ttest_value_col, input$ttest_group_col)
        res <- run_ttest_independent(data, input$ttest_value_col, input$ttest_group_col)
        list(
          type = "ttest_ind",
          test_name = res$method,
          variable = input$ttest_value_col,
          group = input$ttest_group_col,
          statistic = res$statistic,
          df = res$df,
          p_value = res$p_value,
          interpretation = if (res$p_value < 0.05) "Significant difference between groups" else "No significant difference between groups",
          is_significant = res$p_value < 0.05,
          levene_p = res$levene_p,
          mean_g1 = res$mean_g1,
          mean_g2 = res$mean_g2,
          g1_name = res$g1_name,
          g2_name = res$g2_name,
          plot_data = data %>% dplyr::select(dplyr::all_of(c(input$ttest_value_col, input$ttest_group_col))) %>% tidyr::drop_na()
        )
      } else if (test_type == "ttest_paired") {
        req(input$ttest_before, input$ttest_after)
        res <- run_ttest_paired(data, input$ttest_before, input$ttest_after)
        list(
          type = "ttest_paired",
          test_name = res$method,
          before = input$ttest_before,
          after = input$ttest_after,
          statistic = res$statistic,
          df = res$df,
          p_value = res$p_value,
          interpretation = if (res$p_value < 0.05) "Significant difference between before/after" else "No significant difference between before/after",
          is_significant = res$p_value < 0.05,
          mean_before = res$mean_before,
          mean_after = res$mean_after,
          plot_data = data %>% dplyr::select(dplyr::all_of(c(input$ttest_before, input$ttest_after))) %>% tidyr::drop_na()
        )
      } else if (test_type == "chisq") {
        req(input$chisq_var1, input$chisq_var2)
        res <- run_chi_square(data, input$chisq_var1, input$chisq_var2)
        list(
          type = "chisq",
          test_name = res$method,
          var1 = input$chisq_var1,
          var2 = input$chisq_var2,
          statistic = res$statistic,
          df = res$df,
          p_value = res$p_value,
          interpretation = if (res$p_value < 0.05) "Variables are significantly associated" else "No significant association between variables",
          is_significant = res$p_value < 0.05,
          observed = res$observed,
          expected = res$expected
        )
      } else if (test_type == "correlation") {
        req(input$corr_cols)
        res <- run_correlation(data, input$corr_cols)
        list(
          type = "correlation",
          test_name = "Pearson Correlation Matrix",
          variables = input$corr_cols,
          cor_matrix = res$correlation,
          p_matrix = res$p_values
        )
      }
    }, error = function(e) {
      showNotification(paste("Test error:", e$message), type = "error")
      NULL
    })
    
    hypothesis_results(result)
    if (!is.null(result)) {
      showNotification(paste(result$test_name, "complete!"), type = "message")
    }
  })
  
  output$hypothesis_summary <- renderUI({
    req(hypothesis_results())
    res <- hypothesis_results()
    
    sig_color <- if (res$is_significant) "#ef4444" else "#10b981"
    sig_icon <- if (res$is_significant) "circle-xmark" else "circle-check"
    
    tags$div(
      style = "display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;",
      tags$div(class = "stat-badge",
               tags$span(class = "stat-icon", icon("vial")),
               tags$div(tags$div(class = "stat-label", "Test"),
                        tags$div(class = "stat-value", style = "font-size: 13px;", res$test_name))),
      tags$div(class = "stat-badge",
               tags$span(class = "stat-icon", icon("chart-line")),
               tags$div(tags$div(class = "stat-label", "Statistic"),
                        tags$div(class = "stat-value", if (!is.null(res$statistic)) round(res$statistic, 3) else "N/A"))),
      tags$div(class = "stat-badge",
               tags$span(class = "stat-icon", icon("hashtag")),
               tags$div(tags$div(class = "stat-label", "df"),
                        tags$div(class = "stat-value", if (!is.null(res$df)) res$df else "N/A"))),
      tags$div(class = "stat-badge",
               tags$span(class = "stat-icon", icon(sig_icon)),
               tags$div(tags$div(class = "stat-label", "P-value"),
                        tags$div(class = "stat-value", style = paste0("color:", sig_color, ";"), if (!is.null(res$p_value)) formatC(res$p_value, format = "e", digits = 2) else "N/A")))
    )
  })
  
  output$hypothesis_table <- DT::renderDataTable({
    req(hypothesis_results())
    res <- hypothesis_results()
    
    df <- data.frame(
      Metric = c("Test", "Variable(s)", "Statistic", "df", "P-value", "Interpretation"),
      Value = c(
        res$test_name,
        if (!is.null(res$variable)) res$variable else if (!is.null(res$variables)) paste(res$variables, collapse = ", ") else paste(res$var1, "vs", res$var2),
        if (!is.null(res$statistic)) round(res$statistic, 4) else "N/A",
        if (!is.null(res$df)) as.character(res$df) else "N/A",
        if (!is.null(res$p_value)) formatC(res$p_value, format = "e", digits = 3) else "N/A",
        res$interpretation
      ),
      stringsAsFactors = FALSE
    )
    
    DT::datatable(df, options = list(dom = "t", ordering = FALSE), rownames = FALSE, class = "compact row-border") %>%
      DT::formatStyle("Value", color = "#e2e8f0")
  })
  
  output$hypothesis_plot <- renderPlotly({
    req(hypothesis_results())
    res <- hypothesis_results()
    
    if (res$type == "normality") {
      plotly::ggplotly(res$plot, tooltip = c("x", "y")) %>%
        plotly::layout(hoverlabel = list(bgcolor = "#1e293b", font = list(color = "#e2e8f0")))
    } else if (res$type == "ttest_ind") {
      pd <- res$plot_data
      colnames(pd) <- c("Value", "Group")
      p <- ggplot2::ggplot(pd, ggplot2::aes(x = Group, y = Value, fill = Group)) +
        ggplot2::geom_violin(alpha = 0.5, color = NA) +
        ggplot2::geom_boxplot(alpha = 0.7, width = 0.2, outlier.colour = "#ef4444", outlier.size = 2) +
        ggplot2::geom_jitter(width = 0.1, alpha = 0.3, size = 1.5, color = "#e2e8f0") +
        ggplot2::theme_minimal(base_size = 13) +
        ggplot2::theme(
          legend.position = "none",
          plot.background = ggplot2::element_rect(fill = "#1e293b", color = NA),
          panel.background = ggplot2::element_rect(fill = "#1e293b", color = NA),
          plot.title = ggplot2::element_text(color = "#e2e8f0"),
          axis.text = ggplot2::element_text(color = "#94a3b8"),
          axis.title = ggplot2::element_text(color = "#94a3b8"),
          panel.grid.major = ggplot2::element_line(color = "#334155"),
          panel.grid.minor = ggplot2::element_line(color = "#1e293b")
        ) +
        ggplot2::labs(title = paste("Distribution by Group:", res$variable), y = res$variable)
      plotly::ggplotly(p, tooltip = c("x", "y")) %>%
        plotly::layout(hoverlabel = list(bgcolor = "#1e293b", font = list(color = "#e2e8f0")))
    } else if (res$type == "ttest_paired") {
      pd <- res$plot_data
      colnames(pd) <- c("Before", "After")
      pd_long <- tidyr::pivot_longer(pd, cols = dplyr::everything(), names_to = "Time", values_to = "Value")
      p <- ggplot2::ggplot(pd_long, ggplot2::aes(x = Time, y = Value, fill = Time)) +
        ggplot2::geom_violin(alpha = 0.5, color = NA) +
        ggplot2::geom_boxplot(alpha = 0.7, width = 0.2, outlier.colour = "#ef4444", outlier.size = 2) +
        ggplot2::geom_jitter(width = 0.1, alpha = 0.3, size = 1.5, color = "#e2e8f0") +
        ggplot2::theme_minimal(base_size = 13) +
        ggplot2::theme(
          legend.position = "none",
          plot.background = ggplot2::element_rect(fill = "#1e293b", color = NA),
          panel.background = ggplot2::element_rect(fill = "#1e293b", color = NA),
          plot.title = ggplot2::element_text(color = "#e2e8f0"),
          axis.text = ggplot2::element_text(color = "#94a3b8"),
          axis.title = ggplot2::element_text(color = "#94a3b8"),
          panel.grid.major = ggplot2::element_line(color = "#334155"),
          panel.grid.minor = ggplot2::element_line(color = "#1e293b")
        ) +
        ggplot2::labs(title = "Paired Comparison", y = "Value")
      plotly::ggplotly(p, tooltip = c("x", "y")) %>%
        plotly::layout(hoverlabel = list(bgcolor = "#1e293b", font = list(color = "#e2e8f0")))
    } else if (res$type == "chisq") {
      obs <- res$observed
      obs$Var1 <- rownames(obs)
      obs_long <- tidyr::pivot_longer(obs, cols = -Var1, names_to = "Var2", values_to = "Count")
      p <- ggplot2::ggplot(obs_long, ggplot2::aes(x = Var1, y = Count, fill = Var2)) +
        ggplot2::geom_bar(stat = "identity", position = "dodge", alpha = 0.8, color = NA) +
        ggplot2::theme_minimal(base_size = 13) +
        ggplot2::theme(
          plot.background = ggplot2::element_rect(fill = "#1e293b", color = NA),
          panel.background = ggplot2::element_rect(fill = "#1e293b", color = NA),
          plot.title = ggplot2::element_text(color = "#e2e8f0"),
          axis.text = ggplot2::element_text(color = "#94a3b8"),
          axis.title = ggplot2::element_text(color = "#94a3b8"),
          legend.text = ggplot2::element_text(color = "#94a3b8"),
          legend.title = ggplot2::element_text(color = "#94a3b8"),
          panel.grid.major = ggplot2::element_line(color = "#334155"),
          panel.grid.minor = ggplot2::element_line(color = "#1e293b")
        ) +
        ggplot2::labs(title = paste("Grouped Bar Chart:", res$var1, "vs", res$var2), x = res$var1, fill = res$var2) +
        ggplot2::scale_fill_brewer(palette = "Set2")
      plotly::ggplotly(p, tooltip = c("x", "y", "fill")) %>%
        plotly::layout(hoverlabel = list(bgcolor = "#1e293b", font = list(color = "#e2e8f0")))
    } else if (res$type == "correlation") {
      cor_df <- as.data.frame(res$cor_matrix)
      cor_df$Var1 <- rownames(cor_df)
      cor_long <- tidyr::pivot_longer(cor_df, cols = -Var1, names_to = "Var2", values_to = "Correlation")
      p <- ggplot2::ggplot(cor_long, ggplot2::aes(x = Var1, y = Var2, fill = Correlation)) +
        ggplot2::geom_tile(color = "#334155", size = 0.5) +
        ggplot2::geom_text(ggplot2::aes(label = round(Correlation, 2)), color = "#e2e8f0", size = 3.5) +
        ggplot2::scale_fill_gradient2(low = "#ef4444", mid = "#1e293b", high = "#10b981", midpoint = 0, limits = c(-1, 1)) +
        ggplot2::theme_minimal(base_size = 13) +
        ggplot2::theme(
          plot.background = ggplot2::element_rect(fill = "#1e293b", color = NA),
          panel.background = ggplot2::element_rect(fill = "#1e293b", color = NA),
          plot.title = ggplot2::element_text(color = "#e2e8f0"),
          axis.text = ggplot2::element_text(color = "#94a3b8"),
          axis.title = ggplot2::element_text(color = "#94a3b8"),
          legend.text = ggplot2::element_text(color = "#94a3b8"),
          legend.title = ggplot2::element_text(color = "#94a3b8"),
          panel.grid = ggplot2::element_blank()
        ) +
        ggplot2::labs(title = "Correlation Heatmap", x = NULL, y = NULL)
      plotly::ggplotly(p, tooltip = c("x", "y", "fill")) %>%
        plotly::layout(hoverlabel = list(bgcolor = "#1e293b", font = list(color = "#e2e8f0")))
    }
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
    df <- cleaned_data()
    DT::datatable(
      df,
      options = list(
        scrollX = TRUE,
        scrollY = "calc(100vh - 400px)",
        scrollCollapse = TRUE,
        paging = FALSE,
        autoWidth = FALSE,
        searching = TRUE,
        info = FALSE,
        ordering = TRUE,
        columnDefs = list(list(width = "120px", targets = "_all"))
      ),
      class = "compact row-border",
      rownames = TRUE,
      fillContainer = TRUE,
      style = "default",
      selection = "none"
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
