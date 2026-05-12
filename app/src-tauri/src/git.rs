use std::process::Command;

pub fn show_file_diff(repo_path: &str, sha: &str, file_path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(["show", sha, "--format=", "--patch", "--", file_path])
        .current_dir(repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let parent = format!("{}~1", sha);
        let output = Command::new("git")
            .args(["diff", &parent, sha, "--", file_path])
            .current_dir(repo_path)
            .output()
            .map_err(|e| format!("Failed to run git diff: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "git diff failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        return Ok(String::from_utf8_lossy(&output.stdout).to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn list_commit_files(repo_path: &str, sha: &str) -> Result<Vec<String>, String> {
    let output = Command::new("git")
        .args(["diff-tree", "--no-commit-id", "-r", "--name-only", sha])
        .current_dir(repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "git diff-tree failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.lines().map(|l| l.to_string()).collect())
}
