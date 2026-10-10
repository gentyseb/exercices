#!/usr/bin/env node
/**
 * generateur-index.js
 *
 * Scanne les répertoires et les fichiers .html d'un dossier pour créer
 * une page index.html regroupant tous les exercices par catégorie.
 * La catégorie correspond au nom du répertoire (ex : math, francais).
 *
 * Usage :
 *   node generer-index.js              (scanne le dossier courant)
 *   node generer-index.js ./exercices  (scanne le dossier indiqué)
 *
 * - Chaque sous-dossier de premier niveau = une catégorie.
 * - Tous les fichiers .html trouvés dedans (même en sous-dossiers) sont listés.
 * - Les .html posés directement à la racine vont dans la catégorie "Divers".
 * - Le fichier index.html généré est automatiquement ignoré lors du scan.
 * - Le titre affiché est le <title> du fichier (sinon le nom du fichier).
 *
 * Aucune dépendance : Node.js seul (ES modules ou CommonJS, Node 14+).
 */

"use strict";

const fs = require("fs");
const path = require("path");

const OUTPUT_NAME = "index.html";
const FALLBACK_CATEGORY = "Divers";

// --- Utilitaires -----------------------------------------------------------

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Lecture du <title> d'une page HTML (sans parser tout le document)
function extractTitle(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const match = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (match) {
      return match[1].replace(/\s+/g, " ").trim();
    }
  } catch (e) {
    /* lecture impossible : on utilise le nom de fichier */
  }
  return null;
}

// Liste récursive des fichiers .html d'un dossier (en ignorant index.html)
function findHtmlFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      if (entry.name.toLowerCase() === OUTPUT_NAME) continue; // page d'index générée
      results.push(full);
    }
  }
  return results;
}

// --- Scan ------------------------------------------------------------------

function scan(root) {
  // { "Maths": [{ file, title, rel }], ... }
  const categories = new Map();
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (e) {
    console.error("Erreur : impossible de lire le dossier " + root);
    process.exit(1);
  }

  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const files = findHtmlFiles(full);
      if (files.length > 0) {
        categories.set(entry.name, files);
      }
    } else if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".html") &&
      entry.name.toLowerCase() !== OUTPUT_NAME
    ) {
      // Fichier html à la racine -> catégorie "Divers"
      if (!categories.has(FALLBACK_CATEGORY)) {
        categories.set(FALLBACK_CATEGORY, []);
      }
      categories.get(FALLBACK_CATEGORY).push(full);
    }
  }

  // Construction des entrées avec titre et chemin relatif
  const result = [];
  for (const [category, files] of categories) {
    const exercises = files.map((file) => {
      const title = extractTitle(file) || path.basename(file, ".html");
      const rel = path.relative(root, file).split(path.sep).join("/");
      return { title, rel };
    });
    // Tri alphabétique des exercices
    exercises.sort((a, b) => a.title.localeCompare(b.title, "fr"));
    result.push({ category, exercises });
  }
  // Tri alphabétique des catégories (Divers toujours en dernier)
  result.sort((a, b) => {
    if (a.category === FALLBACK_CATEGORY) return 1;
    if (b.category === FALLBACK_CATEGORY) return -1;
    return a.category.localeCompare(b.category, "fr");
  });
  return result;
}

// --- Génération de la page --------------------------------------------------

