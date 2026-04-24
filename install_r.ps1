# Install R and RStudio automatically on Windows
# Run as Administrator in PowerShell

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EnviroAnalyzer - R Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "WARNING: Not running as Administrator. Install may fail." -ForegroundColor Yellow
    Write-Host "Right-click PowerShell -> Run as Administrator" -ForegroundColor Yellow
}

# Create temp directory
$tempDir = "$env:TEMP\r-install"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Download R
$rVersion = "4.4.2"
$rUrl = "https://cran.r-project.org/bin/windows/base/R-$rVersion-win.exe"
$rInstaller = "$tempDir\R-installer.exe"

Write-Host "`nDownloading R $rVersion..." -ForegroundColor Green
Invoke-WebRequest -Uri $rUrl -OutFile $rInstaller -UseBasicParsing

# Install R silently
Write-Host "Installing R..." -ForegroundColor Green
Start-Process -FilePath $rInstaller -ArgumentList "/SILENT","/SUPPRESSMSGBOXES","/SP-" -Wait

# Add R to PATH
$rPath = "C:\Program Files\R\R-$rVersion\bin"
if (Test-Path $rPath) {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($currentPath -notlike "*$rPath*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$rPath", "Machine")
        Write-Host "Added R to system PATH" -ForegroundColor Green
    }
}

# Download RStudio
$studioUrl = "https://download1.rstudio.org/electron/windows/RStudio-2024.12.1-563.exe"
$studioInstaller = "$tempDir\RStudio-installer.exe"

Write-Host "`nDownloading RStudio..." -ForegroundColor Green
Invoke-WebRequest -Uri $studioUrl -OutFile $studioInstaller -UseBasicParsing

# Install RStudio silently
Write-Host "Installing RStudio..." -ForegroundColor Green
Start-Process -FilePath $studioInstaller -ArgumentList "/S" -Wait

# Install required R packages
Write-Host "`nInstalling R packages..." -ForegroundColor Green
$packages = @("shiny","shinydashboard","shinyWidgets","DT","rhandsontable","dplyr","tidyr","ggplot2","plotly","readxl","writexl","broom","httr","jsonlite")

$rscript = "C:\Program Files\R\R-$rVersion\bin\Rscript.exe"
if (Test-Path $rscript) {
    $pkgScript = "$tempDir\install_pkgs.R"
    @"
pkgs <- c('$($packages -join "','")')
install_if_missing <- function(pkg) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    cat("Installing:", pkg, "\n")
    install.packages(pkg, repos = "https://cloud.r-project.org", quiet = TRUE)
  } else {
    cat(pkg, "already installed\n")
  }
}
invisible(lapply(pkgs, install_if_missing))
cat("\nAll packages done!\n")
"@ | Set-Content $pkgScript

    & $rscript $pkgScript
} else {
    Write-Host "Rscript not found. Packages not installed." -ForegroundColor Red
}

# Cleanup
Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "R:        C:\Program Files\R\R-$rVersion\" -ForegroundColor Cyan
Write-Host "RStudio:  Start Menu -> RStudio" -ForegroundColor Cyan
Write-Host "`nRun app:  shiny::runApp('$PWD')" -ForegroundColor Yellow
Write-Host "`nRestart PowerShell to refresh PATH" -ForegroundColor Yellow
