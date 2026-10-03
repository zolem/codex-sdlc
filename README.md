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
$orchestrate Use .orchestrate/url-shortener/product-brief.md as the product brief.
```

If the idea needs clarification first:

```text
$generate-brief task management app
```

The brief workflow asks one focused question at a time and writes `.orchestrate/<feature-slug>/product-brief.md` by default. Like the orchestrator, it honors an absolute `ORCHESTRATE_OUT_DIR` override.

## Pipeline

The orchestrator stores each run in its own collision-safe directory under `.orchestrate/<feature-slug>/<run-id>/` by default. Run IDs use a high-resolution UTC timestamp, and the run directory is created without overwriting an existing path, so repeating the same feature slug preserves earlier artifacts. For example:

```text
.orchestrate/url-shortener/run-20260714T042452123456Z/
```

Set `ORCHESTRATE_OUT_DIR` to an absolute directory to override the artifact root; the `<feature-slug>/<run-id>/` layout is preserved beneath that root.

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

The 13 specialist role prompts are internal to the orchestrator. Generic runtime subagents read their assigned role files and receive bounded task inputs. The orchestrator requests fresh context where supported; actual context inheritance depends on the client.

## Per-role models

The bundled defaults in `skills/orchestrate/references/model-policy.json` assign models by role:

| Roles | Requested model | Reasoning effort |
| --- | --- | --- |
| product-manager, architect, task-planner, code-reviewer, security-reviewer | `gpt-6.1-sol` | `high` |
| engineer, context-curator, qa-analyst, qa-verifier, manual-tester | `gpt-6-luna` | `high` |
| plan-explainer, walkthrough-author, walkthrough-explainer | `gpt-6-luna` | `medium` |

Sol handles requirements, architectural decisions, decomposition, and code/security judgment. Luna handles bounded implementation and QA tasks with high effort, and artifact narration with medium effort. These are workflow defaults, not universal model availability claims.

To customize a target project, create `<target-repository-root>/.orchestrate/model-policy.json`. For example:

```json
{
  "roles": {
    "engineer": { "model": "gpt-6.1-sol" },
    "walkthrough-author": { "reasoning_effort": "high" }
  }
}
```

This preserves the engineer's bundled `high` effort and the walkthrough author's bundled Luna model. Missing files preserve all defaults; empty `roles` or role objects are no-ops. Overrides merge field by field for known roles only. Malformed JSON, duplicate keys, unknown roles/fields, wrong types, nulls, empty or padded strings, and invalid effort names stop setup. Supported effort names are `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, and `ultra`; the chosen runtime/model must also support the requested pair. Model identifiers remain configurable.

The orchestrator resolves the bundled file relative to its installed `SKILL.md`, reads both policies once at setup, and freezes the merged settings through revisions and fixes. The override always lives at the target repository root, even with `ORCHESTRATE_OUT_DIR`; policies in run artifact folders are not loaded. Before execution, a compact summary shows resolved settings for all roles. Each run's `stack.json` records source paths and resolved requested settings alongside phase metadata. The orchestrator records individual dispatch requests/outcomes in `model-dispatches.json`, avoiding competing writes with engineers updating commit metadata.

Every spawn explicitly requests the resolved model and reasoning effort on a generic agent with role-file instructions. This avoids named custom-agent settings overriding the request, as described in [OpenAI's subagent guidance](https://learn.chatgpt.com/docs/agent-configuration/subagents). The pipeline fails clearly if the runtime cannot accept explicit settings or rejects a model/effort pair; it never silently substitutes or automatically escalates. Defaults can be overridden with a model available to your account/client before starting a new run.

These policy files are **project conventions**, not native Codex config. Dispatch is driven by skill instructions, so it cannot guarantee hard enforcement, capability isolation, or actual-model telemetry. Recorded settings are requests; fresh-context support and model availability depend on the runtime. No native custom-agent configuration is installed.

## Browser review and QA

Planning briefs and phase walkthroughs are standalone HTML files. The orchestrator best-effort opens them in the operating system's default browser and always reports their absolute paths.

Final manual QA uses browser control when the active Codex client exposes it. If browser control is unavailable, the run finishes with `SKIPPED_UNAVAILABLE`, clearly warns that end-to-end browser validation remains outstanding, and writes exact owner test steps. Skipped cases are never reported as passing.

## Repository layout

```text
.codex-plugin/plugin.json                 Plugin manifest
.agents/plugins/marketplace.json          Repository marketplace
skills/generate-brief/                    Public brief-generation skill
skills/orchestrate/                       Public SDLC orchestration skill
  references/model-policy.json            Bundled per-role model defaults
  references/roles/                       Internal specialist prompts
  references/html/                        Active HTML reference fixtures
```

## License

[MIT](LICENSE)
