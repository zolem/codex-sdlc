#!/usr/bin/env node
// Generates .claude/ and .cursor/ from source files in src/.
//
// src/agents/*.md    → .claude/agents/*.md  (Claude frontmatter)
//                    → .cursor/agents/*.md  (Cursor frontmatter)
//
// src/skills/*/SKILL.md → .claude/skills/*/SKILL.md  (Claude frontmatter)
//                       → .cursor/skills/*/SKILL.md  (Cursor frontmatter)
//
// Source files use combined frontmatter with tool-specific subsections:
//
//   ---
//   name: my-skill
//   description: ...
//   claude:
//     argument-hint: <foo>
//     disable-model-invocation: true
//   cursor:
//     disable-model-invocation: true
//   ---

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_AGENTS = path.join(ROOT, 'src', 'agents');
const SRC_SKILLS = path.join(ROOT, 'src', 'skills');
const SRC_HOOKS = path.join(ROOT, 'src', 'hooks');
const CLAUDE_AGENTS = path.join(ROOT, '.claude', 'agents');
const CURSOR_AGENTS = path.join(ROOT, '.cursor', 'agents');
const CLAUDE_SKILLS = path.join(ROOT, '.claude', 'skills');
const CURSOR_SKILLS = path.join(ROOT, '.cursor', 'skills');
const CLAUDE_HOOKS = path.join(ROOT, '.claude', 'hooks');
const CURSOR_HOOKS = path.join(ROOT, '.cursor', 'hooks');

// --- YAML helpers ---

function parseCombinedFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('No frontmatter found');

  const yamlStr = match[1];
  const body = match[2];
  const meta = {};
  let currentSection = null;

  for (const line of yamlStr.split('\n')) {
    if (!line.trim()) continue;

    // Section header: "claude:" or "cursor:" with no value
    const sectionMatch = line.match(/^(\w+):\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      meta[currentSection] = {};
      continue;
    }

    // Indented key-value inside a section
    const indentedMatch = line.match(/^  ([\w-]+):\s*(.*)/);
    if (indentedMatch && currentSection) {
      meta[currentSection][indentedMatch[1]] = parseYamlValue(indentedMatch[2].trim());
      continue;
    }

    // Top-level key-value (resets active section)
    const kvMatch = line.match(/^([\w-]+):\s*(.*)/);
    if (kvMatch) {
      currentSection = null;
      meta[kvMatch[1]] = parseYamlValue(kvMatch[2].trim());
    }
  }

  return { meta, body };
}

function parseYamlValue(str) {
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  return str;
}

function buildFrontmatter(fields) {
  const lines = ['---'];
  for (const [key, val] of Object.entries(fields)) {
    lines.push(`${key}: ${val}`);
  }
  lines.push('---');
  return lines.join('\n') + '\n';
}

// --- Build logic ---

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildAgents() {
  ensureDir(CLAUDE_AGENTS);
  ensureDir(CURSOR_AGENTS);

  const files = fs.readdirSync(SRC_AGENTS).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(SRC_AGENTS, file), 'utf8');
    const { meta, body } = parseCombinedFrontmatter(content);
    const { name, description, claude: claudeMeta = {}, cursor: cursorMeta = {} } = meta;

    fs.writeFileSync(
      path.join(CLAUDE_AGENTS, file),
      buildFrontmatter({ name, description, ...claudeMeta }) + body
    );
    fs.writeFileSync(
      path.join(CURSOR_AGENTS, file),
      buildFrontmatter({ name, description, ...cursorMeta }) + body
    );

    console.log(`  built agent: ${file}`);
  }
}

