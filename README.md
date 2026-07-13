# Codex SDLC

A Codex-only, review-gated software delivery pipeline. Give it a product brief and it coordinates specialized runtime subagents to produce requirements, architecture, a test plan, phased implementation, independent verification, browser-ready walkthroughs, and a final handoff.

## Install

Requirements:

- A current Codex release with plugin and subagent support
- Git available in the repositories where the pipeline will run

Add this repository as a plugin marketplace:

```shell
codex plugin marketplace add zolem/codex-sdlc
```

Open the plugin directory in the Codex app, choose the **Codex SDLC** marketplace, and install **codex-sdlc**. Start a new task after installing or upgrading so the current plugin contents are loaded.

## Use

Run the full pipeline with an inline brief:

```text
$orchestrate Build a URL shortener where users paste a long URL and receive a durable short link.
```

Or pass a brief file:

```text
$orchestrate Use docs/url-shortener-brief.md as the product brief.
```

If the idea needs clarification first:

```text
$generate-brief task management app
```

The brief workflow asks one focused question at a time and writes `docs/<feature-slug>-brief.md`.

## Pipeline

The orchestrator stores run artifacts in `.orchestrate/<feature-slug>/` by default. Set `ORCHESTRATE_OUT_DIR` to an absolute directory to override the artifact root.

Before writing those artifacts, the orchestrator reports the current branch and commit and checks for uncommitted files. A dirty worktree stops the run until the user cleans it and retries or explicitly chooses to continue anyway. The pipeline never stashes, resets, or cleans existing work on the user's behalf.

1. Product requirements
2. Repository context curation
3. Architecture and QA planning in parallel
4. Phased task planning
5. Self-contained HTML planning brief and user approval gate
6. Sequential phase implementation with atomic commits
7. Per-phase QA, code review, and security review in parallel, with bounded remediation
8. Markdown and self-contained HTML walkthroughs
9. Final browser QA when browser control is available
10. Summary and handoff

The 14 specialist role prompts are internal to the orchestrator. Each runtime subagent reads only its assigned role and bounded task inputs, keeping planning, implementation, and review context isolated.

## Browser review and QA

Planning briefs and phase walkthroughs are standalone HTML files. The orchestrator best-effort opens them in the operating system's default browser and always reports their absolute paths.

Final manual QA uses browser control when the active Codex client exposes it. If browser control is unavailable, the run finishes with `SKIPPED_UNAVAILABLE`, clearly warns that end-to-end browser validation remains outstanding, and writes exact owner test steps. Skipped cases are never reported as passing.

## Repository layout

```text
.codex-plugin/plugin.json                 Plugin manifest
.agents/plugins/marketplace.json          Repository marketplace
skills/generate-brief/                    Public brief-generation skill
skills/orchestrate/                       Public SDLC orchestration skill
  references/roles/                       Internal specialist prompts
  references/html/                        Active HTML reference fixtures
```

## License

[MIT](LICENSE)
