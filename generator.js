#!/usr/bin/env node
/**
 * generateur-index.js
 *
 * Scanne les répertoires et les fichiers .html d'un dossier pour créer
 * des pages index.html, progression.html et badges.html pour les exercices.
 * La catégorie correspond au nom du répertoire (ex : math, francais).
 *
 * Usage :
 *   node generer-index.js              (scanne le dossier courant)
 *   node generer-index.js ./exercices  (scanne le dossier indiqué)
 *
 * - Chaque sous-dossier de premier niveau = une catégorie.
 * - Tous les fichiers .html trouvés dedans (même en sous-dossiers) sont listés.
 * - Les .html posés directement à la racine vont dans la catégorie "Divers".
 * - Les pages générées sont ignorées lors du scan.
 * - Le titre affiché est le <title> du fichier (sinon le nom du fichier).
 *
 * Aucune dépendance : Node.js seul (ES modules ou CommonJS, Node 14+).
 */

"use strict";

const fs = require("fs");
const path = require("path");

const OUTPUT_NAME = "index.html";
const PROGRESSION_NAME = "progression.html";
const BADGES_NAME = "badges.html";
const FALLBACK_CATEGORY = "Divers";
const GLOBAL_BADGES = [
  { id: "global-80", threshold: 80, icon: "🌟" },
  { id: "global-90", threshold: 90, icon: "🏆" },
  { id: "global-100", threshold: 100, icon: "💎" }
];
const GOOD_ANSWER_BADGES = [
  { threshold: 100, icon: "🌱", title: "Apprenti" },
  { threshold: 300, icon: "⭐", title: "Confirmé" },
  { threshold: 500, icon: "🏆", title: "Champion" },
  { threshold: 1000, icon: "💎", title: "Légende" }
];
const BADGE_ICONS = {
  "exercices-culture-instruments-musique": "🎼",
  "exercices-culture-oeuvres-art": "🎨",
  "exercices-anglais": "🔤",
  "exercices-geographie": "🌍",
  "exercices-accords": "📝",
  "exercices-conjugaison": "✍️",
  "exercices-natures-des-mots": "🔠",
  "score-noms-propres-communs": "🔡",
  "exercices-histoire-dates-cles": "📅",
  "exercices-histoire-personnages": "🏛️",
  "exercices-comparaisons": "⚖️",
  "exercices-conversions": "📏",
  "exercices-divisions": "➗",
  "exercices-doubles-moities": "✖️",
  "exercices-fractions": "🍕",
  "exercices-heures-minutes-secondes": "⏰",
  "exercices-perimetres-aires": "📐",
  "exercices-problemes": "🧩",
  "exercices-tables-multiplications": "🔢",
  "exercices-ce2-add-sous": "➕",
  "exercices-sciences-animaux-habitats": "🐾",
  "exercices-sciences-corps-humain": "🫀",
  "exercices-sciences-cycle-eau": "💧",
  "exercices-sciences-systeme-solaire": "🪐"
};

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
      if ([OUTPUT_NAME, PROGRESSION_NAME, BADGES_NAME].includes(entry.name.toLowerCase())) continue;
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
      ![OUTPUT_NAME, PROGRESSION_NAME, BADGES_NAME].includes(entry.name.toLowerCase())
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

function getBadgeIcon(exercise) {
  return BADGE_ICONS[exercise.storageKey] || "🏅";
}

function buildGlobalBadgesSection() {
  const cards = GLOBAL_BADGES.map(
    (badge) =>
      '          <article class="badge-card global-badge-card" data-global-threshold="' +
      badge.threshold + '">\n' +
      '            <span class="badge-icon" aria-hidden="true">' + badge.icon + "</span>\n" +
      "            <h4>" + badge.threshold + " % de réussite globale</h4>\n" +
      "            <p>Au moins 20 réponses dans chaque exercice et " + badge.threshold +
      " % de réussite.</p>\n" +
      '            <span class="badge-status">20 réponses requises dans chaque exercice</span>\n' +
      "          </article>"
  ).join("\n");

  return `        <div class="badge-category global-badge-category">
          <h3>Badges globaux</h3>
          <div class="badge-grid">
${cards}
          </div>
        </div>`;
}

