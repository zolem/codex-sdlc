---
name: orchestrate
description: Orchestrate the full SDLC pipeline from a product brief
argument-hint: <product brief>
disable-model-invocation: true
---

# SDLC Pipeline

Product brief: $ARGUMENTS

You are the SDLC pipeline orchestrator. You hold all artifacts, coordinate agents, and drive the pipeline from brief to shipped code. Each phase feeds directly into the next with no manual intervention.

---

## Setup

Derive a short kebab-case feature slug from the product brief (e.g. "url-shortener", "task-management-app").

Resolve the artifact root using the Bash tool:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ARTIFACT_ROOT="${ORCHESTRATE_OUT_DIR:-$REPO_ROOT/.orchestrate}"
```

The default location is `.orchestrate/` at the repo root. Users can override it by setting the `ORCHESTRATE_OUT_DIR` environment variable to an absolute path (useful when the repo's `.orchestrate/` collides with something else, or when artifacts should live outside the repo).

Create the artifact folder for this feature:

```
{ARTIFACT_ROOT}/{feature-slug}/
{ARTIFACT_ROOT}/{feature-slug}/phases/
{ARTIFACT_ROOT}/{feature-slug}/walkthroughs/
{ARTIFACT_ROOT}/{feature-slug}/verification/
```

Use the Bash tool to create these directories. All agents will read from and write to this folder. Refer to the resolved per-feature path as `{docs_folder}` throughout (e.g. `.orchestrate/url-shortener`).

Initialize `{docs_folder}/stack.json` as an empty stub:

```json
{
  "feature_slug": "<feature-slug>",
  "phases": []
}
```

The engineer appends commit entries to this file as it works; the orchestrator updates each phase's `status`, `started_at`, `completed_at`, and `verification` block as the per-phase loop progresses.

### Optional: launch the walkthrough viewer

If the `orchestrate-walkthrough` desktop viewer is installed and on `$PATH`, launch it pointed at this run so the user can watch artifacts populate live as each phase completes. This is best-effort — if the binary isn't installed, just continue.

```bash
if command -v orchestrate-walkthrough >/dev/null 2>&1; then
  orchestrate-walkthrough "$REPO_ROOT" --run "{feature-slug}" >/dev/null 2>&1 &
  disown
fi
```

The viewer lives in `app/` in this repo — see `app/README.md` for build instructions.

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

## Phase 5: Implementation + Per-Phase Verification + Walkthrough

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
- If the engineer reports **complete**: proceed to Step 3. The engineer will have made one commit per work item and appended each to `stack.json`.

### Step 3: Verify (per-phase)

Spin up the following agents **in parallel**, passing each:
- The docs folder path (`{docs_folder}`)
- `phase: N`
- An explicit `report_path`:
  - `qa-verifier` → `{docs_folder}/verification/phase-N/qa-report.md`
  - `code-reviewer` → `{docs_folder}/verification/phase-N/code-review-report.md`
  - `security-reviewer` → `{docs_folder}/verification/phase-N/security-report.md`

Create `{docs_folder}/verification/phase-N/` if it does not exist.

`manual-tester` does **not** run here — it runs once at the end of the pipeline (Phase 6) because partial features cannot be browser-tested in isolation.

Read each report and check the **Result** line.

- If all **PASS**: proceed to Step 5.
- If any **FAIL** and iterations remain (cap 3 per phase): proceed to Step 4.
- If any **FAIL** and no iterations remain: mark phase `failed` in `stack.json`, surface all findings, stop the pipeline.

### Step 4: Fix in place

Spin up one `engineer` subagent in **fix mode**. Pass:
- The docs folder path (`{docs_folder}`)
- The failed verification report paths from Step 3

The engineer will append fix-up commits (never amend) and update `stack.json`. When they report complete, return to Step 3.

### Step 5: Generate the walkthrough

Spin up `walkthrough-author`. Pass:
- The docs folder path (`{docs_folder}`)
- `phase: N`

The agent writes `{docs_folder}/walkthroughs/phase-N.md`. Wait for completion.

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

Continue to the next phase. After all phases complete, proceed to Phase 6.

---

## Phase 6: Final Integration Pass

By this point every phase has passed qa-verifier, code-reviewer, and security-reviewer in isolation. The remaining check is end-to-end behavior across the integrated feature, which only manual-tester can do.

### Step 1: Manual test

Spin up `manual-tester`. Pass:
- The docs folder path (`{docs_folder}`)

The agent writes `{docs_folder}/verification/manual-test-report.md`.

- If **PASS**: proceed to Phase 7.
- If **FAIL**: proceed to Step 2.

### Step 2: Remediation phase (only if manual-tester fails)

When manual-tester finds issues that span phases (the kind of cross-phase integration bug that wouldn't show up in per-phase verification), create a remediation phase:

1. Spin up `task-planner` in fix mode. Pass the failed manual-tester report and the docs folder path. It will append a new fix phase to `task-index.md`.
2. Run the new phase through the **full Phase 5 loop** (initialize stack.json entry → engineer implements → per-phase verifiers → walkthrough-author).
3. Re-run manual-tester.

Cap remediation at 2 attempts. If manual-tester still fails after that, surface all findings and stop.

---

## Phase 7: Summary & Handoff

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
List each phase's walkthrough with a one-line summary, in order:
- [Phase 1 — Foundation](./walkthroughs/phase-1.md): [one-line summary of what's in it]
- [Phase 2 — ...](./walkthroughs/phase-2.md): [...]

Tell the user the walkthroughs are the entry point for review: each one narrates the phase's atomic commits with "what to look for" guidance, and trouble-spot stops flag commits where the engineer needed a fix-up. The single PR for this feature can be reviewed phase-by-phase using these walkthroughs alongside the diffs.

**### Decisions & Assumptions**
Notable assumptions agents made, open questions that were deferred, or trade-offs that were resolved during implementation.

**### Suggested Next Steps**
What the user might reasonably do from here — open a PR, run the app locally, review a specific file, address deferred open questions, etc.
