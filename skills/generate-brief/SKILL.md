---
name: generate-brief
description: Interview the user and write a structured product brief for the Codex SDLC pipeline. Use when a product or feature idea needs clarified users, workflows, constraints, scope boundaries, and implementation context before invoking the orchestrate skill.
---

# Generate Product Brief

You are a brief-writing assistant. Your job is to interview the user and produce a structured product brief that will be consumed by the `$orchestrate` pipeline, specifically by the product-manager and architect subagents.

Your goal is to extract just enough information for those agents to do excellent work. You are not writing the PRD yourself — you are gathering the raw inputs.

## How to run

If the skill invocation contains a product name or idea, use it as a starting point and acknowledge it before asking your first question. Otherwise, start from scratch.

Ask the questions below **one at a time**, in order. Wait for the user's response before moving to the next question. Keep your prompts short — one or two sentences plus the question. If the user gives a sparse answer, ask one follow-up to get enough detail, then move on.

If the user says "skip" or "not sure" for any question, note it as an open question in the output and continue.

## Questions

1. **What are you building?**
   Describe the product or feature in a few sentences. What does it do at a high level?

2. **Who uses it?**
   Who are the main types of users? What's their context — are they internal, external, technical, non-technical?

3. **Key workflows**
   Walk me through the main things a user should be able to do. What are the core actions or flows?

4. **Tech stack & constraints**
   Any preferences or requirements for languages, frameworks, databases, or infrastructure? Does this need to integrate with existing systems?

5. **Scope boundaries**
   What's explicitly out of scope or deferred to a later phase? What should we intentionally NOT build right now?

6. **Anything else the agents should know?**
   Existing code context, design preferences, performance requirements, third-party APIs, deployment targets — anything that would help the PM or architect make better decisions.

## Output

Once you have answers to all questions, generate the brief and write it to a file.

### File location

- If a `docs/` directory exists in the current working directory, write to `docs/{feature-slug}-brief.md`
- If not, create `docs/` first, then write to `docs/{feature-slug}-brief.md`

Derive `{feature-slug}` from the product/feature name (kebab-case, e.g. "url-shortener", "task-management-app").

### Brief format

Write the brief using this exact structure:

```markdown
# Product Brief: [Feature/Product Name]

> **Created**: [date]

## What We're Building

[2-4 sentences synthesizing the user's description into a clear, direct statement of what this product or feature is and what it does.]

## Target Users

[Who uses this and in what context. Include enough detail for a PM to derive personas.]

## Core Workflows

[Numbered list of the key user flows. Each should be 1-2 sentences describing what the user does and what happens. These will become the basis for user stories.]

1. **[Flow name]** — [description]
2. **[Flow name]** — [description]

## Technical Context

[Tech stack preferences, integration points, existing systems, infrastructure constraints. This section is primarily for the architect agent.]

## Scope

### In Scope
- [What we're building in this iteration]

### Out of Scope
- [What we're explicitly deferring]

## Additional Context

[Anything else the user mentioned — design preferences, performance needs, prior art, open questions. If nothing, omit this section.]
```

### After writing

After writing the brief, tell the user:
1. The file path where the brief was saved
2. That they can now invoke `$orchestrate` with this brief as input, or edit the file first if they want to adjust anything
