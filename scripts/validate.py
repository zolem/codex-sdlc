#!/usr/bin/env python3
"""Validate the Codex SDLC plugin using only the Python standard library."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / ".codex-plugin" / "plugin.json"
MARKETPLACE = ROOT / ".agents" / "plugins" / "marketplace.json"
SKILLS = ROOT / "skills"
ROLE_DIR = SKILLS / "orchestrate" / "references" / "roles"
HTML_DIR = SKILLS / "orchestrate" / "references" / "html"

EXPECTED_SKILLS = {"generate-brief", "orchestrate"}
EXPECTED_ROLES = {
    "architect",
    "code-reviewer",
    "context-curator",
    "engineer",
    "manual-tester",
    "merge-resolver",
    "plan-explainer",
    "product-manager",
    "qa-analyst",
    "qa-verifier",
    "security-reviewer",
    "task-planner",
    "walkthrough-author",
    "walkthrough-explainer",
}
EXPECTED_HTML = {
    "implementation-plan.html",
    "implementation-plan-revision.html",
    "walkthrough.html",
}
FORBIDDEN_PATHS = {".claude", ".cursor", ".claude-plugin", "app", "bin", "src"}
FORBIDDEN_TEXT = {
    ".claude",
    ".cursor",
    "claude code",
    "anthropic",
    "claude-opus",
    "tauri",
    "orchestrate-walkthrough",
    "cc-sdlc",
    "$arguments",
    "claude in chrome",
    "bash tool",
    "write tool",
    "read tool",
    "html-examples",
}


def fail(message: str) -> None:
    raise ValueError(message)


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"Invalid JSON at {path.relative_to(ROOT)}: {exc}")


def validate_skill(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not match:
        fail(f"Missing frontmatter in {path.relative_to(ROOT)}")
    fields = []
    for line in match.group(1).splitlines():
        if not line.strip() or line.startswith((" ", "\t")):
            fail(f"Invalid frontmatter line in {path.relative_to(ROOT)}: {line!r}")
        fields.append(line.split(":", 1)[0])
    if fields != ["name", "description"]:
        fail(f"Frontmatter in {path.relative_to(ROOT)} must contain only name and description")
    expected_name = path.parent.name
    if not re.search(rf"(?m)^name:\s*{re.escape(expected_name)}\s*$", match.group(1)):
        fail(f"Skill name must match folder {expected_name}")
    metadata = path.parent / "agents" / "openai.yaml"
    if not metadata.is_file() or f"${expected_name}" not in metadata.read_text(encoding="utf-8"):
        fail(f"Missing or stale agents/openai.yaml for {expected_name}")


def main() -> int:
    for name in FORBIDDEN_PATHS:
        if (ROOT / name).exists():
            fail(f"Obsolete path remains: {name}")

    plugin = load_json(PLUGIN)
    required_plugin = {"name", "version", "description", "author", "interface", "skills"}
    if not required_plugin.issubset(plugin):
        fail("Plugin manifest is missing required fields")
    if plugin["name"] != "codex-sdlc" or plugin["skills"] != "./skills/":
        fail("Plugin name or skills path is incorrect")
    if not re.fullmatch(r"\d+\.\d+\.\d+", plugin["version"]):
        fail("Plugin version must use strict semver")

    marketplace = load_json(MARKETPLACE)
    entries = marketplace.get("plugins", [])
    if len(entries) != 1 or entries[0].get("name") != "codex-sdlc":
        fail("Marketplace must expose exactly the codex-sdlc plugin")
    source = entries[0].get("source", {})
    if source != {"source": "url", "url": "https://github.com/zolem/codex-sdlc.git"}:
        fail("Marketplace source must point to the repository root")

    skill_names = {p.name for p in SKILLS.iterdir() if p.is_dir()}
    if skill_names != EXPECTED_SKILLS:
        fail(f"Expected public skills {sorted(EXPECTED_SKILLS)}, found {sorted(skill_names)}")
    for name in EXPECTED_SKILLS:
        validate_skill(SKILLS / name / "SKILL.md")

    roles = {p.stem for p in ROLE_DIR.glob("*.md")}
    if roles != EXPECTED_ROLES:
        fail(f"Role set mismatch: {sorted(roles ^ EXPECTED_ROLES)}")
    for role in ROLE_DIR.glob("*.md"):
        if role.read_text(encoding="utf-8").startswith("---"):
            fail(f"Internal role must not use skill frontmatter: {role.name}")

    html = {p.name for p in HTML_DIR.glob("*.html")}
    if html != EXPECTED_HTML:
        fail(f"HTML fixture set mismatch: {sorted(html ^ EXPECTED_HTML)}")

    scanned_suffixes = {".md", ".html", ".json", ".yaml", ".yml", ".py"}
    for path in ROOT.rglob("*"):
        if (
            not path.is_file()
            or path.resolve() == Path(__file__).resolve()
            or ".git" in path.parts
            or path.suffix.lower() not in scanned_suffixes
        ):
            continue
        text = path.read_text(encoding="utf-8").lower()
        for marker in FORBIDDEN_TEXT:
            if marker in text:
                fail(f"Forbidden integration marker {marker!r} in {path.relative_to(ROOT)}")

    print("Codex SDLC plugin validation passed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as exc:
        print(f"validation error: {exc}", file=sys.stderr)
        raise SystemExit(1)
