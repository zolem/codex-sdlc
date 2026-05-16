use notify::RecursiveMode;
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, RecommendedCache};
use notify::RecommendedWatcher;
use serde::Serialize;
use std::collections::HashSet;
use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

pub struct WatcherState {
    pub debouncer: Mutex<Option<Debouncer<RecommendedWatcher, RecommendedCache>>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            debouncer: Mutex::new(None),
        }
    }
}

#[derive(Serialize, Clone)]
struct RunChangedPayload {
    slug: String,
}

#[tauri::command]
pub fn start_watch(
    repo_path: String,
    app: AppHandle,
    state: State<'_, WatcherState>,
) -> Result<(), String> {
    let orchestrate_dir = Path::new(&repo_path).join(".orchestrate");
    if !orchestrate_dir.is_dir() {
        // Nothing to watch yet — not an error. The frontend can re-arm later.
        return Ok(());
    }

    let base = orchestrate_dir.clone();
    let app_handle = app.clone();

    let mut debouncer = new_debouncer(
        Duration::from_millis(250),
        None,
        move |res: DebounceEventResult| {
            let Ok(events) = res else { return };
            let mut slugs: HashSet<String> = HashSet::new();
            let mut runs_changed = false;

            for event in events {
                for path in &event.paths {
                    if let Some(slug) = slug_for_path(&base, path) {
                        slugs.insert(slug);
                    } else if path == &base || path.parent() == Some(base.as_path()) {
                        runs_changed = true;
                    }
                }
            }

            if runs_changed || !slugs.is_empty() {
                let _ = app_handle.emit("runs-changed", ());
            }
            for slug in slugs {
                let _ = app_handle.emit("run-changed", RunChangedPayload { slug });
            }
        },
    )
    .map_err(|e| e.to_string())?;

    debouncer
        .watch(&orchestrate_dir, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    *state.debouncer.lock().unwrap() = Some(debouncer);
    Ok(())
}

fn slug_for_path(base: &Path, path: &Path) -> Option<String> {
    let rel = path.strip_prefix(base).ok()?;
    let first = rel.components().next()?;
    let slug = first.as_os_str().to_string_lossy().to_string();
    if slug.is_empty() {
        None
    } else {
        Some(slug)
    }
}

