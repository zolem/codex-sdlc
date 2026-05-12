use crate::git;
use serde::Serialize;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

#[derive(Serialize)]
pub struct RunSummary {
    pub slug: String,
    pub path: String,
    pub mtime: u64,
}

#[tauri::command]
pub fn discover_runs(repo_path: String) -> Result<Vec<RunSummary>, String> {
    let base = Path::new(&repo_path);
    let orchestrate_dir = base.join(".orchestrate");

    if !orchestrate_dir.is_dir() {
        return Ok(vec![]);
    }

    let mut runs = Vec::new();
    let entries = fs::read_dir(&orchestrate_dir).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        // A directory counts as a run if it has stack.json OR any pipeline
        // markdown artifact. Partial runs (e.g. stuck in Plan/Design) still
        // surface in the app so users can see what's there.
        let has_artifacts = path.join("stack.json").exists()
            || path.join("requirements.md").exists()
            || path.join("architecture.md").exists()
            || path.join("context.md").exists()
            || path.join("task-index.md").exists()
            || path.join("test-plan.md").exists();

        if !has_artifacts {
            continue;
        }

        let slug = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        // Use stack.json mtime when present, otherwise fall back to the most
        // recent file inside the directory.
        let mtime = newest_mtime(&path).unwrap_or(0);

        runs.push(RunSummary {
            slug,
            path: path.to_string_lossy().to_string(),
            mtime,
        });
    }

    runs.sort_by(|a, b| b.mtime.cmp(&a.mtime));
    Ok(runs)
}

#[tauri::command]
pub fn get_run(repo_path: String, slug: String) -> Result<serde_json::Value, String> {
    let stack_path = Path::new(&repo_path)
        .join(".orchestrate")
        .join(&slug)
        .join("stack.json");

    // For partial runs (no stack.json yet), return a stub so the UI can render
    // the Plan/Design stages without erroring.
    if !stack_path.exists() {
        return Ok(serde_json::json!({
            "feature_slug": slug,
            "phases": [],
        }));
    }

    let content = fs::read_to_string(&stack_path).map_err(|e| {
        format!("Failed to read stack.json for '{}': {}", slug, e)
    })?;

    serde_json::from_str(&content).map_err(|e| {
        format!("Failed to parse stack.json for '{}': {}", slug, e)
    })
}

#[tauri::command]
pub fn get_walkthrough(repo_path: String, slug: String, phase: u32) -> Result<String, String> {
    let walk_path = Path::new(&repo_path)
        .join(".orchestrate")
        .join(&slug)
        .join("walkthroughs")
        .join(format!("phase-{}.md", phase));

    fs::read_to_string(&walk_path).map_err(|e| {
        format!(
            "Failed to read walkthrough phase {} for '{}': {}",
            phase, slug, e
        )
    })
}

#[tauri::command]
pub fn list_documents(repo_path: String, slug: String) -> Result<Vec<String>, String> {
    let run_dir = Path::new(&repo_path).join(".orchestrate").join(&slug);
    let mut docs = Vec::new();

    for entry in fs::read_dir(&run_dir).map_err(|e| e.to_string())?.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("md") {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                docs.push(name.to_string());
            }
        }
    }

    for sub in ["phases", "walkthroughs", "verification"] {
        let sub_dir = run_dir.join(sub);
        if sub_dir.is_dir() {
            collect_md_recursive(&sub_dir, sub, &mut docs);
        }
    }

    docs.sort();
    Ok(docs)
}

#[tauri::command]
pub fn get_document(repo_path: String, slug: String, doc_path: String) -> Result<String, String> {
    let full_path = Path::new(&repo_path)
        .join(".orchestrate")
        .join(&slug)
        .join(&doc_path);

    fs::read_to_string(&full_path).map_err(|e| {
        format!("Failed to read document '{}': {}", doc_path, e)
    })
}

fn newest_mtime(dir: &Path) -> Option<u64> {
    let mut newest = None;
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let mtime = if path.is_dir() {
                newest_mtime(&path)
            } else {
                fs::metadata(&path)
                    .and_then(|m| m.modified())
                    .map(|t| t.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs())
                    .ok()
            };
            if let Some(m) = mtime {
                newest = Some(newest.map_or(m, |n: u64| n.max(m)));
            }
        }
    }
    newest
}

fn collect_md_recursive(dir: &Path, prefix: &str, docs: &mut Vec<String>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if path.is_dir() {
                collect_md_recursive(&path, &format!("{}/{}", prefix, name), docs);
            } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
                docs.push(format!("{}/{}", prefix, name));
            }
        }
    }
}

#[tauri::command]
pub fn get_diff(repo_path: String, sha: String, file_path: String) -> Result<String, String> {
    git::show_file_diff(&repo_path, &sha, &file_path)
}

#[tauri::command]
pub fn get_commit_files(repo_path: String, sha: String) -> Result<Vec<String>, String> {
    git::list_commit_files(&repo_path, &sha)
}

