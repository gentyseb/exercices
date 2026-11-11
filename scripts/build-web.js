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

function addExerciseBackLinks(sourceDirectory, destinationDirectory) {
  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const destinationPath = path.join(destinationDirectory, entry.name);

    if (entry.isDirectory()) {
      addExerciseBackLinks(sourcePath, destinationPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

    const html = fs.readFileSync(destinationPath, 'utf8');
    const indexRelativePath = path.relative(
      path.dirname(destinationPath),
      path.join(webDir, 'index.html')
    ).split(path.sep).join('/');
    const backLink = `<nav class="exercise-back" aria-label="Navigation de l’exercice"><a href="${indexRelativePath}"><span aria-hidden="true">←</span> Retour</a></nav>`;
    const updatedHtml = html.replace('<main class="card">', `<main class="card">\n      ${backLink}`);

    if (updatedHtml === html) {
      throw new Error(`Could not add a back link to exercise page: ${sourcePath}`);
    }

    fs.writeFileSync(destinationPath, updatedHtml, 'utf8');
  }
}

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

for (const directory of contentDirectories.filter((name) => !['core', 'data'].includes(name))) {
  addExerciseBackLinks(
    path.join(root, directory),
    path.join(webDir, directory)
  );
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
