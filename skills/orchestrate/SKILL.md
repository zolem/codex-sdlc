---
name: orchestrate
description: Run a full, review-gated software delivery pipeline from an inline product brief or a brief file. Use when Codex should turn requirements into architecture, phased implementation, verification, browser-ready walkthroughs, and a final handoff using specialized runtime subagents.
---

# SDLC Pipeline

Product brief: use the inline brief or brief-file path supplied with the skill invocation.

You are the SDLC pipeline orchestrator. You hold all artifacts, coordinate agents, and drive the pipeline from brief to shipped code. Pause at the explicit planning review gate; otherwise continue autonomously until complete or genuinely blocked.

## Role dispatch

Specialist instructions are bundled under `references/roles/` relative to this `SKILL.md`. Whenever this workflow says to spin up a named subagent:

1. Resolve `references/roles/<role-name>.md` to an absolute path.
2. Spawn a runtime subagent with a bounded task. Tell it to read that role file completely, then perform the supplied task using only the task inputs and repository state.
3. Give each subagent a stable task name matching the role and phase, and require a concise completion summary plus the expected artifact path.
4. Wait for required results before continuing. Spawn agents in parallel only where this workflow explicitly says the work is independent.
5. If a subagent reports a git conflict it cannot safely resolve, spawn `merge-resolver` with the conflicting files and both relevant task specifications. Re-run the interrupted gate after resolution.

Do not paste full role prompts into the parent conversation. Let each subagent read its own role file so intermediate context stays isolated.

Role files:

- [product-manager](references/roles/product-manager.md)
- [context-curator](references/roles/context-curator.md)
- [architect](references/roles/architect.md)
- [qa-analyst](references/roles/qa-analyst.md)
- [task-planner](references/roles/task-planner.md)
- [plan-explainer](references/roles/plan-explainer.md)
- [engineer](references/roles/engineer.md)
- [qa-verifier](references/roles/qa-verifier.md)
- [code-reviewer](references/roles/code-reviewer.md)
- [security-reviewer](references/roles/security-reviewer.md)
- [walkthrough-author](references/roles/walkthrough-author.md)
- [walkthrough-explainer](references/roles/walkthrough-explainer.md)
- [manual-tester](references/roles/manual-tester.md)
- [merge-resolver](references/roles/merge-resolver.md)

HTML reference fixtures used by the explainer roles:

- [implementation plan](references/html/implementation-plan.html)
- [revised implementation plan](references/html/implementation-plan-revision.html)
- [phase walkthrough](references/html/walkthrough.html)

---

## Setup

Derive a short kebab-case feature slug from the product brief (e.g. "url-shortener", "task-management-app").

Resolve the repository root with `git rev-parse --show-toplevel`; fall back to the current working directory when it is not a Git repository. Set the artifact root to `ORCHESTRATE_OUT_DIR` when that environment variable contains an absolute path, otherwise use `<repo-root>/.orchestrate`.