function slug(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildHtml(root, categories) {
  const total = categories.reduce((n, c) => n + c.exercises.length, 0);
  const now = new Date().toLocaleString("fr-FR");

  const sections = categories
    .map((cat) => {
      const cards = cat.exercises
        .map(
          (ex) =>
            '        <a class="card" href="' + escapeHtml(ex.rel) + '">' +
            escapeHtml(ex.title) +
            "<span>Ouvrir l'exercice →</span></a>"
        )
        .join("\n");

      return (
        '  <section class="category" id="' + escapeHtml(slug(cat.category)) + '">\n' +
        '    <h2>' + escapeHtml(cat.category) +
        ' <span class="count">' + cat.exercises.length + "</span></h2>\n" +
        '    <div class="grid">\n' + cards + "\n    </div>\n" +
        "  </section>"
      );
    })
    .join("\n\n");

  const nav = categories
    .map(
      (cat) =>
        '<a href="#' + escapeHtml(slug(cat.category)) + '">' +
        escapeHtml(cat.category) + " (" + cat.exercises.length + ")</a>"
    )
    .join("\n      ");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Index des exercices</title>
    <style>
      :root { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #111827; background: #f1f5f9; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 32px 24px 48px; }
      .wrap { max-width: 900px; margin: 0 auto; }
      h1 { font-size: 1.8rem; margin: 0 0 6px; color: #1d4ed8; text-align: center; }
      .meta { text-align: center; color: #6b7280; margin: 0 0 22px; font-size: .95rem; }
      .nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 28px; }
      .nav a { padding: 7px 14px; font-size: .88rem; font-weight: 700; text-decoration: none; color: #1d4ed8; background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 999px; }
      .nav a:hover { background: #dbeafe; }
      .category { margin-bottom: 34px; }
      .category h2 { font-size: 1.25rem; margin: 0 0 14px; color: #111827; display: flex; align-items: center; gap: 10px; }
      .count { font-size: .8rem; background: #1d4ed8; color: #fff; border-radius: 999px; padding: 2px 11px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
      a.card {
        display: flex; flex-direction: column; gap: 6px;
        background: #fff; border-radius: 14px; padding: 18px;
        box-shadow: 0 4px 14px rgba(0,0,0,.06);
        text-decoration: none; color: #111827; font-weight: 700; font-size: 1rem;
        border: 2px solid transparent; transition: all .15s ease;
      }
      a.card:hover { border-color: #1d4ed8; transform: translateY(-2px); }
      a.card span { font-size: .8rem; color: #1d4ed8; font-weight: 600; }
      footer { text-align: center; color: #9ca3af; font-size: .78rem; margin-top: 12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>📚 Index des exercices</h1>
      <p class="meta">${total} exercice${total > 1 ? "s" : ""} — généré le ${now}</p>
      <nav class="nav">
      ${nav}
      </nav>
${sections}
      <footer>Page générée automatiquement par generer-index.js — relance le script après avoir ajouté ou retiré des exercices.</footer>
    </div>
  </body>
</html>
`;
}

// --- Point d'entrée ---------------------------------------------------------

function main() {
  const root = path.resolve(process.argv[2] || ".");
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error("Erreur : le dossier indiqué est introuvable (ou n'est pas un dossier) :");
    console.error("  " + root);
    process.exit(1);
  }
  console.log("Scan de : " + root);
  const categories = scan(root);

  const total = categories.reduce((n, c) => n + c.exercises.length, 0);
  if (total === 0) {
    console.log("Aucun fichier .html trouvé — index.html non généré.");
    return;
  }

  const html = buildHtml(root, categories);
  const outPath = path.join(root, OUTPUT_NAME);

  // Dossier OneDrive « en ligne uniquement » ou chemin déplacé : on s'assure
  // que le dossier de sortie existe bien sur le disque avant d'écrire.
  try {
    fs.mkdirSync(root, { recursive: true });
  } catch (e) {
    /* on tente l'écriture quand même */
  }

  try {
    fs.writeFileSync(outPath, html, "utf8");
  } catch (e) {
    console.error("");
    console.error("Échec de l'écriture de : " + outPath);
    console.error("Erreur système : " + (e.code || "?") + " — " + e.message);

    // Repli : on essaie d'écrire à côté du script
    const scriptDir = path.dirname(path.resolve(process.argv[1] || "."));
    const fallbackPath = path.join(scriptDir, OUTPUT_NAME);
    if (fallbackPath !== path.resolve(outPath)) {
      try {
        fs.writeFileSync(fallbackPath, html, "utf8");
        console.error("=> Le fichier a été écrit ici à la place : " + fallbackPath);
        console.error("   Déplace-le manuellement dans le dossier scanné");
        console.error("   pour que les liens vers les exercices fonctionnent.");
        return;
      } catch (e2) {
        /* on affiche l'aide ci-dessous */
      }
    }

    console.error("");
    console.error("Suggestions :");
    console.error("  1. Si ce dossier est dans OneDrive, fais un clic droit dessus");
    console.error("     et choisis « Toujours conserver sur cet appareil »,");
    console.error("     puis relance le script.");
    console.error("  2. Vérifie que le dossier existe bien à cet emplacement exact");
    console.error("     (attention aux espaces en fin de nom).");
    console.error("  3. Ferme puis rouvre l'invite de commandes et réessaie.");
    process.exit(1);
  }

  console.log("Catégories trouvées :");
  for (const cat of categories) {
    console.log("  - " + cat.category + " : " + cat.exercises.length + " exercice(s)");
  }
  console.log("");
  console.log("Total : " + total + " exercice(s)");
  console.log("Page générée : " + outPath);
}

main();