function buildSkills() {
  ensureDir(CLAUDE_SKILLS);
  ensureDir(CURSOR_SKILLS);

  const skillNames = fs.readdirSync(SRC_SKILLS).filter(name => {
    return fs.statSync(path.join(SRC_SKILLS, name)).isDirectory();
  });

  for (const skillName of skillNames) {
    const srcFile = path.join(SRC_SKILLS, skillName, 'SKILL.md');
    if (!fs.existsSync(srcFile)) continue;

    const content = fs.readFileSync(srcFile, 'utf8');
    const { meta, body } = parseCombinedFrontmatter(content);
    const { name, description, claude: claudeMeta = {}, cursor: cursorMeta = {} } = meta;

    // .claude/skills/{name}/SKILL.md
    const claudeSkillDir = path.join(CLAUDE_SKILLS, skillName);
    ensureDir(claudeSkillDir);
    fs.writeFileSync(
      path.join(claudeSkillDir, 'SKILL.md'),
      buildFrontmatter({ name, description, ...claudeMeta }) + body
    );

    // .cursor/skills/{name}/SKILL.md
    const cursorSkillDir = path.join(CURSOR_SKILLS, skillName);
    ensureDir(cursorSkillDir);
    fs.writeFileSync(
      path.join(cursorSkillDir, 'SKILL.md'),
      buildFrontmatter({ name, description, ...cursorMeta }) + body
    );

    // Copy any supporting files (scripts/, references/, assets/, etc.)
    for (const entry of fs.readdirSync(path.join(SRC_SKILLS, skillName))) {
      if (entry === 'SKILL.md') continue;
      const srcEntry = path.join(SRC_SKILLS, skillName, entry);
      if (fs.statSync(srcEntry).isDirectory()) {
        copyDir(srcEntry, path.join(claudeSkillDir, entry));
        copyDir(srcEntry, path.join(cursorSkillDir, entry));
      } else {
        fs.copyFileSync(srcEntry, path.join(claudeSkillDir, entry));
        fs.copyFileSync(srcEntry, path.join(cursorSkillDir, entry));
      }
    }

    console.log(`  built skill: ${skillName}`);
  }
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src)) {
    const srcEntry = path.join(src, entry);
    const destEntry = path.join(dest, entry);
    if (fs.statSync(srcEntry).isDirectory()) {
      copyDir(srcEntry, destEntry);
    } else {
      fs.copyFileSync(srcEntry, destEntry);
    }
  }
}

// --- Hook configuration ---

const CLAUDE_HOOK_CONFIG = {
  hooks: {
    PreToolUse: [
      {
        matcher: 'Bash',
        hooks: [
          {
            type: 'command',
            command: '"$CLAUDE_PROJECT_DIR"/.claude/hooks/check-memory.sh',
            timeout: 5
          }
        ]
      }
    ],
    SessionStart: [
      {
        hooks: [
          {
            type: 'command',
            command: '"$CLAUDE_PROJECT_DIR"/.claude/hooks/process-watchdog.sh',
            async: true
          }
        ]
      }
    ]
  }
};

const CURSOR_HOOK_CONFIG = {
  hooks: {
    beforeShellExecution: [
      {
        command: '.cursor/hooks/check-memory.sh',
        timeout: 5000,
        enabled: true
      }
    ]
  }
};

function buildHooks() {
  ensureDir(CLAUDE_HOOKS);
  ensureDir(CURSOR_HOOKS);

  if (!fs.existsSync(SRC_HOOKS)) return;

  // Copy hook scripts to both platforms
  for (const file of fs.readdirSync(SRC_HOOKS)) {
    const srcFile = path.join(SRC_HOOKS, file);
    if (fs.statSync(srcFile).isDirectory()) continue;
    if (!file.endsWith('.sh')) continue;

    fs.copyFileSync(srcFile, path.join(CLAUDE_HOOKS, file));
    fs.copyFileSync(srcFile, path.join(CURSOR_HOOKS, file));
    // Preserve executable bit
    fs.chmodSync(path.join(CLAUDE_HOOKS, file), 0o755);
    fs.chmodSync(path.join(CURSOR_HOOKS, file), 0o755);

    console.log(`  built hook: ${file}`);
  }

  // Write platform-specific hook configs alongside the scripts
  fs.writeFileSync(
    path.join(CLAUDE_HOOKS, 'hooks.json'),
    JSON.stringify(CLAUDE_HOOK_CONFIG, null, 2) + '\n'
  );
  fs.writeFileSync(
    path.join(CURSOR_HOOKS, 'hooks.json'),
    JSON.stringify(CURSOR_HOOK_CONFIG, null, 2) + '\n'
  );
  console.log('  built hook configs');
}

// --- Main ---

console.log('Building agents...');
buildAgents();
console.log('Building skills...');
buildSkills();
console.log('Building hooks...');
buildHooks();
console.log('Done.');
