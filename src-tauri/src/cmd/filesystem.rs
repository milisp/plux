use std::fs;
use std::path::Path;
use std::process::Command;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use anyhow::Result;
use pdf_extract::extract_text;
use csv::Reader;
use calamine::{open_workbook, Reader as CalamineReader, Xlsx, Data};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub extension: Option<String>,
    pub git_status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatus {
    pub staged: Vec<String>,
    pub modified: Vec<String>,
    pub untracked: Vec<String>,
    pub deleted: Vec<String>,
    pub renamed: Vec<String>,
    pub conflicted: Vec<String>,
}

#[tauri::command]
pub async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let expanded_path = if path.starts_with("~/") {
        let home = dirs::home_dir()
            .ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&path[2..])
    } else {
        Path::new(&path).to_path_buf()
    };
    
    if !expanded_path.exists() || !expanded_path.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let mut entries = Vec::new();
    
    match fs::read_dir(&expanded_path) {
        Ok(dir_entries) => {
            for entry in dir_entries {
                match entry {
                    Ok(entry) => {
                        let path = entry.path();
                        let name = path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Unknown")
                            .to_string();
                        
                        let is_directory = path.is_dir();
                        let size = if is_directory {
                            None
                        } else {
                            fs::metadata(&path).ok().map(|m| m.len())
                        };
                        
                        let extension = if is_directory {
                            None
                        } else {
                            path.extension()
                                .and_then(|ext| ext.to_str())
                                .map(|s| s.to_string())
                        };

                        entries.push(FileEntry {
                            name,
                            path: path.to_string_lossy().to_string(),
                            is_directory,
                            size,
                            extension,
                            git_status: None,
                        });
                    }
                    Err(_) => continue,
                }
            }
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }
    
    // Sort directories first, then files
    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    // Get git status for this directory
    let git_status_map = get_git_status_for_directory(&expanded_path).unwrap_or_default();
    
    // Update entries with git status
    for entry in &mut entries {
        entry.git_status = git_status_map.get(&entry.path).cloned();
    }
    
    Ok(entries)
}

#[tauri::command]
pub async fn get_default_directories() -> Result<Vec<String>, String> {
    let home = dirs::home_dir()
        .ok_or_else(|| "Cannot find home directory".to_string())?;
    
    let default_dirs = vec![
        home.to_string_lossy().to_string(),
        home.join("Documents").to_string_lossy().to_string(),
        home.join("Downloads").to_string_lossy().to_string(),
        home.join("Pictures").to_string_lossy().to_string(),
        home.join("Movies").to_string_lossy().to_string(),
        home.join("Music").to_string_lossy().to_string(),
    ];
    
    Ok(default_dirs)
}

#[tauri::command]
pub async fn read_file(file_path: String) -> Result<String, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir()
            .ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };
    
    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }
    
    // Check file size to prevent reading very large files
    if let Ok(metadata) = fs::metadata(&expanded_path) {
        if metadata.len() > 1024 * 1024 { // 1MB limit
            return Err("File is too large to display".to_string());
        }
    }
    
    match fs::read_to_string(&expanded_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

#[tauri::command]
pub async fn write_file(file_path: String, content: String) -> Result<(), String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir()
            .ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };
    
    // Basic safety check: only allow writing to text files
    let extension = expanded_path.extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase());
    
    let is_text_file = match extension.as_deref() {
        Some("txt") | Some("md") | Some("json") | Some("xml") | Some("yaml") | Some("yml") |
        Some("js") | Some("jsx") | Some("ts") | Some("tsx") | Some("rs") | Some("py") |
        Some("java") | Some("cpp") | Some("c") | Some("h") | Some("css") | Some("html") |
        Some("toml") | Some("cfg") | Some("ini") | Some("sh") | Some("log") => true,
        _ => false,
    };
    
    if !is_text_file {
        return Err("Only text files can be edited".to_string());
    }
    
    match fs::write(&expanded_path, content) {
        Ok(()) => Ok(()),
        Err(e) => Err(format!("Failed to write file: {}", e)),
    }
}

#[tauri::command]
pub async fn read_pdf_content(file_path: String) -> Result<String, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir()
            .ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };
    
    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }
    
    match extract_text(&expanded_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to extract PDF content: {}", e)),
    }
}

