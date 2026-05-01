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

Source files live in `src/` — edit agents in `src/agents/` and skills in `src/skills/`. Each source file uses combined frontmatter with `claude:` and `cursor:` subsections for tool-specific fields. After editing, run the build to regenerate the `.claude/` and `.cursor/` output directories:

```bash
npm run build
```
