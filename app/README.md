# Orchestrate Walkthrough Viewer

A small Tauri desktop app for browsing the per-phase walkthroughs the `/orchestrate` pipeline produces. Optional — the pipeline works fine without it.

## What it does

When the `/orchestrate` skill runs, it writes artifacts to `<repo>/.orchestrate/<feature-slug>/`, including a per-phase walkthrough at `walkthroughs/phase-N.md`. This app picks up those files live, lets you flip between phases, and renders each walkthrough alongside the phase's commits.

## Develop

```bash
cd app
npm install
npm run tauri dev
```

## Build a binary

```bash
npm run tauri build
```

The release binary lands under `src-tauri/target/release/bundle/`. Move or symlink it onto your `$PATH` as `orchestrate-walkthrough`. After that, the orchestrate skill will auto-launch it at the start of each run (via the optional launcher block in `src/skills/orchestrate/SKILL.md`).

## Manual launch

```bash
orchestrate-walkthrough <repo-path> --run <feature-slug>
```

If `<feature-slug>` is omitted, the app shows a picker of all runs found under `<repo-path>/.orchestrate/`.