#[tauri::command]
pub async fn read_csv_content(file_path: String) -> Result<String, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir()
            .ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };
    
    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }
    
    let file = std::fs::File::open(expanded_path)
        .map_err(|e| format!("Failed to open CSV file: {}", e))?;
    
    let mut reader = Reader::from_reader(file);
    let mut content = String::new();
    
    // Read headers if they exist
    if let Ok(headers) = reader.headers() {
        content.push_str(&headers.iter().collect::<Vec<_>>().join(","));
        content.push('\n');
    }
    
    // Read all records
    for (i, result) in reader.records().enumerate() {
        if i >= 1000 { // Limit to first 1000 rows for performance
            content.push_str(&format!("... (truncated at {} rows)\n", i));
            break;
        }
        
        match result {
            Ok(record) => {
                content.push_str(&record.iter().collect::<Vec<_>>().join(","));
                content.push('\n');
            }
            Err(e) => {
                content.push_str(&format!("Error reading row {}: {}\n", i, e));
            }
        }
    }
    
    Ok(content)
}

#[tauri::command]
pub async fn read_xlsx_content(file_path: String) -> Result<String, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir()
            .ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };
    
    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }
    
    let mut workbook: Xlsx<_> = open_workbook(&expanded_path)
        .map_err(|e| format!("Failed to open XLSX file: {}", e))?;
    
    let mut content = String::new();
    
    // Get the first worksheet
    let sheet_names = workbook.sheet_names().to_owned();
    if sheet_names.is_empty() {
        return Err("No worksheets found in XLSX file".to_string());
    }
    
    let sheet_name = &sheet_names[0];
    content.push_str(&format!("Sheet: {}\n\n", sheet_name));
    
    if let Ok(range) = workbook.worksheet_range(sheet_name) {
        let mut row_count = 0;
        for row in range.rows() {
            if row_count >= 1000 { // Limit to first 1000 rows for performance
                content.push_str(&format!("... (truncated at {} rows)\n", row_count));
                break;
            }
            
            let row_data: Vec<String> = row.iter()
                .map(|cell| match cell {
                    Data::Empty => String::new(),
                    Data::String(s) => s.clone(),
                    Data::Float(f) => f.to_string(),
                    Data::Int(i) => i.to_string(),
                    Data::Bool(b) => b.to_string(),
                    Data::Error(e) => format!("Error: {:?}", e),
                    Data::DateTime(dt) => format!("{}", dt),
                    Data::DateTimeIso(dt) => dt.clone(),
                    Data::DurationIso(d) => d.clone(),
                })
                .collect();
            
            content.push_str(&row_data.join("\t"));
            content.push('\n');
            row_count += 1;
        }
    }
    
    Ok(content)
}

#[tauri::command]
pub async fn calculate_file_tokens(file_path: String) -> Result<Option<u32>, String> {
    let path = Path::new(&file_path);
    
    if !path.exists() || path.is_dir() {
        return Ok(None);
    }
    
    let extension = path.extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase());
    
    // Only calculate tokens for text, image, audio, and document files
    let is_supported = match extension.as_deref() {
        Some("txt") | Some("md") | Some("rs") | Some("js") | Some("ts") | Some("tsx") | 
        Some("jsx") | Some("py") | Some("java") | Some("cpp") | Some("c") | Some("h") |
        Some("css") | Some("html") | Some("json") | Some("xml") | Some("yaml") |
        Some("yml") | Some("toml") | Some("cfg") | Some("ini") | Some("sh") |
        Some("png") | Some("jpg") | Some("jpeg") | Some("gif") | Some("webp") |
        Some("mp3") | Some("wav") | Some("flac") | Some("ogg") |
        Some("pdf") | Some("csv") | Some("xlsx") => true,
        _ => false,
    };
    
    if !is_supported {
        return Ok(None);
    }
    
    // For now, return a simple estimation based on file size
    // In a real implementation, you would use tiktoken-rs here
    match fs::metadata(path) {
        Ok(metadata) => {
            let size = metadata.len();
            // Rough estimation: ~4 characters per token for text files
            let estimated_tokens = match extension.as_deref() {
                Some("png") | Some("jpg") | Some("jpeg") | Some("gif") | Some("webp") => {
                    // Image tokens estimation (very rough)
                    (size / 1000) as u32 + 100
                }
                Some("mp3") | Some("wav") | Some("flac") | Some("ogg") => {
                    // Audio tokens estimation (very rough)
                    (size / 10000) as u32 + 50
                }
                Some("pdf") => {
                    // PDF tokens estimation (rough, based on compressed text)
                    (size / 8) as u32 + 100
                }
                Some("csv") => {
                    // CSV tokens estimation (similar to text but more structured)
                    (size / 5) as u32
                }
                Some("xlsx") => {
                    // XLSX tokens estimation (compressed format)
                    (size / 15) as u32 + 200
                }
                _ => {
                    // Text files
                    (size / 4) as u32
                }
            };
            Ok(Some(estimated_tokens))
        }
        Err(_) => Ok(None),
    }
}

