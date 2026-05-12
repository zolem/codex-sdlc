#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod git;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .invoke_handler(tauri::generate_handler![
            commands::discover_runs,
            commands::get_run,
            commands::get_walkthrough,
            commands::get_diff,
            commands::get_commit_files,
            commands::list_documents,
            commands::get_document,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
