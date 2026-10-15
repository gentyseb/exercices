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

function extractStorageKey(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const match = content.match(/\bSTORAGE_KEY\s*=\s*(["'])([^"']+)\1/);
    if (match) return match[2];
  } catch (e) {
    /* lecture impossible : aucun score ne sera associé */
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
      const storageKey = extractStorageKey(file);
      return { title, rel, storageKey };
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
  const generationInfo = `${total} exercice${total > 1 ? "s" : ""} — généré le ${now}`;

  const sections = categories
    .map((cat) => {
      const cards = cat.exercises
        .map(
          (ex) =>
            '        <a class="card" href="' + escapeHtml(ex.rel) + '">' +
            escapeHtml(ex.title) +
            "<span>Ouvrir l'exercice →</span>" +
            '<span class="exercise-score" data-score-key="' +
            escapeHtml(ex.storageKey || "") +
            '">Score : <span class="exercise-score-value">0 / 0</span> · ' +
            '<span class="exercise-score-percentage">— %</span></span></a>'
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
    <link rel="stylesheet" href="core/style.css" />
  </head>
  <body>
    <div class="wrap">
      <h1>📚 Index des exercices</h1>
      <nav class="nav">
      ${nav}
      </nav>
      <section class="global-score" aria-live="polite">
        <h2>Score global</h2>
        <p><span id="global-score-value">0 / 0</span> · <span id="global-score-percentage" class="global-score-percentage">— %</span></p>
      </section>
${sections}
      <footer>${generationInfo}</footer>
    </div>
    <script>
      function updatePercentage(element, good, total) {
        const percentage = total > 0 ? Math.round((good / total) * 100) : null;
        element.textContent = percentage === null ? "— %" : percentage + " %";
        element.classList.remove("score-low", "score-medium", "score-high");
        if (percentage !== null) {
          element.classList.add(
            percentage < 80 ? "score-low" : percentage < 92 ? "score-medium" : "score-high"
          );
        }
      }

      function renderScores() {
        let globalGood = 0;
        let globalTotal = 0;
        const countedStorageKeys = new Set();

        document.querySelectorAll(".exercise-score").forEach((scoreElement) => {
          const storageKey = scoreElement.dataset.scoreKey;
          if (!storageKey) return;

          const valueElement = scoreElement.querySelector(".exercise-score-value");
          const percentageElement = scoreElement.querySelector(".exercise-score-percentage");
          const updateScore = (good, total) => {
            valueElement.textContent = good + " / " + total;
            updatePercentage(percentageElement, good, total);
          };

          try {
            const alreadyCounted = countedStorageKeys.has(storageKey);
            countedStorageKeys.add(storageKey);
            const saved = localStorage.getItem(storageKey);
            if (!saved) {
              updateScore(0, 0);
              return;
            }

            const parsed = JSON.parse(saved);
            const stats = parsed && parsed.stats ? parsed.stats : parsed;
            if (
              !stats ||
              !Number.isFinite(stats.good) ||
              !Number.isFinite(stats.total) ||
              stats.good < 0 ||
              stats.total < 0 ||
              stats.good > stats.total
            ) {
              console.warn("Score invalide pour l'exercice " + storageKey);
              return;
            }

            updateScore(stats.good, stats.total);
            if (!alreadyCounted) {
              globalGood += stats.good;
              globalTotal += stats.total;
            }
          } catch (error) {
            console.warn("Impossible de lire le score de l'exercice " + storageKey, error);
          }
        });

        document.getElementById("global-score-value").textContent =
          globalGood + " / " + globalTotal;
        updatePercentage(
          document.getElementById("global-score-percentage"),
          globalGood,
          globalTotal
        );
      }

      renderScores();
      window.addEventListener("pageshow", renderScores);
    </script>
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