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
const CLAUDE_DIR = path.join(ROOT, '.claude');
const CURSOR_DIR = path.join(ROOT, '.cursor');
const CLAUDE_AGENTS = path.join(CLAUDE_DIR, 'agents');
const CURSOR_AGENTS = path.join(CURSOR_DIR, 'agents');
const CLAUDE_SKILLS = path.join(CLAUDE_DIR, 'skills');
const CURSOR_SKILLS = path.join(CURSOR_DIR, 'skills');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const REPO_URL = 'https://github.com/zolem/cc-sdlc';
const OWNER = 'zolem';
const PLUGIN_NAME = 'cc-sdlc';

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

function buildManifests() {
  const pluginMeta = {
    name: PLUGIN_NAME,
    description: PKG.description,
    version: PKG.version,
    author: { name: OWNER },
    homepage: REPO_URL,
    repository: REPO_URL,
    license: PKG.license,
    keywords: PKG.keywords || []
  };

  const marketplace = {
    name: PLUGIN_NAME,
    owner: { name: OWNER },
    plugins: [
      {
        name: PLUGIN_NAME,
        source: './.claude',
        description: PKG.description
      }
    ]
  };

  const rootMarketplaceDir = path.join(ROOT, '.claude-plugin');
  ensureDir(rootMarketplaceDir);
  fs.writeFileSync(
    path.join(rootMarketplaceDir, 'marketplace.json'),
    JSON.stringify(marketplace, null, 2) + '\n'
  );
  console.log('  built manifest: .claude-plugin/marketplace.json');

  const claudePluginDir = path.join(CLAUDE_DIR, '.claude-plugin');
  ensureDir(claudePluginDir);
  fs.writeFileSync(
    path.join(claudePluginDir, 'plugin.json'),
    JSON.stringify(pluginMeta, null, 2) + '\n'
  );
  console.log('  built manifest: .claude/.claude-plugin/plugin.json');

  const cursorPluginDir = path.join(CURSOR_DIR, '.cursor-plugin');
  ensureDir(cursorPluginDir);
  fs.writeFileSync(
    path.join(cursorPluginDir, 'plugin.json'),
    JSON.stringify(pluginMeta, null, 2) + '\n'
  );
  console.log('  built manifest: .cursor/.cursor-plugin/plugin.json');
}

// --- Main ---

console.log('Building agents...');
buildAgents();
console.log('Building skills...');
buildSkills();
console.log('Building plugin manifests...');
buildManifests();
console.log('Done.');