function buildGoodAnswerBadgesSection() {
  const cards = GOOD_ANSWER_BADGES.map(
    (badge) =>
      '          <article class="badge-card good-answer-badge" data-good-threshold="' +
      badge.threshold + '">\n' +
      '            <span class="badge-icon" aria-hidden="true">' + badge.icon + "</span>\n" +
      "            <h4>" + badge.title + "</h4>\n" +
      "            <p>Répondre correctement à " + badge.threshold + " questions au total.</p>\n" +
      '            <span class="badge-status">0 / ' + badge.threshold + " bonnes réponses</span>\n" +
      "          </article>"
  ).join("\n");

  return `        <div class="badge-category good-answer-badge-category">
          <h3>Badges de bonnes réponses</h3>
          <div class="badge-grid">
${cards}
          </div>
        </div>`;
}

function buildBadgesSection(categories) {
  const badgeCategories = categories
    .map((category) => {
      const badges = category.exercises
        .map(
          (exercise) =>
            '            <article class="badge-card" data-score-key="' +
            escapeHtml(exercise.storageKey || "") +
            '">\n' +
            '              <span class="badge-icon" aria-hidden="true">' +
            escapeHtml(getBadgeIcon(exercise)) + "</span>\n" +
            "              <h4>" + escapeHtml(exercise.title) + "</h4>\n" +
            "              <p>Au moins 10 réponses et 80 % de réussite.</p>\n" +
            '              <span class="badge-status">0 / 10 réponses</span>\n' +
            "            </article>"
        )
        .join("\n");

      return (
        '        <div class="badge-category">\n' +
        "          <h3>" + escapeHtml(category.category) + "</h3>\n" +
        '          <div class="badge-grid">\n' + badges + "\n          </div>\n" +
        "        </div>"
      );
    })
    .join("\n");

  const exerciseBadgeCount = categories.reduce(
    (count, category) => count + category.exercises.length,
    0
  );
  const badgeCount =
    exerciseBadgeCount + GLOBAL_BADGES.length + GOOD_ANSWER_BADGES.length;

  return `      <section class="badges-panel" aria-labelledby="badges-title" data-exercise-count="${exerciseBadgeCount}">
        <h2 id="badges-title">Mes badges</h2>
        <p id="badge-summary" role="status">0 / ${badgeCount} badges débloqués.</p>
${badgeCategories}
${buildGlobalBadgesSection()}
${buildGoodAnswerBadgesSection()}
      </section>`;
}

