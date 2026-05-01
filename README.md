# orchestrate-sdlc

A Claude Code / Cursor SDLC pipeline that takes a product brief and fully implements it — requirements, architecture, task planning, implementation, verification, and a handoff summary — with no manual intervention.

Distributed as a plugin for both Claude Code and Cursor. The repo is private to SchoolAI; install requires GitHub access to the [SchoolAI/orchestrate-sdlc](https://github.com/SchoolAI/orchestrate-sdlc) repo.

## Prerequisites

- **[Claude Code](https://claude.ai/code)** or **[Cursor](https://cursor.com)** installed and authenticated
- GitHub access to `SchoolAI/orchestrate-sdlc` (i.e. `git clone` of the repo succeeds from your machine)
- A **git repository** to run the pipeline in

## Install — Claude Code

Run these two slash commands inside Claude Code:

```
/plugin marketplace add SchoolAI/orchestrate-sdlc
/plugin install orchestrate-sdlc@orchestrate-sdlc
```

Then `/reload-plugins` (or restart Claude Code). The skills are namespaced under the plugin:

- `/orchestrate-sdlc:orchestrate <brief>`
- `/orchestrate-sdlc:generate-brief <topic>`

To pull the latest version later:

```
/plugin marketplace update orchestrate-sdlc
```

## Install — Cursor

Cursor doesn't expose a per-individual "add a remote marketplace by URL" command, so install is a one-time clone + symlink into Cursor's local plugins folder:

```bash
git clone https://github.com/SchoolAI/orchestrate-sdlc.git ~/code/orchestrate-sdlc
ln -s ~/code/orchestrate-sdlc/.cursor ~/.cursor/plugins/local/orchestrate-sdlc
```

Restart Cursor. The clone path (`~/code/orchestrate-sdlc`) is just a suggestion — anywhere you keep repos works. The symlink target under `~/.cursor/plugins/local/` is what Cursor actually loads.

To pull the latest version later:

```bash
cd ~/code/orchestrate-sdlc && git pull
```

## Usage

Open Claude Code or Cursor in any repository and run:

```
/orchestrate-sdlc:orchestrate <your product brief>
```

(In Cursor, the local-install path uses the unprefixed `/orchestrate` form. In Claude Code, plugin skills are always namespaced.)

**Example:**

```
/orchestrate-sdlc:orchestrate Build a URL shortener where users paste a long URL
and get a short link. Clicking the short link redirects to the original. Track
click counts. No user accounts required.
```

The pipeline runs fully automated from there.

### Generating a brief interactively

If you're not sure what to put in the brief, use `generate-brief` first. It walks you through a short Q&A and produces a structured brief you can then pass to `orchestrate`.

```
/orchestrate-sdlc:generate-brief task management app
```

## What it does

```
Phase 1  Requirements      Product brief → user stories, personas, acceptance criteria
Phase 2  Architecture      Requirements + codebase → implementation plan + test cases (parallel)
Phase 3  Planning          All docs → ordered phase files with dependency summary
Phase 4  Implementation    One engineer per phase, sequential; engineer validates its own work before reporting complete
Phase 5  Verification      Full pass: QA + security + browser testing in parallel, auto-fix loop (up to 3x)
Phase 6  Handoff           Summary of everything built, decisions made, and suggested next steps
```

### Agents

| Agent               | Role                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `product-manager`   | Transforms a brief into a structured requirements doc with user stories and acceptance criteria                   |
| `architect`         | Reads the codebase and requirements, produces a concrete implementation plan                                      |
| `qa-analyst`        | Maps every user story to executable test cases covering happy paths, edge cases, and failures                     |
| `task-planner`      | Decomposes planning docs into an ordered sequence of cohesive implementation phases                               |
| `engineer`          | Implements a complete phase — all work items, code, and tests — and verifies everything passes before reporting done |
| `code-reviewer`     | Reviews code for quality, consistency, and correctness against existing codebase patterns                         |
| `qa-verifier`       | Runs the test suite and checks every test case from the plan is implemented                                       |
| `security-reviewer` | Reviews changed code for OWASP Top 10 and common vulnerabilities                                                  |
| `manual-tester`     | Starts the app and walks through user stories in a real browser _(optional, requires Claude in Chrome extension)_ |
| `merge-resolver`    | Resolves git merge conflicts by understanding the intent of both conflicting tasks                                 |

### Output

All pipeline artifacts are written to `docs/{feature-slug}/`:

```
docs/{feature-slug}/
  requirements.md       — user stories and acceptance criteria
  architecture.md       — implementation plan and component design
  test-plan.md          — full test case specification
  task-index.md         — ordered phase list with dependency summary
  phases/
    phase-1.md          — cohesive phase specs for engineer agents
    phase-2.md
    ...
  verification/
    qa-report.md           — test suite results and coverage
    security-report.md     — security findings by severity
    manual-test-report.md  — browser-based exploratory test results (if Chrome extension enabled)
```

## Optional: Browser Testing

The `manual-tester` agent walks through user stories in a real browser using Claude's built-in Chrome integration. To enable it:

1. Install the **[Claude in Chrome extension](https://chromewebstore.google.com/detail/claude-in-chrome)** in Chrome or Edge (v1.0.36+)
2. Launch Claude Code with Chrome integration enabled: `claude --chrome`

The pipeline works without this — the `manual-tester` is skipped if the extension is not available. All other verification (QA, security) runs regardless.

## Contributing

Source files live in `src/` — edit agents in `src/agents/`, skills in `src/skills/`, and hook scripts in `src/hooks/`. Each agent/skill source file uses combined frontmatter with `claude:` and `cursor:` subsections for tool-specific fields. After editing, run the build to regenerate the `.claude/` and `.cursor/` plugin directories (and their manifests):

```bash
npm run build
```

The build emits:

- `.claude/` and `.cursor/` — the two plugin roots (each contains its own `agents/`, `skills/`, `hooks/`, and `.{claude,cursor}-plugin/plugin.json`)
- `.claude-plugin/marketplace.json` and `.cursor-plugin/marketplace.json` — marketplace catalogs at the repo root, each pointing at the relevant plugin directory

### Testing locally

For Claude Code, point its marketplace at your working copy:

```
/plugin marketplace add /absolute/path/to/orchestrate-sdlc
/plugin install orchestrate-sdlc@orchestrate-sdlc
```

After making changes, run `npm run build` and then `/plugin marketplace update orchestrate-sdlc` followed by `/reload-plugins`.

For Cursor, symlink your working copy's `.cursor/` directory into `~/.cursor/plugins/local/`:

```bash
ln -s "$(pwd)/.cursor" ~/.cursor/plugins/local/orchestrate-sdlc
```

Restart Cursor (or Developer: Reload Window) after each `npm run build`.
