use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

// ============================================================================
// Bash
// ============================================================================

#[derive(Serialize, Deserialize)]
pub struct BashResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[tauri::command]
pub fn execute_bash(command: String, working_dir: Option<String>, timeout_secs: Option<u64>) -> Result<BashResult, String> {
    let timeout = Duration::from_secs(timeout_secs.unwrap_or(30));
    let cwd = working_dir
        .map(PathBuf::from)
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")));

    let child = Command::new("bash")
        .arg("-c")
        .arg(&command)
        .current_dir(&cwd)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let output = child.wait_with_output().map_err(|e| e.to_string())?;

    Ok(BashResult {
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

// ============================================================================
// File I/O
// ============================================================================

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("{}: {}", path, e))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

// ============================================================================
// Search files (grep)
// ============================================================================

#[tauri::command]
pub fn search_files(pattern: String, path: String, recursive: Option<bool>) -> Result<String, String> {
    let recursive = recursive.unwrap_or(true);
    let mut cmd = Command::new("grep");
    cmd.arg("-En");
    if recursive { cmd.arg("-r"); }
    cmd.arg("--include=*").arg(&pattern).arg(&path);

    let output = cmd.output().map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).into_owned();

    if !stderr.is_empty() && stdout.is_empty() {
        return Err(stderr);
    }
    // Cap output to avoid flooding context
    let lines: Vec<&str> = stdout.lines().take(200).collect();
    Ok(lines.join("\n"))
}

// ============================================================================
// List directory
// ============================================================================

#[derive(Serialize, Deserialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<i64>,
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let entries = fs::read_dir(&path).map_err(|e| format!("{}: {}", path, e))?;
    let mut result: Vec<DirEntry> = entries
        .filter_map(|e| e.ok())
        .map(|e| {
            let metadata = e.metadata().ok();
            let modified = metadata.as_ref().and_then(|m| {
                m.modified().ok().and_then(|t| {
                    t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_millis() as i64)
                })
            });
            let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
            let is_dir = metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false);
            DirEntry {
                name: e.file_name().to_string_lossy().into_owned(),
                path: e.path().to_string_lossy().into_owned(),
                is_dir,
                size,
                modified,
            }
        })
        .collect();
    result.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(result)
}
