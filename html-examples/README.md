# HTML Explanation Prototypes

Goal: at the end of the PM → Architect + QA Analyst stage of the SDLC pipeline, generate
a single self-contained HTML document that explains, in 30 seconds of skimming and ~5
minutes of clicking, **what is about to be built**.

Two audiences, one artifact:

1. **Non-technical stakeholders** — see the user-facing change, the scope, and the risks.
2. **Software engineers running orchestrate** — grok the surface area, key decisions,
   and open questions before committing the run.

Inspiration: Thariq's HTML-effectiveness post — spatial layout beats walls of markdown,
direct manipulation beats imagination, and the artifact should be skim-first / drill-deep.

## Constraints we're enforcing for now

- **Single file**, no CDN, no build step. Works offline. Opens in any browser.
- **No frameworks** — vanilla HTML + a tiny inline `<style>` + minimal `<script>`.
- **Skim hierarchy**: hero summary → user-facing change → scope → risks → details.
- **Source-grounded**: every claim should be traceable to a line in
  `requirements.md`, `architecture.md`, or `test-plan.md`.

## Prototypes

Three different runs, three different visual treatments, so we can pick the one that
generalizes best:

| File | Source run | Treatment |
|------|------------|-----------|
| `01-feature-one-pager.html` | `~/projects/web-app/.orchestrate/fly-266` (phone validation) | Interactive before/after with a live input demo |
| `02-user-journey.html` | `~/projects/web-app/.orchestrate/custom-prompt-space-guide` | Linear journey map with click-to-expand step cards |
| `03-system-dashboard.html` | `~/projects/web-app/.orchestrate/level-up-onboarding` | Multi-section dashboard for larger features |
| `04-implementation-plan.html` | `~/projects/web-app/.orchestrate/fly-266` | **Technical review & sign-off artifact** — end-state diagrams, decisions + rejected alternatives, phased path, key contract code, file plan, interactive sign-off checklist |

### `04-implementation-plan.html` — the sign-off artifact

This one is built specifically for the "I am drowning in AI-generated code review" problem.
The premise: an engineer should be able to look at this document and say
**"yes, that's the implementation I want — proceed"** without having to read the full
markdown documents the agents produced.

What makes it different from 01–03:

- **End-state diagrams (§01)** show data flow before and after, with new / modified / unchanged
  nodes color-coded. The "what's actually changing in the system" answer in one image.
- **Decisions table (§02)** surfaces every architectural fork with the chosen option, the
  *rejected* alternative (struck through), and why. If the engineer disagrees with a rejection,
  this is the place they push back.
- **Phased path (§03)** turns the task planner output into a phase-by-phase strip showing
  PR scope, file lists, and test deltas per phase.
- **Key contract (§04)** shows the single critical piece of code in full. For a small feature
  this is the whole feature; for larger features, it's the new interface or schema everything
  else wires into.
- **Interactive sign-off checklist (§07)** drives an "approve plan" button. The artifact
  is itself the review surface.

Inspired by https://thariqs.github.io/html-effectiveness/16-implementation-plan.html — the
numbered-card structure, monospace code blocks, severity-tagged risk table.

## What to evaluate

- Does a non-technical reader understand the change without reading the prose docs?
- Does an engineer spot the open questions and risk areas in under 30 seconds?
- Does the layout survive when content gets longer / shorter?
- Which interactions actually pull their weight vs. ornament?
- What template could a generator agent produce reliably from PM + Architect + QA outputs?

## Design principle: stable skeleton, free-form interior

A single rigid template is the wrong target. The right model is closer to a magazine:

- **Section order and headings stay constant** so the reviewer can skim — they know
  §02 is always "decisions and rejected alternatives," §06 is always "risks."
- **What goes inside each section is free-form.** A feature that's mostly a new flow
  gets a sequence diagram; a feature that changes a schema gets a before/after data
  shape; a feature touching many services gets a system diagram.

Concretely, the generator agent's prompt should say:

> Always emit sections 00–07 in this order with these headings. For each section,
> choose the visual representation that best communicates the change for *this*
> feature — bespoke SVG diagrams, tables, code blocks, before/after panes,
> annotated mockups, whatever fits. Do not force a layout that doesn't match the
> content.

The §01 SVG diagram in `04-implementation-plan.html` is an example of bespoke
visual work: nodes laid out specifically for this feature's data flow, with a dark
"source of truth" node (Zustand store) and dashed clay arrows for derived UI
state — distinct from the solid grey save path. The next feature's §01 should
look different because its system is different.

## Next steps after picking a direction

1. Lock the section skeleton (00–07).
2. Write a generator prompt for a new SDLC agent (`explainer-author`?) that consumes
   `requirements.md` + `architecture.md` + `test-plan.md` + `task-index.md` + phase files
   and emits the HTML. Give the agent freedom over visuals within each section.
3. Have the architect agent add an explicit "Alternatives Considered" section so §02
   has reliable source material rather than inferred-from-prose decisions.
4. Wire it into orchestrate as the closer of the PM → Architect + QA + Task-planner stage.
