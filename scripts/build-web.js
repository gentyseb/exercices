#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const webDir = path.join(root, 'www');
const contentDirectories = [
  'core',
  'Culture',
  'Découvertes',
  'Français',
  'Histoire',
  'Math',
  'Sciences',
  'data'
];

fs.mkdirSync(webDir, { recursive: true });

for (const directory of contentDirectories) {
  const source = path.join(root, directory);
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    throw new Error(`Missing web content directory: ${directory}`);
  }
  fs.cpSync(source, path.join(webDir, directory), { recursive: true, force: true });
}

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.html')) {
    fs.copyFileSync(path.join(root, entry.name), path.join(webDir, entry.name));
  }
}

const generator = spawnSync(
  process.execPath,
  [path.join(root, 'generator.js'), webDir],
  { cwd: root, encoding: 'utf8' }
);

if (generator.error) throw generator.error;
if (generator.stdout) process.stdout.write(generator.stdout);
if (generator.stderr) process.stderr.write(generator.stderr);
if (generator.status !== 0) {
  throw new Error(`Exercise-page generation failed with exit code ${generator.status}.`);
}

console.log(`Mobile web assets prepared in ${webDir}`);