function buildBadgesSummary(categories) {
  const badgeCount = categories.reduce(
    (count, category) => count + category.exercises.length,
    0
  ) + GLOBAL_BADGES.length + GOOD_ANSWER_BADGES.length;
  const earnedBadges = categories
    .flatMap((category) => category.exercises)
    .map(
      (exercise) =>
        '          <span class="earned-badge earned-badge-top" data-badge-scope="summary" data-score-key="' +
        escapeHtml(exercise.storageKey || "") +
        '" hidden><span class="earned-badge-icon" aria-hidden="true">' +
        escapeHtml(getBadgeIcon(exercise)) +
        "</span><span>" + escapeHtml(exercise.title) + "</span></span>"
    )
    .join("\n");
  const globalBadges = GLOBAL_BADGES.map(
    (badge) =>
      '          <span class="earned-badge earned-global-badge" data-global-threshold="' +
      badge.threshold + '" hidden><span class="earned-badge-icon" aria-hidden="true">' +
      badge.icon + "</span><span>" + badge.threshold + " % global</span></span>"
  ).join("\n");
  const goodAnswerBadges = GOOD_ANSWER_BADGES.map(
    (badge) =>
      '          <span class="earned-badge earned-good-answer-badge" data-good-threshold="' +
      badge.threshold + '" hidden><span class="earned-badge-icon" aria-hidden="true">' +
      badge.icon + "</span><span>" + badge.title + " · " + badge.threshold + "</span></span>"
  ).join("\n");

  const exerciseCount = categories.reduce(
    (count, category) => count + category.exercises.length,
    0
  );

  return `      <section class="badges-summary" aria-labelledby="badges-summary-title" data-exercise-count="${exerciseCount}">
        <h2 id="badges-summary-title">Mes badges</h2>
        <p><span id="badge-summary-earned">0</span> / ${badgeCount} badges débloqués</p>
        <p id="earned-badges-empty">Les badges obtenus apparaîtront ici.</p>
        <div class="earned-badges" aria-live="polite">
${earnedBadges}
${globalBadges}
${goodAnswerBadges}
        </div>
        <a href="${BADGES_NAME}">Voir tous mes badges →</a>
      </section>`;
}

function buildBadgesSummaryScript() {
  return `        function isExerciseBadgeEarned(good, total) {
    return total >= 10 && good / total >= 0.8;
  }

        function renderBadgeSummary() {
    let earnedCount = 0;
    let globalGood = 0;
    let globalTotal = 0;
    let goodAnswerTotal = 0;
    let goodAnswerStatsValid = true;
    let allExercisesReady = true;
    const countedStorageKeys = new Set();
    const badgeElements = document.querySelectorAll(".earned-badge");

    badgeElements.forEach((badge) => {
      if (badge.dataset.globalThreshold) return;
      const storageKey = badge.dataset.scoreKey;
      if (!storageKey) return;
      badge.hidden = true;
      badge.classList.toggle("perfect-score-badge", false);
      try {
        const saved = localStorage.getItem(storageKey);
        const parsed = saved ? JSON.parse(saved) : null;
        const stats = parsed && parsed.stats ? parsed.stats : parsed;
        const valid = !stats || (
          Number.isFinite(stats.good) &&
          Number.isFinite(stats.total) &&
          stats.good >= 0 &&
          stats.total >= 0 &&
          stats.good <= stats.total
        );
        if (!valid) {
          console.warn("Score invalide pour l’exercice " + storageKey);
          allExercisesReady = false;
          goodAnswerStatsValid = false;
          return;
        }

        const total = stats ? stats.total : 0;
        const good = stats ? stats.good : 0;
        const earned = isExerciseBadgeEarned(good, total);
        badge.classList.toggle(
          "perfect-score-badge",
          earned && total > 0 && good === total
        );
        badge.hidden = !earned;
        if (earned && badge.classList.contains("earned-badge-top")) earnedCount++;
        if (!countedStorageKeys.has(storageKey)) {
          countedStorageKeys.add(storageKey);
          globalGood += good;
          globalTotal += total;
          goodAnswerTotal += good;
          if (total < 20) allExercisesReady = false;
        }
      } catch (error) {
        console.warn("Impossible de lire le score de l’exercice " + storageKey, error);
        allExercisesReady = false;
        goodAnswerStatsValid = false;
      }
    });

    const expectedExercises = Number(
      document.querySelector(".badges-summary").dataset.exerciseCount
    );
    allExercisesReady =
      allExercisesReady && countedStorageKeys.size >= expectedExercises;
    const globalPercentage = globalTotal > 0 ? (globalGood / globalTotal) * 100 : 0;
    document.querySelectorAll(".earned-global-badge").forEach((badge) => {
      const threshold = Number(badge.dataset.globalThreshold);
      const earned = allExercisesReady && globalPercentage >= threshold;
      badge.classList.toggle("perfect-score-badge", earned && threshold === 100);
      badge.hidden = !earned;
      if (earned) earnedCount++;
    });
    document.querySelectorAll(".earned-good-answer-badge").forEach((badge) => {
      const earned = goodAnswerStatsValid &&
        goodAnswerTotal >= Number(badge.dataset.goodThreshold);
      badge.hidden = !earned;
      if (earned) earnedCount++;
    });

    document.getElementById("badge-summary-earned").textContent = earnedCount;
    document.getElementById("earned-badges-empty").hidden = earnedCount > 0;
    document.querySelectorAll(".category-earned-badges").forEach((category) => {
      const visibleBadge = Array.from(category.querySelectorAll(".earned-badge"))
        .some((badge) => !badge.hidden);
      category.hidden = !visibleBadge;
    });
  }
`;
}