fn get_git_status_for_directory(dir_path: &Path) -> Result<HashMap<String, String>, String> {
    let mut git_status_map = HashMap::new();
    
    // Check if directory is in a git repository
    let output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(dir_path)
        .output();
    
    match output {
        Ok(output) => {
            if !output.status.success() {
                return Ok(git_status_map); // Not a git repo or error
            }
            
            let status_output = String::from_utf8_lossy(&output.stdout);
            for line in status_output.lines() {
                if line.len() < 3 {
                    continue;
                }
                
                let status_code = &line[..2];
                let file_path = &line[3..];
                let full_path = dir_path.join(file_path).to_string_lossy().to_string();
                
                let status = match status_code {
                    "??" => "untracked",
                    "A " => "added",
                    "AM" => "added-modified",
                    " M" => "modified",
                    "M " => "staged",
                    "MM" => "modified-staged",
                    " D" => "deleted",
                    "D " => "staged-deleted",
                    "R " => "renamed",
                    "C " => "copied",
                    "UU" => "conflicted",
                    _ => "unknown",
                };
                
                git_status_map.insert(full_path, status.to_string());
            }
        }
        Err(_) => return Ok(git_status_map),
    }
    
    Ok(git_status_map)
}

#[tauri::command]
pub async fn get_git_status(directory: String) -> Result<GitStatus, String> {
    let expanded_path = if directory.starts_with("~/") {
        let home = dirs::home_dir()
            .ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&directory[2..])
    } else {
        Path::new(&directory).to_path_buf()
    };
    
    let output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&expanded_path)
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))?;
    
    if !output.status.success() {
        return Err("Not a git repository or git command failed".to_string());
    }
    
    let mut git_status = GitStatus {
        staged: Vec::new(),
        modified: Vec::new(),
        untracked: Vec::new(),
        deleted: Vec::new(),
        renamed: Vec::new(),
        conflicted: Vec::new(),
    };
    
    let status_output = String::from_utf8_lossy(&output.stdout);
    for line in status_output.lines() {
        if line.len() < 3 {
            continue;
        }
        
        let status_code = &line[..2];
        let file_path = line[3..].to_string();
        
        match status_code {
            "??" => git_status.untracked.push(file_path),
            "A " | "AM" => git_status.staged.push(file_path),
            "M " => git_status.staged.push(file_path),
            " M" => git_status.modified.push(file_path),
            "MM" => git_status.modified.push(file_path),
            " D" => git_status.deleted.push(file_path),
            "D " => git_status.staged.push(file_path),
            "R " | "RM" => git_status.renamed.push(file_path),
            "UU" => git_status.conflicted.push(file_path),
            _ => {}
        }
    }
    
    Ok(git_status)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffLine {
    pub line_number_old: Option<u32>,
    pub line_number_new: Option<u32>,
    pub content: String,
    pub line_type: String, // "context", "added", "removed", "header"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileDiff {
    pub file_path: String,
    pub old_path: Option<String>,
    pub new_path: Option<String>,
    pub lines: Vec<DiffLine>,
    pub is_binary: bool,
    pub is_new_file: bool,
    pub is_deleted_file: bool,
}

#[tauri::command]
pub async fn get_git_diff(directory: String, file_path: Option<String>) -> Result<Vec<FileDiff>, String> {
    let expanded_path = if directory.starts_with("~/") {
        let home = dirs::home_dir()
            .ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&directory[2..])
    } else {
        Path::new(&directory).to_path_buf()
    };
    
    let mut args = vec!["diff", "--no-color"];
    if let Some(file) = &file_path {
        args.push("--");
        args.push(file);
    }
    
    let output = Command::new("git")
        .args(&args)
        .current_dir(&expanded_path)
        .output()
        .map_err(|e| format!("Failed to execute git diff command: {}", e))?;
    
    if !output.status.success() {
        return Err("Git diff command failed".to_string());
    }
    
    let diff_output = String::from_utf8_lossy(&output.stdout);
    let diffs = parse_git_diff(&diff_output);
    
    Ok(diffs)
}

