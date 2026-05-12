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

console.log('\ncc-sdlc install\n');

for (const target of targets) {
  const srcRoot = path.join(ROOT, target.src);
  console.log(`Installing ${target.name} files to: ${target.dest}\n`);

  const installed = [];
  const skipped = [];

  installFiles(path.join(srcRoot, 'agents'), path.join(target.dest, 'agents'), installed, skipped);
  installSkills(path.join(srcRoot, 'skills'), path.join(target.dest, 'skills'), installed, skipped);

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