function buildBadgeScript() {
  return `      function isExerciseBadgeEarned(good, total) {
        return total >= 10 && good / total >= 0.8;
      }

      function renderBadges() {
        let earnedCount = 0;
        let globalGood = 0;
        let globalTotal = 0;
        let goodAnswerTotal = 0;
        let goodAnswerStatsValid = true;
        let allExercisesReady = true;
        const countedStorageKeys = new Set();
        document.querySelectorAll(".badge-card").forEach((card) => {
          const storageKey = card.dataset.scoreKey;
          const status = card.querySelector(".badge-status");
          card.classList.toggle("earned", false);
          card.classList.toggle("perfect-score-badge", false);
          if (!storageKey) {
            return;
          }

          let stats = null;
          try {
            const saved = localStorage.getItem(storageKey);
            const parsed = saved ? JSON.parse(saved) : null;
            stats = parsed && parsed.stats ? parsed.stats : parsed;
          } catch (error) {
            console.warn("Impossible de lire le score de l’exercice " + storageKey, error);
            status.textContent = "Score indisponible";
            allExercisesReady = false;
            goodAnswerStatsValid = false;
            return;
          }

          if (
            stats &&
            (!Number.isFinite(stats.good) ||
              !Number.isFinite(stats.total) ||
              stats.good < 0 ||
              stats.total < 0 ||
              stats.good > stats.total)
          ) {
            console.warn("Score invalide pour l’exercice " + storageKey);
            status.textContent = "Score invalide";
            allExercisesReady = false;
            goodAnswerStatsValid = false;
            return;
          }

          const total = stats ? stats.total : 0;
          const good = stats ? stats.good : 0;
          const earned = isExerciseBadgeEarned(good, total);
          card.classList.toggle("earned", earned);
          card.classList.toggle(
            "perfect-score-badge",
            earned && total > 0 && good === total
          );
          status.textContent = earned
            ? "Débloqué !"
            : total < 10
              ? total + " / 10 réponses"
              : Math.round((good / total) * 100) + " % · objectif 80 %";
          if (earned) earnedCount++;
          if (!countedStorageKeys.has(storageKey)) {
            countedStorageKeys.add(storageKey);
            globalGood += good;
            globalTotal += total;
            goodAnswerTotal += good;
            if (total < 20) allExercisesReady = false;
          }
        });

        const expectedExercises = Number(
          document.querySelector(".badges-panel").dataset.exerciseCount
        );
        allExercisesReady =
          allExercisesReady && countedStorageKeys.size >= expectedExercises;
        const globalPercentage = globalTotal > 0 ? (globalGood / globalTotal) * 100 : 0;
        document.querySelectorAll(".global-badge-card").forEach((card) => {
          const threshold = Number(card.dataset.globalThreshold);
          const status = card.querySelector(".badge-status");
          const earned = allExercisesReady && globalPercentage >= threshold;
          card.classList.toggle("earned", earned);
          card.classList.toggle(
            "perfect-score-badge",
            earned && threshold === 100 && globalPercentage === 100
          );
          status.textContent = earned
            ? "Débloqué !"
            : !allExercisesReady
              ? "20 réponses requises dans chaque exercice"
              : Math.round(globalPercentage) + " % · objectif " + threshold + " %";
          if (earned) earnedCount++;
        });
        document.querySelectorAll(".good-answer-badge").forEach((card) => {
          const threshold = Number(card.dataset.goodThreshold);
          const status = card.querySelector(".badge-status");
          const earned = goodAnswerStatsValid && goodAnswerTotal >= threshold;
          card.classList.toggle("earned", earned);
          status.textContent = earned
            ? "Débloqué !"
            : goodAnswerStatsValid
              ? goodAnswerTotal + " / " + threshold + " bonnes réponses"
              : "Scores indisponibles";
          if (earned) earnedCount++;
        });

        document.getElementById("badge-summary").textContent =
          earnedCount + " / " + document.querySelectorAll(".badge-card").length +
          " badges débloqués.";
      }
`;
}

