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

fn log_msg(msg: &str) {
    eprintln!("{}", msg);
}

fn find_rscript() -> Option<PathBuf> {
    log_msg("[DEBUG] find_rscript called");
    let program_files = vec![
        "C:\\Program Files\\R",
        "C:\\Program Files (x86)\\R",
    ];

    for base in &program_files {
        log_msg(&format!("[DEBUG] Checking base dir: {}", base));
        if let Ok(entries) = std::fs::read_dir(base) {
            let mut versions: Vec<_> = entries
                .filter_map(|e| e.ok())
                .filter(|e| e.file_name().to_string_lossy().starts_with("R-"))
                .collect();

            versions.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
            log_msg(&format!("[DEBUG] Found {} versions", versions.len()));

            if let Some(latest) = versions.first() {
                log_msg(&format!("[DEBUG] Latest: {}", latest.file_name().to_string_lossy()));
                let rscript = latest.path().join("bin").join("x64").join("Rscript.exe");
                log_msg(&format!("[DEBUG] x64 path: {} exists={}", rscript.display(), rscript.exists()));
                if rscript.exists() {
                    log_msg(&format!("[DEBUG] Returning: {}", rscript.display()));
                    return Some(rscript);
                }
                let rscript2 = latest.path().join("bin").join("Rscript.exe");
                log_msg(&format!("[DEBUG] bin path: {} exists={}", rscript2.display(), rscript2.exists()));
                if rscript2.exists() {
                    log_msg(&format!("[DEBUG] Returning: {}", rscript2.display()));
                    return Some(rscript2);
                }
            }
        }
    }

    let direct = PathBuf::from("C:\\Program Files\\R\\R-4.5.2\\bin\\x64\\Rscript.exe");
    log_msg(&format!("[DEBUG] Direct path: {} exists={}", direct.display(), direct.exists()));
    if direct.exists() {
        return Some(direct);
    }

    log_msg("[DEBUG] find_rscript returning None");
    None
}

fn find_scripts_dir(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    let candidates = vec![
        std::env::current_dir().ok().map(|p| p.join("src-tauri").join("scripts")),
        std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.join("..").join("..").join("..").join("scripts"))),
        Some(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("scripts")),
        app_handle.path().resource_dir().ok().map(|p| p.join("scripts")),
    ];

    for candidate in candidates.into_iter().flatten() {
        let normalized = candidate.canonicalize().unwrap_or(candidate.clone());
        log_msg(&format!("[DEBUG] scripts candidate: {} exists={}", normalized.display(), normalized.exists()));
        if normalized.exists() && normalized.is_dir() {
            return Some(normalized);
        }
    }

    None
}

#[tauri::command]
fn run_r_script(
    app_handle: tauri::AppHandle,
    script_name: String,
    args: Vec<String>,
) -> Result<RScriptResult, String> {
    log_msg(&format!("[DEBUG] run_r_script: {}", script_name));
    let scripts_dir = find_scripts_dir(&app_handle)
        .ok_or_else(|| "Could not find scripts directory".to_string())?;

    let script_path = scripts_dir.join(&script_name);
    log_msg(&format!("[DEBUG] script path: {} exists={}", script_path.display(), script_path.exists()));

    if !script_path.exists() {
        return Err(format!(
            "Script not found: {} (searched in: {})",
            script_name,
            scripts_dir.display()
        ));
    }

    let rscript_path = find_rscript()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "Rscript".to_string());
    log_msg(&format!("[DEBUG] rscript path: {}", rscript_path));

    let mut command = Command::new(&rscript_path);
    command.arg("--vanilla");
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
            error: if stderr.is_empty() { None } else { Some(stderr) },
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

    info.push_str("=== R Installation ===\n");
    match find_rscript() {
        Some(p) => info.push_str(&format!("Rscript found: {}\n", p.display())),
        None => info.push_str("Rscript NOT found\n"),
    }

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
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
