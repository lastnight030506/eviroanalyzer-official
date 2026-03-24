use std::process::Command;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Serialize, Deserialize)]
pub struct RScriptResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

/// Find Rscript executable on Windows
fn find_rscript() -> Option<PathBuf> {
    // Try common R installation paths on Windows
    let program_files = vec![
        "C:\\Program Files\\R",
        "C:\\Program Files (x86)\\R",
    ];
    
    for base in program_files {
        if let Ok(entries) = std::fs::read_dir(base) {
            // Get the latest R version
            let mut versions: Vec<_> = entries
                .filter_map(|e| e.ok())
                .filter(|e| e.file_name().to_string_lossy().starts_with("R-"))
                .collect();
            
            // Sort by version (descending)
            versions.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
            
            if let Some(latest) = versions.first() {
                let rscript = latest.path().join("bin").join("Rscript.exe");
                if rscript.exists() {
                    return Some(rscript);
                }
            }
        }
    }
    
    // Fallback: try PATH
    None
}

/// Find the scripts directory, checking multiple possible locations
fn find_scripts_dir(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    // Try multiple locations for scripts directory
    let candidates = vec![
        // Development: relative to current dir
        std::env::current_dir().ok().map(|p| p.join("src-tauri").join("scripts")),
        // Development: relative to executable
        std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.join("..").join("..").join("..").join("scripts"))),
        // Development: hardcoded common dev path
        Some(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("scripts")),
        // Production: resource directory
        app_handle.path().resource_dir().ok().map(|p| p.join("scripts")),
    ];
    
    for candidate in candidates.into_iter().flatten() {
        let normalized = candidate.canonicalize().unwrap_or(candidate.clone());
        if normalized.exists() && normalized.is_dir() {
            return Some(normalized);
        }
    }
    
    None
}

/// Execute an R script from the scripts directory.
/// 
/// # Arguments
/// * `script_name` - Name of the R script file (e.g., "health_check.R")
/// * `args` - Arguments to pass to the script
/// 
/// # Returns
/// * `RScriptResult` with success status, stdout, and stderr
#[tauri::command]
fn run_r_script(
    app_handle: tauri::AppHandle,
    script_name: String,
    args: Vec<String>,
) -> Result<RScriptResult, String> {
    // Find scripts directory
    let scripts_dir = find_scripts_dir(&app_handle)
        .ok_or_else(|| "Could not find scripts directory".to_string())?;

    let script_path = scripts_dir.join(&script_name);

    if !script_path.exists() {
        return Err(format!(
            "Script not found: {} (searched in: {})",
            script_name,
            scripts_dir.display()
        ));
    }

    // Find Rscript executable
    let rscript_path = find_rscript()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "Rscript".to_string());

    // Execute Rscript command
    let mut command = Command::new(&rscript_path);
    command.arg("--vanilla"); // No startup files
    command.arg(&script_path);
    command.args(&args);

    let output = command
        .output()
        .map_err(|e| format!("Failed to execute Rscript at '{}': {}. Is R installed?", rscript_path, e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(RScriptResult {
            success: true,
            output: stdout.trim().to_string(),
            error: if stderr.is_empty() {
                None
            } else {
                Some(stderr)
            },
        })
    } else {
        Ok(RScriptResult {
            success: false,
            output: stdout,
            error: Some(if stderr.is_empty() {
                format!("R script exited with code: {:?}", output.status.code())
            } else {
                stderr
            }),
        })
    }
}

#[tauri::command]
fn debug_r_paths(app_handle: tauri::AppHandle) -> Result<String, String> {
    let mut info = String::new();
    
    // Check R installation
    info.push_str("=== R Installation ===\n");
    match find_rscript() {
        Some(p) => info.push_str(&format!("Rscript found: {}\n", p.display())),
        None => info.push_str("Rscript NOT found in Program Files\n"),
    }
    
    // Check scripts directory
    info.push_str("\n=== Scripts Directory ===\n");
    info.push_str(&format!("Current dir: {:?}\n", std::env::current_dir()));
    info.push_str(&format!("Exe path: {:?}\n", std::env::current_exe()));
    info.push_str(&format!("CARGO_MANIFEST_DIR: {}\n", env!("CARGO_MANIFEST_DIR")));
    
    match find_scripts_dir(&app_handle) {
        Some(p) => {
            info.push_str(&format!("Scripts dir found: {}\n", p.display()));
            if let Ok(entries) = std::fs::read_dir(&p) {
                info.push_str("Contents:\n");
                for entry in entries.flatten() {
                    info.push_str(&format!("  - {}\n", entry.file_name().to_string_lossy()));
                }
            }
        },
        None => info.push_str("Scripts dir NOT found\n"),
    }
    
    Ok(info)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![run_r_script, debug_r_paths])
        .setup(|app| {
            // Setup logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            // Note: Updater plugin is configured in tauri.conf.json
            // It will automatically check for updates on startup in production
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
