# Codex SDLC contributor guidance

- Keep this repository Codex-only. Do not add compatibility layers, generated trees, documentation, or release assets for other coding-agent products.
- Public skills live under `skills/`; internal specialist prompts live under `skills/orchestrate/references/roles/` and are not standalone skills.
- Keep `SKILL.md` frontmatter limited to `name` and `description`. Update the matching `agents/openai.yaml` when a public skill's purpose changes.
- Keep role prompts capability-neutral. Refer to Codex runtime subagents, available file/shell tools, `AGENTS.md`, and optional browser control without pinning model names.
- Preserve the planning approval gate, per-phase verification loops, atomic commit contract, Markdown walkthroughs, and self-contained HTML review artifacts.
- Run `python scripts/validate.py` after changing plugin metadata, skills, role prompts, fixtures, or documentation.