fn parse_git_diff(diff_output: &str) -> Vec<FileDiff> {
    let mut diffs = Vec::new();
    let lines: Vec<&str> = diff_output.lines().collect();
    let mut i = 0;
    
    while i < lines.len() {
        let line = lines[i];
        
        // Look for diff header
        if line.starts_with("diff --git") {
            let mut file_diff = FileDiff {
                file_path: String::new(),
                old_path: None,
                new_path: None,
                lines: Vec::new(),
                is_binary: false,
                is_new_file: false,
                is_deleted_file: false,
            };
            
            // Parse file paths from diff header
            if let Some(paths) = line.strip_prefix("diff --git ") {
                let parts: Vec<&str> = paths.split_whitespace().collect();
                if parts.len() >= 2 {
                    file_diff.old_path = Some(parts[0].strip_prefix("a/").unwrap_or(parts[0]).to_string());
                    file_diff.new_path = Some(parts[1].strip_prefix("b/").unwrap_or(parts[1]).to_string());
                    file_diff.file_path = parts[1].strip_prefix("b/").unwrap_or(parts[1]).to_string();
                }
            }
            
            i += 1;
            
            // Parse metadata lines
            while i < lines.len() && !lines[i].starts_with("@@") && !lines[i].starts_with("diff --git") {
                let meta_line = lines[i];
                
                if meta_line.starts_with("new file mode") {
                    file_diff.is_new_file = true;
                } else if meta_line.starts_with("deleted file mode") {
                    file_diff.is_deleted_file = true;
                } else if meta_line.contains("Binary files") {
                    file_diff.is_binary = true;
                }
                
                i += 1;
            }
            
            // Parse hunks
            while i < lines.len() && lines[i].starts_with("@@") {
                let hunk_header = lines[i];
                file_diff.lines.push(DiffLine {
                    line_number_old: None,
                    line_number_new: None,
                    content: hunk_header.to_string(),
                    line_type: "header".to_string(),
                });
                
                // Parse line numbers from hunk header
                let mut old_line_num = 1u32;
                let mut new_line_num = 1u32;
                
                if let Some(numbers) = hunk_header.strip_prefix("@@").and_then(|s| s.strip_suffix("@@")) {
                    if let Some((old_part, new_part)) = numbers.trim().split_once(' ') {
                        if let Some(old_start) = old_part.strip_prefix("-").and_then(|s| s.split(',').next()).and_then(|s| s.parse().ok()) {
                            old_line_num = old_start;
                        }
                        if let Some(new_start) = new_part.strip_prefix("+").and_then(|s| s.split(',').next()).and_then(|s| s.parse().ok()) {
                            new_line_num = new_start;
                        }
                    }
                }
                
                i += 1;
                
                // Parse hunk content
                while i < lines.len() && !lines[i].starts_with("@@") && !lines[i].starts_with("diff --git") {
                    let content_line = lines[i];
                    
                    if content_line.is_empty() {
                        break;
                    }
                    
                    let (line_type, old_num, new_num) = match content_line.chars().next() {
                        Some('+') => {
                            let result = ("added", None, Some(new_line_num));
                            new_line_num += 1;
                            result
                        },
                        Some('-') => {
                            let result = ("removed", Some(old_line_num), None);
                            old_line_num += 1;
                            result
                        },
                        Some(' ') => {
                            let result = ("context", Some(old_line_num), Some(new_line_num));
                            old_line_num += 1;
                            new_line_num += 1;
                            result
                        },
                        _ => {
                            i += 1;
                            continue;
                        }
                    };
                    
                    file_diff.lines.push(DiffLine {
                        line_number_old: old_num,
                        line_number_new: new_num,
                        content: content_line.to_string(),
                        line_type: line_type.to_string(),
                    });
                    
                    i += 1;
                }
            }
            
            diffs.push(file_diff);
        } else {
            i += 1;
        }
    }
    
    diffs
}