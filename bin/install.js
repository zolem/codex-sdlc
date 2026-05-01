#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const force = args.includes('--force');

function getFlagValue(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  const val = args[idx + 1];
  if (!val || val.startsWith('--')) {
    console.error(`Error: ${flag} requires a path argument`);
    process.exit(1);
  }
  return path.resolve(val);
}

const claudeDir = getFlagValue('--claude-dir');
const cursorDir = getFlagValue('--cursor-dir');
const installClaude = args.includes('--claude') || claudeDir !== null;
const installCursor = args.includes('--cursor') || cursorDir !== null;

// Default to Claude if neither target is specified (backward compat)
const targets = [];
if (!installClaude && !installCursor) {
  targets.push({ name: 'Claude', src: '.claude', dest: path.join(os.homedir(), '.claude') });
} else {
  if (installClaude) {
    targets.push({ name: 'Claude', src: '.claude', dest: claudeDir || path.join(os.homedir(), '.claude') });
  }
  if (installCursor) {
    targets.push({ name: 'Cursor', src: '.cursor', dest: cursorDir || path.join(os.homedir(), '.cursor') });
  }
}

const ROOT = path.join(__dirname, '..');

// Copy all .md files from srcDir into destDir (flat — for agents)
function installFiles(srcDir, destDir, installed, skipped) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    if (!file.endsWith('.md')) continue;
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    if (fs.existsSync(destFile) && !force) {
      skipped.push(`  ${destFile} (already exists — use --force to overwrite)`);
    } else {
      fs.copyFileSync(srcFile, destFile);
      installed.push(`  ${destFile}`);
    }
  }
}

// Copy each skill subdirectory recursively (skills are folders containing SKILL.md)
function installSkills(srcSkillsDir, destSkillsDir, installed, skipped) {
  if (!fs.existsSync(srcSkillsDir)) return;
  for (const skillName of fs.readdirSync(srcSkillsDir)) {
    const srcSkillDir = path.join(srcSkillsDir, skillName);
    if (!fs.statSync(srcSkillDir).isDirectory()) continue;
    copySkillDir(srcSkillDir, path.join(destSkillsDir, skillName), installed, skipped);
  }
}

function copySkillDir(src, dest, installed, skipped) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcEntry = path.join(src, entry);
    const destEntry = path.join(dest, entry);
    if (fs.statSync(srcEntry).isDirectory()) {
      copySkillDir(srcEntry, destEntry, installed, skipped);
    } else {
      if (fs.existsSync(destEntry) && !force) {
        skipped.push(`  ${destEntry} (already exists — use --force to overwrite)`);
      } else {
        fs.copyFileSync(srcEntry, destEntry);
        installed.push(`  ${destEntry}`);
      }
    }
  }
}

// Install hook scripts (executable .sh files) to dest hooks dir
function installHooks(srcHooksDir, destHooksDir, installed, skipped) {
  if (!fs.existsSync(srcHooksDir)) return;
  fs.mkdirSync(destHooksDir, { recursive: true });
  for (const file of fs.readdirSync(srcHooksDir)) {
    if (!file.endsWith('.sh')) continue;
    const srcFile = path.join(srcHooksDir, file);
    const destFile = path.join(destHooksDir, file);
    if (fs.existsSync(destFile) && !force) {
      skipped.push(`  ${destFile} (already exists — use --force to overwrite)`);
    } else {
      fs.copyFileSync(srcFile, destFile);
      fs.chmodSync(destFile, 0o755);
      installed.push(`  ${destFile}`);
    }
  }
}

// Merge hook configuration into the target's settings file.
// Claude: merges hooks into settings.json
// Cursor: writes hooks.json directly
function installHookConfig(srcHooksDir, target, installed, skipped) {
  const configSrc = path.join(srcHooksDir, 'hooks.json');
  if (!fs.existsSync(configSrc)) return;

  const hookConfig = JSON.parse(fs.readFileSync(configSrc, 'utf8'));

  if (target.name === 'Cursor') {
    // Cursor: hooks.json is a standalone file
    const destFile = path.join(target.dest, 'hooks.json');
    if (fs.existsSync(destFile) && !force) {
      skipped.push(`  ${destFile} (already exists — use --force to overwrite)`);
    } else {
      fs.writeFileSync(destFile, JSON.stringify(hookConfig, null, 2) + '\n');
      installed.push(`  ${destFile}`);
    }
  } else {
    // Claude: merge hooks key into settings.json
    const settingsFile = path.join(target.dest, 'settings.json');
    let settings = {};
    if (fs.existsSync(settingsFile)) {
      try { settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); } catch {}
    }

    if (settings.hooks && !force) {
      skipped.push(`  ${settingsFile} hooks config (already has hooks — use --force to overwrite)`);
    } else {
      settings.hooks = hookConfig.hooks;
      fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + '\n');
      installed.push(`  ${settingsFile} (hooks config merged)`);
    }
  }
}

console.log('\ncc-sdlc install\n');

for (const target of targets) {
  const srcRoot = path.join(ROOT, target.src);
  console.log(`Installing ${target.name} files to: ${target.dest}\n`);

  const installed = [];
  const skipped = [];

  installFiles(path.join(srcRoot, 'agents'), path.join(target.dest, 'agents'), installed, skipped);
  installSkills(path.join(srcRoot, 'skills'), path.join(target.dest, 'skills'), installed, skipped);
  installHooks(path.join(srcRoot, 'hooks'), path.join(target.dest, 'hooks'), installed, skipped);
  installHookConfig(path.join(srcRoot, 'hooks'), target, installed, skipped);

  if (installed.length > 0) {
    console.log('Installed:');
    installed.forEach(f => console.log(f));
  }
  if (skipped.length > 0) {
    console.log('\nSkipped:');
    skipped.forEach(f => console.log(f));
  }
  if (installed.length === 0 && skipped.length === 0) {
    console.log('Nothing to install.');
  }
  console.log();
}

const hints = targets.map(t => t.name).join(' and ');
console.log(`Done. Open a new ${hints} session to use the agents.\n`);
