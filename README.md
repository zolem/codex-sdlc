# cc-sdlc

A Claude Code / Cursor SDLC pipeline that takes a product brief and fully implements it — requirements, architecture, task planning, implementation, verification, and a handoff summary — with no manual intervention.

## Prerequisites

- **Node.js 18+**
- **[Claude Code](https://claude.ai/code)** or **[Cursor](https://cursor.com)** installed and authenticated
- A **git repository** to run the pipeline in

## Install

### Claude Code

```bash
npx cc-sdlc
```

Installs skills (`/orchestrate`, `/generate-brief`) and all agents into `~/.claude`.

```bash
npx cc-sdlc --force                          # overwrite existing files
npx cc-sdlc --claude-dir /path/to/.claude    # custom directory
```

### Cursor

```bash
npx cc-sdlc --cursor
```

Installs skills and all agents into `~/.cursor`.

```bash
npx cc-sdlc --cursor --force                         # overwrite existing files
npx cc-sdlc --cursor-dir /path/to/.cursor            # custom directory
```

### Both at once

```bash
npx cc-sdlc --claude --cursor
```

## Usage

Open Claude Code or Cursor in any repository and run:

```
/orchestrate <your product brief>
```

**Example:**

```
/orchestrate Build a URL shortener where users paste a long URL and get a short
link. Clicking the short link redirects to the original. Track click counts.
No user accounts required.
```

The pipeline runs fully automated from there.

### Generating a brief interactively

If you're not sure what to put in the brief, use `/generate-brief` first. It walks you through a short Q&A and produces a structured brief you can then pass to `/orchestrate`.

```
/generate-brief task management app
```

## What it does

```
Phase 1  Requirements      Product brief → user stories, personas, acceptance criteria
Phase 2  Context           Requirements + repo docs/code → focused context briefing
Phase 3  Architecture      Requirements + context → implementation plan + test cases (parallel)
Phase 4  Planning          All docs → ordered phase files with atomic work items
Phase 5  Implementation    Per phase: engineer (atomic commits) → qa + code review + security in parallel → up to 3 in-place fix iterations → walkthrough
Phase 6  Integration       Manual browser test of the fully integrated feature
Phase 7  Handoff           Summary with per-phase walkthroughs as the review entry point
```

### Agents

| Agent                 | Role                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `product-manager`     | Transforms a brief into a structured requirements doc with user stories and acceptance criteria                   |
| `context-curator`     | Curates a focused, scope-aware briefing from the repo's docs and code so downstream agents stay narrow            |
| `architect`           | Combines requirements + context into an implementation plan with explicit SOLID / pattern decisions               |
| `qa-analyst`          | Writes a user-perspective test plan — what real users will type, click, and trigger                               |
| `task-planner`        | Decomposes planning docs into ordered phases of atomic work items, each sized for a single commit                 |
| `engineer`            | Implements a phase one work item at a time, one commit per work item, gated on typecheck + lint                   |
| `code-reviewer`       | Senior review against the architecture: SOLID, composition, design patterns, correctness                          |
| `qa-verifier`         | Runs the test suite and checks every test case from the plan is implemented                                       |
| `security-reviewer`   | Reviews changed code for OWASP Top 10 and common vulnerabilities                                                  |
| `manual-tester`       | Starts the app and walks through user stories in a real browser _(optional, requires Claude in Chrome extension)_ |
| `walkthrough-author`  | Generates a per-phase code-review walkthrough that narrates each commit's intent and flags trouble spots          |
| `merge-resolver`      | Resolves git merge conflicts by understanding the intent of both conflicting tasks                                |

### Output

All pipeline artifacts are written to `.orchestrate/{feature-slug}/` at the repo root by default. Override with the `ORCHESTRATE_OUT_DIR` environment variable.

```
.orchestrate/{feature-slug}/
  requirements.md       — user stories and acceptance criteria
  context.md            — curated context briefing for downstream agents
  architecture.md       — implementation plan and component design
  test-plan.md          — user-perspective test cases
  task-index.md         — ordered phase list with dependency summary
  stack.json            — per-phase status, commits, and verification metadata
  phases/
    phase-1.md          — cohesive phase specs for engineer agents
    phase-2.md
    ...
  verification/
    phase-N/
      qa-report.md           — per-phase test suite results and coverage
      code-review-report.md  — per-phase senior code review
      security-report.md     — per-phase security findings
    manual-test-report.md    — end-of-pipeline browser walkthrough (if Chrome extension enabled)
  walkthroughs/
    phase-1.md          — narrated per-commit review guide for the phase
    phase-2.md
    ...
```

### Optional: walkthrough viewer

`app/` contains an optional Tauri desktop app for browsing per-phase walkthroughs as the pipeline runs. Build it with `cd app && npm install && npm run tauri build`. If `orchestrate-walkthrough` ends up on `$PATH`, the orchestrate skill will auto-launch it at the start of each run. See `app/README.md`.

## Optional: Browser Testing

The `manual-tester` agent walks through user stories in a real browser using Claude's built-in Chrome integration. To enable it:

1. Install the **[Claude in Chrome extension](https://chromewebstore.google.com/detail/claude-in-chrome)** in Chrome or Edge (v1.0.36+)
2. Launch Claude Code with Chrome integration enabled: `claude --chrome`

The pipeline works without this — the `manual-tester` is skipped if the extension is not available. All other verification (QA, security) runs regardless.

## Contributing

Source files live in `src/` — edit agents in `src/agents/` and skills in `src/skills/`. Each source file uses combined frontmatter with `claude:` and `cursor:` subsections for tool-specific fields. After editing, run the build to regenerate the `.claude/` and `.cursor/` output directories:

```bash
npm run build
```