The default location is `.orchestrate/` at the repo root. Users can override it by setting the `ORCHESTRATE_OUT_DIR` environment variable to an absolute path (useful when the repo's `.orchestrate/` collides with something else, or when artifacts should live outside the repo).

### Git startup check

Before creating the artifact folder or making any other filesystem mutation, report the current branch and HEAD, then check for uncommitted files from the repository root:

```bash
git branch --show-current
git rev-parse --short HEAD
git status --porcelain=v1 --untracked-files=all
```

An empty branch name means `HEAD` is detached. If the status output is empty, tell the user which branch and commit the run is starting from and continue.

If the status output is non-empty, stop before writing artifacts. Show the current branch, HEAD, and the status output, then send this concise gate:

> I found uncommitted files, so I can't safely start the orchestration run yet. Please commit, stash, or revert them and reply `retry`. If you intentionally want to run on top of these changes, reply `continue anyway`.

Wait for the user's response. On `retry`, rerun the startup check and continue only when it is clean. On an explicit `continue anyway`, warn that the existing changes may overlap with or be included in implementation commits, then continue. Do not treat a generic planning approval as permission to bypass this gate. Never stash, reset, clean, or otherwise alter the existing changes on the user's behalf.

If the current directory is not a Git worktree, preserve the existing non-Git fallback behavior.

Create the artifact folder for this feature:

```
{ARTIFACT_ROOT}/{feature-slug}/
{ARTIFACT_ROOT}/{feature-slug}/phases/
{ARTIFACT_ROOT}/{feature-slug}/walkthroughs/
{ARTIFACT_ROOT}/{feature-slug}/verification/
{ARTIFACT_ROOT}/{feature-slug}/revisions/
```

Create these directories with the available filesystem or shell tools. All agents will read from and write to this folder. Refer to the resolved per-feature path as `{docs_folder}` throughout (e.g. `.orchestrate/url-shortener`).

Initialize `{docs_folder}/stack.json` as an empty stub:

```json
{
  "feature_slug": "<feature-slug>",
  "phases": []
}
```

The engineer appends commit entries to this file as it works; the orchestrator updates each phase's `status`, `started_at`, `completed_at`, and `verification` block as the per-phase loop progresses.

---

## Phase 1: Requirements

Spin up the `product-manager` subagent. Pass:
- The product brief
- The docs folder path (`{docs_folder}`)

The agent will write `{docs_folder}/requirements.md`.

---

## Phase 2: Context Curation

Spin up the `context-curator` subagent. Pass:
- The docs folder path (`{docs_folder}`)

The agent will read `requirements.md`, scan the target repo's docs and code, and write `{docs_folder}/context.md` — a focused, scope-aware briefing the downstream agents will read.

---

## Phase 3: Architecture & Test Plan

Spin up the `architect` and `qa-analyst` subagents **in parallel**. Pass each:
- The docs folder path (`{docs_folder}`)

Both will read `requirements.md` (and the architect also reads `context.md`). The `architect` writes `{docs_folder}/architecture.md`. The `qa-analyst` writes `{docs_folder}/test-plan.md`.

---

## Phase 4: Planning

Spin up the `task-planner` subagent. Pass:
- The docs folder path (`{docs_folder}`)

The agent will read all prior documents and write:
- `{docs_folder}/phases/phase-N.md` — one file per implementation phase
- `{docs_folder}/task-index.md` — ordered phase list with dependency summary

---

## Phase 5: Plan Brief & Review Gate

This phase compiles the full pre-implementation planning bundle into a single HTML brief that the user reviews before any code is written. If the user requests changes, the architect, qa-analyst, task-planner, and plan-explainer all re-run with the steering input until the user approves.

### Step 1: Generate the brief

Spin up the `plan-explainer` subagent. Pass:
- The docs folder path (`{docs_folder}`)
- `mode: initial` (for v1) or `mode: revision` with `revision: N` and a steering input path (for v2+)

The agent writes `{docs_folder}/plan.html` (or overwrites it, on revisions).

### Step 2: Review gate

The review gate is **on by default**. The user can disable it by setting `ORCHESTRATE_REVIEW_GATE=0` in the environment before invoking the orchestrator; if it's disabled, skip to Phase 6.

Read the `ORCHESTRATE_REVIEW_GATE` environment variable with the active shell. Treat an unset value as `1`.

If the value is `0`, log "review gate disabled — proceeding to implementation" and continue to Phase 6.

Otherwise, best-effort open the brief in the user's default browser. Use `Start-Process` on Windows, `open` on macOS, or `xdg-open` on Linux. Request approval if the active permission mode requires it. Do not block the pipeline if opening fails; always provide the absolute clickable path.

Then send a single short message to the user:

> I've opened the implementation plan in your browser:
>
> `file://{absolute path to plan.html}`
>
> Reply `ok` (or any affirmative — "looks good", "proceed", etc.) to start implementation. Otherwise describe what you'd like changed, and the architect and task-planner will revise the plan. If you're reviewing a revised version, refresh the browser tab to see the new content.

Then **wait for the user's next message** before proceeding.

### Step 3: Interpret the response

When the user replies:

- **Affirmative** (`ok`, `looks good`, `approved`, `proceed`, `ship it`, etc.) — proceed to Phase 6.
- **Steering input** (anything else that describes desired changes) — proceed to Step 4.

If the response is ambiguous (e.g. a question), answer the question and ask again, rather than guessing approval.

### Step 4: Capture the steering input and revise

Determine the next revision number `N`:

```bash
ls "{docs_folder}/revisions/" 2>/dev/null | grep -oE 'plan-v[0-9]+\.html' | sed -E 's/plan-v([0-9]+)\.html/\1/' | sort -n | tail -1
```

If the directory is empty, the current plan is v1 and the next revision will be v2 — so `N=2`. Otherwise add 1 to the highest existing version.

Snapshot the current plan to history:

```bash
cp "{docs_folder}/plan.html" "{docs_folder}/revisions/plan-v{N-1}.html"
```

Write the user's steering input verbatim to `{docs_folder}/revisions/v{N}-input.md` using the available file-editing tools. Include a short header so the file is self-describing:

```markdown
# Steering input for revision v{N}

> Submitted: {ISO 8601 timestamp}
> Prior plan: revisions/plan-v{N-1}.html

{user's message verbatim}
```

Re-run the planning agents with the steering context:

1. Spin up the `architect` and `qa-analyst` subagents **in parallel**. Pass each:
   - The docs folder path (`{docs_folder}`)
   - The steering input path (`revisions/v{N}-input.md`)
   - An instruction to incorporate the steering input as a hard requirement; both will overwrite `architecture.md` and `test-plan.md` in place.
2. After both complete, spin up the `task-planner` subagent. Pass:
   - The docs folder path (`{docs_folder}`)
   - The steering input path
   - An instruction to **review and update** existing phase files and `task-index.md` to reflect the revised architecture and test plan. Phases that no longer make sense should be reshaped, not appended.
3. Spin up the `plan-explainer` subagent in **revision mode**. Pass:
   - The docs folder path (`{docs_folder}`)
   - `mode: revision`
   - `revision: N`
   - The steering input path (`revisions/v{N}-input.md`)
   - The prior plan path (`revisions/plan-v{N-1}.html`)

The agent overwrites `{docs_folder}/plan.html` as v{N}, with the "What changed in v{N}" callout and version-aware §02 decision table.

Return to **Step 2** with the new plan. The loop continues until the user approves.

---

## Phase 6: Implementation + Per-Phase Verification + Walkthrough

Read `{docs_folder}/task-index.md` to get the ordered list of phases.

Execute phases **one at a time in order**. For each phase, run the steps below. Verification (qa + code review + security) happens **inside this loop, per phase**, with an in-place fix loop. The walkthrough is generated only after the phase passes verification.

**Maximum fix iterations per phase: 3.** If a phase still fails after 3 fix cycles, mark it `failed` in `stack.json`, surface findings to the user, and stop the pipeline.

### Step 1: Initialize the phase entry in `stack.json`

Append a new phase entry to `stack.json`:

```json
{
  "n": N,
  "title": "<phase title from task-index.md>",
  "status": "in_progress",
  "started_at": "<ISO 8601 timestamp>",
  "commits": []
}
```

### Step 2: Implement

Spin up one `engineer` subagent in **implementation mode**. Pass:
- The path to the phase file: `{docs_folder}/phases/phase-N.md`
- The docs folder path (`{docs_folder}`)

Wait for the engineer to respond.

- If the engineer reports **blocked**: mark the phase `failed` in `stack.json`, stop the pipeline, and surface the blocker to the user.
- If the engineer reports **complete**: independently inspect tracked changes from the repository root before proceeding. When `{docs_folder}` is inside the repository, convert it to a repo-relative path and run `git diff --name-only -- . ':(exclude)<repo-relative-docs-folder>/**'` plus `git diff --cached --name-only -- . ':(exclude)<repo-relative-docs-folder>/**'`. When it is outside the repository, run the same two commands without pathspecs. Ignore untracked files. If either command returns another tracked path, do not create verification outputs or dispatch verifier agents. Mark the phase `failed` in `stack.json` and surface a blocking report listing the exact paths. Otherwise proceed to Step 3. The engineer will have made one commit per work item, committed every planned test with its owning work item or an explicit test-only work item, recorded the assigned TC-NNN IDs in commit and `stack.json` metadata, and appended each commit to `stack.json`.

### Step 3: Verify (per-phase)

Spin up the following agents **in parallel**, passing each:
- The docs folder path (`{docs_folder}`)
- `phase: N`
- An explicit `report_path`:
  - `qa-verifier` → `{docs_folder}/verification/phase-N/qa-report.md`
  - `code-reviewer` → `{docs_folder}/verification/phase-N/code-review-report.md`
  - `security-reviewer` → `{docs_folder}/verification/phase-N/security-report.md`

Create `{docs_folder}/verification/phase-N/` if it does not exist.

`manual-tester` does **not** run here — it runs once at the end of the pipeline (Phase 7) because partial features cannot be browser-tested in isolation.

Read each report and check the **Result** line.

- If all **PASS**: proceed to Step 5.
- If any **FAIL** and iterations remain (cap 3 per phase): proceed to Step 4.
- If any **FAIL** and no iterations remain: mark phase `failed` in `stack.json`, surface all findings, stop the pipeline.

### Step 4: Fix in place

Spin up one `engineer` subagent in **fix mode**. Pass:
- The docs folder path (`{docs_folder}`)
- The failed verification report paths from Step 3

The engineer will append fix-up commits (never amend) and update `stack.json`. When they report complete, repeat the tracked-worktree gate from Step 2. Return to Step 3 only when no staged or unstaged tracked implementation or test paths remain outside `{docs_folder}`; otherwise mark the phase failed and surface the exact blocking paths.

### Step 5: Generate the walkthroughs

Spin up `walkthrough-author` and `walkthrough-explainer` **in parallel**. Pass each:
- The docs folder path (`{docs_folder}`)
- `phase: N`

`walkthrough-author` writes `{docs_folder}/walkthroughs/phase-N.md` — the commit-by-commit markdown narration.

`walkthrough-explainer` writes `{docs_folder}/walkthroughs/phase-N.html` — the per-phase HTML walkthrough with one rich page per atomic commit (intent header, scope check, per-commit diagram, risk badge, edge-case prompts, error-handling and test-quality counts, cumulative-context aside, decision buttons) plus a final cross-commit synthesis page. The two outputs are complementary: the markdown is the canonical narration, the HTML is the higher-fidelity review surface.

Wait for both to complete.

### Step 6: Mark the phase validated

Update the phase entry in `stack.json`:

```json
{
  "n": N,
  "status": "validated",
  "completed_at": "<ISO 8601 timestamp>",
  "verification": {
    "qa": "pass",
    "code_review": "pass",
    "security": "pass",
    "iterations": <number of fix cycles run>
  }
}
```

Continue to the next phase. After all phases complete, best-effort open the first phase's HTML walkthrough in the user's default browser using the operating-system command described at the planning gate. Do not block on failure; provide the absolute clickable path. Then proceed to Phase 7.

---

## Phase 7: Final Integration Pass

By this point every phase has passed qa-verifier, code-reviewer, and security-reviewer in isolation. The remaining check is end-to-end behavior across the integrated feature, which only manual-tester can do.

### Step 1: Manual test

Spin up `manual-tester`. Pass:
- The docs folder path (`{docs_folder}`)
- An instruction to first verify that browser-control capability is available in the current client.

The agent writes `{docs_folder}/verification/manual-test-report.md`.

- If **PASS**: proceed to Phase 8.
- If **FAIL**: proceed to Step 2.
- If **SKIPPED_UNAVAILABLE**: proceed to Phase 8 without remediation. Record `manual_test: "skipped_unavailable"` in `stack.json`, call out that browser validation remains outstanding, and include exact owner test steps in the final handoff. Never describe this state as fully browser-validated.

### Step 2: Remediation phase (only if manual-tester fails)

When manual-tester finds issues that span phases (the kind of cross-phase integration bug that wouldn't show up in per-phase verification), create a remediation phase:

1. Spin up `task-planner` in fix mode. Pass the failed manual-tester report and the docs folder path. It will append a new fix phase to `task-index.md`.
2. Run the new phase through the **full Phase 6 loop** (initialize stack.json entry → engineer implements → per-phase verifiers → walkthrough-author).
3. Re-run manual-tester.

Cap remediation at 2 attempts. If manual-tester still fails after that, surface all findings and stop.

---

## Phase 8: Summary & Handoff

Read all artifacts produced during the pipeline and present a single comprehensive summary directly in the conversation.

---

**## [Feature Name] — Implementation Summary**

**### What Was Built**
A plain-language description of the feature as implemented, tied back to the original brief. Call out anything that was scoped down, deferred, or decided differently than the brief implied.

**### Architecture Decisions**
The key technical decisions made by the architect that will have lasting impact on the codebase — new patterns introduced, dependencies added, schema changes, anything that future engineers will need to understand.

**### Files Changed**
A grouped summary of all files created or modified across all phases. Group by area (e.g. data layer, API, UI, tests) rather than listing every file flat.

**### Verification Results**
- QA: [pass/fail summary, test count, coverage] — aggregated across `verification/phase-*/qa-report.md`
- Code review: [pass/fail summary, total findings] — aggregated across `verification/phase-*/code-review-report.md`
- Security: [pass/fail, any Medium findings worth knowing even if not blocking] — aggregated across `verification/phase-*/security-report.md`
- Manual: [pass/fail, any issues worth noting] — `verification/manual-test-report.md`

**### Reviewing this work**
List each phase's walkthrough with a one-line summary, in order. Link both formats — the HTML walkthrough is the richer review surface (per-commit pages with diagrams, scope-check flags, risk badges, decision buttons, and a cross-commit synthesis page); the markdown walkthrough is the canonical narration:

- Phase 1 — Foundation: [HTML](./walkthroughs/phase-1.html) · [markdown](./walkthroughs/phase-1.md) — [one-line summary of what's in it]
- Phase 2 — …: [HTML](./walkthroughs/phase-2.html) · [markdown](./walkthroughs/phase-2.md) — [...]

Tell the user the walkthroughs are the entry point for review: each one narrates the phase's atomic commits with "what to look for" guidance, and trouble-spot stops flag commits where the engineer needed a fix-up. The single PR for this feature can be reviewed phase-by-phase using these walkthroughs alongside the diffs.

**### Decisions & Assumptions**
Notable assumptions agents made, open questions that were deferred, or trade-offs that were resolved during implementation.

**### Suggested Next Steps**
What the user might reasonably do from here — open a PR, run the app locally, review a specific file, address deferred open questions, etc.