function buildBadgesHtml(categories, generationInfo) {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mes badges — Exercices</title>
    <link rel="stylesheet" href="core/style.css" />
  </head>
  <body>
    <div class="wrap">
      <p class="back-link"><a href="index.html">← Retour aux exercices</a></p>
      <h1>🏅 Mes badges</h1>
      <p class="subtitle">Les badges d’exercice se débloquent avec au moins 10 réponses et 80 % de réussite. Les badges de réussite globale demandent au moins 20 réponses dans chaque exercice ; les badges de bonnes réponses comptent toutes les bonnes réponses cumulées.</p>
${buildBadgesSection(categories)}
      <p class="progress-link"><a href="progression.html">📈 Voir ma progression complète →</a></p>
      <footer>${generationInfo}</footer>
    </div>
    <script>
${buildBadgeScript()}
      renderBadges();
      window.addEventListener("pageshow", renderBadges);
      window.addEventListener("storage", renderBadges);
    </script>
  </body>
</html>
`;
}

function buildProgressionHtml(categories, generationInfo) {
  const sections = categories
    .map((cat) => {
      const rows = cat.exercises
        .map(
          (ex) =>
            '          <article class="progress-item" data-score-key="' +
            escapeHtml(ex.storageKey || "") +
            '">\n' +
            '            <div class="progress-item-heading"><a href="' +
            escapeHtml(ex.rel) +
            '">' +
            escapeHtml(ex.title) +
            '</a><span class="progress-score">Pas encore commencé</span></div>\n' +
            '            <progress class="exercise-progress-bar" max="100" value="0" aria-label="Progression : ' +
            escapeHtml(ex.title) +
            '"></progress>\n' +
            '            <p class="progress-detail">Aucune réponse enregistrée.</p>\n' +
            "          </article>"
        )
        .join("\n");

      return (
        '      <section class="progress-category">\n' +
        "        <h2>" + escapeHtml(cat.category) + "</h2>\n" +
        '        <div class="progress-list">\n' + rows + "\n        </div>\n" +
        "      </section>"
      );
    })
    .join("\n\n");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ma progression — Exercices</title>
    <link rel="stylesheet" href="core/style.css" />
  </head>
  <body>
    <div class="wrap">
      <p class="back-link"><a href="index.html">← Retour aux exercices</a></p>
      <h1>📈 Ma progression</h1>
      <p class="progress-link"><a href="${BADGES_NAME}">🏅 Voir mes badges →</a></p>
      <section class="global-score" aria-live="polite">
        <h2>Mon score général</h2>
        <p><span id="progress-global-score">0 / 0</span> · <span id="progress-global-percentage" class="global-score-percentage">— %</span></p>
        <p id="started-exercises">0 exercice pratiqué</p>
      </section>
${sections}
      <details class="reset-scores-panel">
        <summary>Réinitialiser les scores</summary>
        <p>Les scores seront remis à zéro. Tes réglages seront conservés.</p>
        <button id="reset-scores-button" type="button">Réinitialiser tous les scores</button>
        <p id="reset-scores-status" role="status" aria-live="polite"></p>
      </details>
      <footer>${generationInfo}</footer>
    </div>
    <script>
${buildBadgeScript()}
      function applyScoreColor(element, percentage, total) {
        element.classList.remove("score-low", "score-medium", "score-high");
        if (total < 20) {
          element.classList.add("score-low");
          return;
        }
        element.classList.add(
          percentage < 80 ? "score-low" : percentage < 92 ? "score-medium" : "score-high"
        );
      }

      function updatePercentage(element, good, total) {
        const percentage = total > 0 ? Math.round((good / total) * 100) : null;
        element.textContent = percentage === null ? "— %" : percentage + " %";
        if (percentage !== null) {
          applyScoreColor(element, percentage, total);
        } else {
          element.classList.remove("score-low", "score-medium", "score-high");
        }
        return percentage;
      }

      function renderProgress() {
        let globalGood = 0;
        let globalTotal = 0;
        let startedCount = 0;
        const countedStorageKeys = new Set();

        document.querySelectorAll(".progress-item").forEach((item) => {
          const storageKey = item.dataset.scoreKey;
          const scoreElement = item.querySelector(".progress-score");
          const detailElement = item.querySelector(".progress-detail");
          const progressElement = item.querySelector(".exercise-progress-bar");
          progressElement.value = 0;
          applyScoreColor(scoreElement, 0, 0);
          applyScoreColor(progressElement, 0, 0);
          if (!storageKey) {
            scoreElement.textContent = "Score non suivi";
            detailElement.textContent = "Cet exercice n’enregistre pas encore de score.";
            return;
          }

          try {
            const saved = localStorage.getItem(storageKey);
            const parsed = saved ? JSON.parse(saved) : null;
            const stats = parsed && parsed.stats ? parsed.stats : parsed;
            if (!stats) return;
            if (
              !Number.isFinite(stats.good) ||
              !Number.isFinite(stats.total) ||
              stats.good < 0 ||
              stats.total < 0 ||
              stats.good > stats.total
            ) {
              console.warn("Score invalide pour l’exercice " + storageKey);
              return;
            }

            scoreElement.textContent = stats.good + " / " + stats.total + " bonnes réponses";
            if (stats.total === 0) return;

            const percentage = Math.round((stats.good / stats.total) * 100);
            applyScoreColor(scoreElement, percentage, stats.total);
            applyScoreColor(progressElement, percentage, stats.total);
            progressElement.value = percentage;
            detailElement.textContent =
              stats.total + " question(s) répondue(s) · " + percentage + " % de réussite";

            if (!countedStorageKeys.has(storageKey)) {
              countedStorageKeys.add(storageKey);
              startedCount++;
              globalGood += stats.good;
              globalTotal += stats.total;
            }
          } catch (error) {
            console.warn("Impossible de lire le score de l’exercice " + storageKey, error);
          }
        });

        document.getElementById("progress-global-score").textContent =
          globalGood + " / " + globalTotal;
        updatePercentage(
          document.getElementById("progress-global-percentage"),
          globalGood,
          globalTotal
        );
        document.getElementById("started-exercises").textContent =
          startedCount + " exercice(s) pratiqué(s).";
        renderBadges();
      }

      document.getElementById("reset-scores-button").addEventListener("click", () => {
        if (!window.confirm("Veux-tu vraiment remettre à zéro les scores de tous les exercices ?")) {
          return;
        }

        let resetCount = 0;
        let errorCount = 0;
        const storageKeys = new Set(
          Array.from(document.querySelectorAll(".progress-item"))
            .map((item) => item.dataset.scoreKey)
            .filter(Boolean)
        );

        storageKeys.forEach((storageKey) => {
          try {
            const saved = localStorage.getItem(storageKey);
            if (!saved) return;

            const parsed = JSON.parse(saved);
            let stats = parsed && parsed.stats;
            if (!stats && parsed && Number.isFinite(parsed.good) && Number.isFinite(parsed.total)) {
              stats = parsed;
            }
            if (!stats || !Number.isFinite(stats.good) || !Number.isFinite(stats.total)) {
              console.warn("Format de score non reconnu pour l’exercice " + storageKey);
              errorCount++;
              return;
            }

            stats.good = 0;
            stats.total = 0;
            localStorage.setItem(storageKey, JSON.stringify(parsed));
            resetCount++;
          } catch (error) {
            console.warn("Impossible de réinitialiser le score de l’exercice " + storageKey, error);
            errorCount++;
          }
        });

        const status = document.getElementById("reset-scores-status");
        status.textContent = errorCount > 0
          ? resetCount + " score(s) réinitialisé(s). " + errorCount +
            " score(s) n’ont pas pu être réinitialisés ; consulte la console."
          : resetCount + " score(s) réinitialisé(s). Tes réglages sont conservés.";
        renderProgress();
      });

      renderProgress();
      window.addEventListener("pageshow", renderProgress);
      window.addEventListener("storage", renderProgress);
    </script>
  </body>
</html>
`;
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
            '<span class="exercise-score-percentage">— %</span></span>' +
            '</a>'
        )
        .join("\n");
      const earnedBadges = cat.exercises
        .map(
          (exercise) =>
            '        <span class="earned-badge earned-badge-category" data-badge-scope="category" data-score-key="' +
            escapeHtml(exercise.storageKey || "") +
            '" hidden><span class="earned-badge-icon" aria-hidden="true">' +
            escapeHtml(getBadgeIcon(exercise)) +
            "</span><span>" + escapeHtml(exercise.title) + "</span></span>"
        )
        .join("\n");

      return (
        '  <section class="category" id="' + escapeHtml(slug(cat.category)) + '">\n' +
        '    <h2>' + escapeHtml(cat.category) +
        ' <span class="count">' + cat.exercises.length + "</span></h2>\n" +
        '    <div class="category-earned-badges" hidden>\n' +
        '      <h3>Badges obtenus</h3>\n' +
        '      <div class="earned-badges">\n' + earnedBadges + "\n      </div>\n" +
        "    </div>\n" +
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
${buildBadgesSummary(categories)}
      <section class="global-score" aria-live="polite">
        <h2>Score global</h2>
        <p><span id="global-score-value">0 / 0</span> · <span id="global-score-percentage" class="global-score-percentage">— %</span></p>
      </section>
      <p class="progress-link"><a href="progression.html">📈 Voir ma progression complète →</a></p>
      <div class="exercise-search">
        <label for="exercise-search-input">Rechercher un exercice</label>
        <input id="exercise-search-input" type="search" placeholder="Ex. fractions, animaux, conjugaison…" autocomplete="off" />
        <p id="exercise-search-status" role="status" aria-live="polite"></p>
      </div>
${sections}
      <footer>${generationInfo}</footer>
    </div>
    <script>
${buildBadgesSummaryScript()}
      const searchInput = document.getElementById("exercise-search-input");
      const searchStatus = document.getElementById("exercise-search-status");

      function normalizeSearchText(text) {
        return text
          .normalize("NFD")
          .replace(/[\\u0300-\\u036f]/g, "")
          .toLocaleLowerCase("fr");
      }

      function filterExercises() {
        const query = normalizeSearchText(searchInput.value.trim());
        let visibleCount = 0;

        document.querySelectorAll(".category").forEach((category) => {
          let categoryVisibleCount = 0;
          const categoryName = category.querySelector("h2").childNodes[0].textContent;

          category.querySelectorAll("a.card").forEach((card) => {
            const title = card.childNodes[0].textContent;
            const matches = normalizeSearchText(categoryName + " " + title).includes(query);
            card.hidden = !matches;
            if (matches) {
              categoryVisibleCount++;
              visibleCount++;
            }
          });

          category.hidden = categoryVisibleCount === 0;
        });

        document.querySelectorAll(".nav a").forEach((link) => {
          const category = document.querySelector(link.getAttribute("href"));
          link.hidden = !category || category.hidden;
        });

        searchStatus.textContent =
          visibleCount === 0 ? "Aucun exercice trouvé." : visibleCount + " exercice(s) trouvé(s).";
        searchStatus.hidden = query.length === 0;
      }

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
        let startedCount = 0;
        const countedStorageKeys = new Set();

        document.querySelectorAll(".exercise-score").forEach((scoreElement) => {
          const storageKey = scoreElement.dataset.scoreKey;
          if (!storageKey) return;

          const valueElement = scoreElement.querySelector(".exercise-score-value");
          const percentageElement = scoreElement.querySelector(".exercise-score-percentage");
          const exerciseCard = scoreElement.closest("a.card");
          exerciseCard.classList.remove("perfect-score");
          const updateScore = (good, total) => {
            valueElement.textContent = good + " / " + total;
            updatePercentage(percentageElement, good, total);
            exerciseCard.classList.toggle(
              "perfect-score",
              isExerciseBadgeEarned(good, total) &&
                total > 0 &&
                good === total
            );
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
              if (stats.total > 0) startedCount++;
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
        renderBadgeSummary();
      }

      searchInput.addEventListener("input", filterExercises);
      filterExercises();
      renderScores();
      window.addEventListener("pageshow", renderScores);
      window.addEventListener("storage", renderScores);
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

  const generationInfo = `${total} exercice${total > 1 ? "s" : ""} — généré le ${new Date().toLocaleString("fr-FR")}`;
  const html = buildHtml(root, categories);
  const progressionHtml = buildProgressionHtml(categories, generationInfo);
  const badgesHtml = buildBadgesHtml(categories, generationInfo);
  const outPath = path.join(root, OUTPUT_NAME);
  const progressionPath = path.join(root, PROGRESSION_NAME);
  const badgesPath = path.join(root, BADGES_NAME);

  // Dossier OneDrive « en ligne uniquement » ou chemin déplacé : on s'assure
  // que le dossier de sortie existe bien sur le disque avant d'écrire.
  try {
    fs.mkdirSync(root, { recursive: true });
  } catch (e) {
    /* on tente l'écriture quand même */
  }

  let failedPath = outPath;
  try {
    fs.writeFileSync(outPath, html, "utf8");
    failedPath = progressionPath;
    fs.writeFileSync(progressionPath, progressionHtml, "utf8");
    failedPath = badgesPath;
    fs.writeFileSync(badgesPath, badgesHtml, "utf8");
  } catch (e) {
    console.error("");
    console.error("Échec de l'écriture de : " + failedPath);
    console.error("Erreur système : " + (e.code || "?") + " — " + e.message);

    // Repli : on essaie d'écrire à côté du script
    const scriptDir = path.dirname(path.resolve(process.argv[1] || "."));
    const fallbackPath = path.join(scriptDir, OUTPUT_NAME);
    const fallbackProgressionPath = path.join(scriptDir, PROGRESSION_NAME);
    const fallbackBadgesPath = path.join(scriptDir, BADGES_NAME);
    if (fallbackPath !== path.resolve(outPath) && failedPath === outPath) {
      try {
        fs.writeFileSync(fallbackPath, html, "utf8");
        fs.writeFileSync(fallbackProgressionPath, progressionHtml, "utf8");
        fs.writeFileSync(fallbackBadgesPath, badgesHtml, "utf8");
        console.error("=> Le fichier a été écrit ici à la place : " + fallbackPath);
        console.error("   Déplace les trois pages dans le dossier scanné");
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
  console.log("Page générée : " + progressionPath);
  console.log("Page générée : " + badgesPath);
}

main();