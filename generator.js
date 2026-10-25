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
const DAILY_CHALLENGE_NAME = "defi-du-jour.html";
const DAILY_CHALLENGE_QUESTION_COUNT = 5;
const DAILY_CHALLENGE_POOL_SIZE = 120;
const DAILY_CHALLENGE_COMPLETIONS_KEY = "daily-challenge:completed";
const DAILY_CHALLENGE_RESULT_PREFIX = "daily-challenge:result:";
const DAILY_CHALLENGE_BADGES = [
  { threshold: 20, icon: "🌱", title: "20 défis terminés" },
  { threshold: 50, icon: "⭐", title: "50 défis terminés" },
  { threshold: 100, icon: "🏆", title: "100 défis terminés" },
  { threshold: 200, icon: "💎", title: "200 défis terminés" }
];
const DAILY_CHALLENGE_BANK_FILES = [
  "accords.json",
  "anglais-vocabulaire.json",
  "conjugaison.json",
  "conversions-mesures.json",
  "culture-instruments-musique.json",
  "culture-oeuvres-art.json",
  "geographie-capitales-departements.json",
  "geographie-continents-oceans.json",
  "histoire-dates-cles.json",
  "histoire-personnages.json",
  "monnaie.json",
  "natures-mots.json",
  "noms-propres-communs.json",
  "operations-numeriques.json",
  "petits-problemes.json",
  "sciences-animaux-habitats.json",
  "sciences-corps-humain.json",
  "sciences-cycle-eau.json",
  "sciences-plantes.json",
  "sciences-systeme-solaire.json",
  "synonymes-contraires.json"
];
const FALLBACK_CATEGORY = "Divers";
const GLOBAL_BADGES = [
  { id: "global-80", threshold: 80, icon: "🌟" },
  { id: "global-90", threshold: 90, icon: "🏆" },
  { id: "global-95", threshold: 95, icon: "🥇" },
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
  "exercices-fractions": "½",
  "exercices-heures-minutes-secondes": "⏰",
  "exercices-perimetres-aires": "📐",
  "exercices-problemes": "🧩",
  "exercices-tables-multiplications": "🔢",
  "exercices-ce2-add-sous": "➕",
  "exercices-sciences-animaux-habitats": "🐾",
  "exercices-sciences-corps-humain": "🫀",
  "exercices-sciences-cycle-eau": "💧",
  "exercices-sciences-plantes": "🌱",
  "exercices-sciences-systeme-solaire": "🪐",
  "exercices-monnaie": "💶",
  "exercices-synonymes-contraires": "🔤",
  "exercices-geographie-continents-oceans": "🌍"
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
      if ([OUTPUT_NAME, PROGRESSION_NAME, BADGES_NAME, DAILY_CHALLENGE_NAME].includes(entry.name.toLowerCase())) continue;
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
      ![OUTPUT_NAME, PROGRESSION_NAME, BADGES_NAME, DAILY_CHALLENGE_NAME].includes(entry.name.toLowerCase())
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

function createSeededRandom(seedText) {
  let seed = 2166136261;
  for (const character of seedText) {
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  }
  return function () {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function loadDailyChallengeQuestions(root, categories) {
  const data = Object.fromEntries(
    DAILY_CHALLENGE_BANK_FILES.map((file) => [
      file,
      JSON.parse(fs.readFileSync(path.join(root, "data", file), "utf8"))
    ])
  );
  const exerciseInfo = new Map(
    categories.flatMap((category) =>
      category.exercises
        .filter((exercise) => exercise.storageKey)
        .map((exercise) => [
          exercise.storageKey,
          { title: exercise.title, category: category.category, rel: exercise.rel }
        ])
    )
  );
  const questionPools = new Map();

  function addQuestion(key, prompt, answer, distractors) {
    if (
      typeof prompt !== "string" ||
      !prompt.trim() ||
      answer === null ||
      answer === undefined ||
      String(answer).trim() === ""
    ) {
      return;
    }

    const answerText = String(answer);
    const options = [...new Set(
      distractors.map(String).filter((option) => option !== answerText)
    )].slice(0, 3);
    if (options.length < 3) return;
    options.push(answerText);
    if (!questionPools.has(key)) questionPools.set(key, []);
    questionPools.get(key).push({ prompt: prompt.trim(), answer: answerText, options });
  }

  function addChoiceQuestion(key, item, prompt, field) {
    if (!item) {
      return;
    }
    let questionPrompt = item.enonce;
    if (!questionPrompt && field && typeof item[field] === "string") {
      questionPrompt = prompt + " « " + item[field] + " » ?";
    }
    if (
      typeof item.reponse === "string" &&
      Array.isArray(item.options) &&
      item.options.every((option) => typeof option === "string") &&
      item.options.includes(item.reponse)
    ) {
      addQuestion(key, questionPrompt, item.reponse, item.options);
    } else if (Array.isArray(item.reponse) && item.reponse.length > 1) {
      const answer = item.reponse.join(" → ");
      const alternatives = [
        [...item.reponse].reverse(),
        [...item.reponse.slice(1), item.reponse[0]],
        [...item.reponse.slice(0, -1)].reverse().concat(item.reponse[item.reponse.length - 1]),
        [...item.reponse]
      ].map((sequence) => sequence.join(" → "));
      addQuestion(key, questionPrompt, answer, alternatives);
    }
  }

  const directSources = [
    ["exercices-culture-instruments-musique", "culture-instruments-musique.json", "À quelle famille appartient l’instrument", "instrument"],
    ["exercices-culture-oeuvres-art", "culture-oeuvres-art.json", "Qui a créé l’œuvre", "oeuvre"],
    ["exercices-histoire-dates-cles", "histoire-dates-cles.json", "", null],
    ["exercices-histoire-personnages", "histoire-personnages.json", "Quel rôle historique avait", "personnage"],
    ["exercices-sciences-animaux-habitats", "sciences-animaux-habitats.json", "Dans quel habitat vit", "animal"],
    ["exercices-sciences-corps-humain", "sciences-corps-humain.json", "Quelle est la fonction du", "organe"],
    ["exercices-sciences-cycle-eau", "sciences-cycle-eau.json", "", null],
    ["exercices-sciences-plantes", "sciences-plantes.json", "", null],
    ["exercices-sciences-systeme-solaire", "sciences-systeme-solaire.json", "", null],
    ["exercices-monnaie", "monnaie.json", "", null],
    ["exercices-synonymes-contraires", "synonymes-contraires.json", "", null],
    ["exercices-geographie-continents-oceans", "geographie-continents-oceans.json", "", null]
  ];
  for (const [key, file, prompt, field] of directSources) {
    const questions = data[file].questions;
    if (!Array.isArray(questions)) {
      throw new Error("La banque de questions est invalide : " + file);
    }
    questions.forEach((item) => addChoiceQuestion(key, item, prompt, field));
  }

  const englishPairs = Object.values(data["anglais-vocabulaire.json"].THEMES).flat();
  const englishAnswers = englishPairs.map((pair) => pair[1]);
  englishPairs.forEach(([french, english]) =>
    addQuestion("exercices-anglais", "Comment dit-on « " + french + " » en anglais ?", english, englishAnswers)
  );

  const geography = data["geographie-capitales-departements.json"];
  const geoQuestions = [
    [geography.EUROPE, "Quelle est la capitale de"],
    [geography.MONDE, "Quelle est la capitale de"],
    [geography.DEPARTEMENTS, "Dans quel département se trouve la ville de"],
    [geography.REGIONS, "Dans quelle région se trouve la ville de"],
    [geography.FLEUVES, "Par quelle ville passe le fleuve"]
  ];
  for (const [entries, prompt] of geoQuestions) {
    if (!entries || typeof entries !== "object") continue;
    const answers = Object.values(entries);
    Object.entries(entries).forEach(([subject, answer]) =>
      addQuestion("exercices-geographie", prompt + " " + subject + " ?", answer, answers)
    );
  }

  data["accords.json"].WORDS.forEach(([masculine, plural, feminine]) => {
    addQuestion("exercices-accords", "Mets « " + masculine + " » au pluriel.", plural,
      data["accords.json"].WORDS.map((word) => word[1]));
    addQuestion("exercices-accords", "Mets « " + masculine + " » au féminin.", feminine,
      data["accords.json"].WORDS.map((word) => word[2]));
  });

  const conjugation = data["conjugaison.json"];
  const persons = conjugation.PERSONS.map((person) => person[0]);
  for (const [tense, endings] of Object.entries(conjugation.G1_ENDINGS)) {
    conjugation.G1.forEach((verb) => {
      const stem = verb.replace(/er$/, "");
      persons.forEach((person, index) => {
        const answer = stem + endings[index];
        const alternatives = conjugation.G1
          .map((otherVerb) => otherVerb.replace(/er$/, "") + endings[index]);
        addQuestion(
          "exercices-conjugaison",
          "Conjugue « " + verb + " » au " + tense + " avec « " + person + " ».",
          answer,
          alternatives
        );
      });
    });
  }
  for (const [verb, tenses] of Object.entries(conjugation.IRR)) {
    for (const [tense, forms] of Object.entries(tenses)) {
      forms.forEach((answer, index) => {
        const alternatives = Object.values(conjugation.IRR)
          .flatMap((otherTenses) => otherTenses[tense] || [])
          .filter((form) => form !== answer);
        addQuestion(
          "exercices-conjugaison",
          "Conjugue « " + verb + " » au " + tense + " avec « " + persons[index] + " ».",
          answer,
          alternatives
        );
      });
    }
  }

  const natures = data["natures-mots.json"];
  const natureLabels = Object.fromEntries(natures.NATURES.map((nature) => [nature.id, nature.label]));
  const allNatureLabels = Object.values(natureLabels);
  for (const [nature, words] of Object.entries(natures.DATA)) {
    words.forEach((word) =>
      addQuestion("exercices-natures-des-mots", "Quelle est la nature du mot « " + word + " » ?",
        natureLabels[nature], allNatureLabels)
    );
  }

  const properCommon = data["noms-propres-communs.json"];
  const properKeys = ["PRENOMS", "VILLES", "PAYS_REGIONS", "MARQUES", "DIVERS_PROPRE"];
  const commonKeys = ["NOMS_COMMUNS", "COMMUNS2", "VERBES", "ADJECTIFS", "ADVERBES_ET_AUTRES"];
  for (const key of properKeys) {
    properCommon[key].forEach((word) =>
      addQuestion("score-noms-propres-communs", "« " + word + " » est-il un nom propre ou un nom commun ?",
        "Nom propre", ["Nom commun", "Verbe", "Adjectif"])
    );
  }
  for (const key of commonKeys) {
    properCommon[key].forEach((word) =>
      addQuestion("score-noms-propres-communs", "« " + word + " » est-il un nom propre ou un nom commun ?",
        "Nom commun", ["Nom propre", "Verbe", "Adjectif"])
    );
  }

  const conversionPairs = Object.values(data["conversions-mesures.json"].PAIRS).flat();
  conversionPairs.forEach(([from, to, factor]) => {
    [1, 2].forEach((value) => {
      const answer = value * factor;
      addQuestion(
        "exercices-conversions",
        "Convertis " + value + " " + from + " en " + to + ".",
        answer + " " + to,
        [answer + factor + " " + to, Math.max(0, answer - factor) + " " + to, answer * 10 + " " + to]
      );
      addQuestion(
        "exercices-conversions",
        "Convertis " + (value * factor) + " " + to + " en " + from + ".",
        value + " " + from,
        [
          (value + 1) + " " + from,
          Math.max(0, value - 1) + " " + from,
          (value * 10) + " " + from
        ]
      );
    });
  });

  const randomFor = (key) => createSeededRandom("daily-bank:" + key);
  const integer = (random, min, max) => min + Math.floor(random() * (max - min + 1));
  const numericDistractors = (answer, suffix = "") => {
    const candidates = [answer + 1, answer + 2, answer + 5, answer - 1, answer - 2, answer * 2]
      .filter((value) => value >= 0 && value !== answer);
    return candidates.slice(0, 3).map((value) => String(value) + suffix);
  };
  function addGeneratedNumberQuestion(key, prompt, answer, suffix = "") {
    addQuestion(key, prompt, String(answer) + suffix, numericDistractors(answer, suffix));
  }

  const addSubRandom = randomFor("exercices-ce2-add-sous");
  for (let index = 0; index < 80; index++) {
    const first = integer(addSubRandom, 10, 100);
    const second = integer(addSubRandom, 1, first);
    const isAddition = index % 2 === 0;
    const answer = isAddition ? first + second : first - second;
    addGeneratedNumberQuestion(
      "exercices-ce2-add-sous",
      "Combien font " + first + (isAddition ? " + " : " − ") + second + " ?",
      answer
    );
  }

  const compareRandom = randomFor("exercices-comparaisons");
  for (let index = 0; index < 80; index++) {
    const first = integer(compareRandom, 1, 999);
    const second = integer(compareRandom, 1, 999);
    const answer = Math.max(first, second);
    addGeneratedNumberQuestion(
      "exercices-comparaisons",
      "Quel est le plus grand nombre : " + first + " ou " + second + " ?",
      answer,
      ""
    );
  }

  const divisionRandom = randomFor("exercices-divisions");
  for (let index = 0; index < 80; index++) {
    const divisor = integer(divisionRandom, 2, 12);
    const quotient = integer(divisionRandom, 2, 30);
    addGeneratedNumberQuestion(
      "exercices-divisions",
      "Combien font " + (divisor * quotient) + " ÷ " + divisor + " ?",
      quotient
    );
  }

  const operationsRandom = randomFor("exercices-doubles-moities");
  const operationNames = data["operations-numeriques.json"].OP_LABELS;
  for (let index = 0; index < 80; index++) {
    const operation = ["double", "moitie", "triple", "quart"][index % 4];
    const multiplier =
      operation === "double" ? 2 :
        operation === "triple" ? 3 :
          operation === "quart" ? 0.25 : 0.5;
    const value = integer(operationsRandom, 2, 50) * (operation === "quart" || operation === "moitie" ? 4 : 1);
    addGeneratedNumberQuestion(
      "exercices-doubles-moities",
      operationNames[operation] + " " + value + " ?",
      value * multiplier
    );
  }

  const fractionRandom = randomFor("exercices-fractions");
  for (let index = 0; index < 80; index++) {
    const denominator = integer(fractionRandom, 2, 10);
    const numerator = integer(fractionRandom, 1, denominator - 1);
    const whole = denominator * integer(fractionRandom, 1, 10);
    addGeneratedNumberQuestion(
      "exercices-fractions",
      "Combien vaut " + numerator + "/" + denominator + " de " + whole + " ?",
      (whole / denominator) * numerator
    );
  }

  const timeRandom = randomFor("exercices-heures-minutes-secondes");
  for (let index = 0; index < 80; index++) {
    const hours = integer(timeRandom, 1, 12);
    addGeneratedNumberQuestion(
      "exercices-heures-minutes-secondes",
      "Combien de minutes y a-t-il dans " + hours + " h ?",
      hours * 60,
      " min"
    );
  }

  const geometryRandom = randomFor("exercices-perimetres-aires");
  for (let index = 0; index < 80; index++) {
    const length = integer(geometryRandom, 2, 30);
    const width = integer(geometryRandom, 2, 20);
    const areaQuestion = index % 2 === 0;
    addGeneratedNumberQuestion(
      "exercices-perimetres-aires",
      (areaQuestion ? "Quelle est l’aire" : "Quel est le périmètre") +
        " d’un rectangle de " + length + " cm sur " + width + " cm ?",
      areaQuestion ? length * width : 2 * (length + width),
      " cm" + (areaQuestion ? "²" : "")
    );
  }

  const problemData = data["petits-problemes.json"];
  const problemRandom = randomFor("exercices-problemes");
  for (let index = 0; index < 80; index++) {
    const [name, pronoun] = problemData.NAMES[index % problemData.NAMES.length];
    const [, objectPlural] = problemData.OBJECTS[index % problemData.OBJECTS.length];
    const first = integer(problemRandom, 2, 25);
    const second = integer(problemRandom, 2, 25);
    addGeneratedNumberQuestion(
      "exercices-problemes",
      name + " a " + first + " " + objectPlural + " et en reçoit " +
        second + ". Combien en a-" + (pronoun === "Elle" ? "t-elle" : "t-il") + " maintenant ?",
      first + second,
      ""
    );
    addGeneratedNumberQuestion(
      "exercices-problemes",
      name + " a " + (first + second) + " " + objectPlural + " et en donne " +
        second + ". Combien lui en reste-t-il ?",
      first,
      ""
    );
  }

  const tablesRandom = randomFor("exercices-tables-multiplications");
  for (let index = 0; index < 100; index++) {
    const first = integer(tablesRandom, 2, 12);
    const second = integer(tablesRandom, 0, 12);
    addGeneratedNumberQuestion(
      "exercices-tables-multiplications",
      "Combien font " + first + " × " + second + " ?",
      first * second
    );
  }

  const expectedExerciseKeys = new Set(exerciseInfo.keys());
  const missingQuestions = [...expectedExerciseKeys].filter(
    (key) => !questionPools.has(key) || questionPools.get(key).length === 0
  );
  if (missingQuestions.length > 0) {
    throw new Error(
      "Aucune question de défi n’est définie pour : " + missingQuestions.join(", ")
    );
  }

  return [...expectedExerciseKeys].map((exerciseKey) => ({
    exerciseKey,
    exercise: exerciseInfo.get(exerciseKey),
    questions: (() => {
      const pool = questionPools.get(exerciseKey);
      const random = createSeededRandom("daily-question-pool:" + exerciseKey);
      for (let index = pool.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [pool[index], pool[other]] = [pool[other], pool[index]];
      }
      return pool.slice(0, DAILY_CHALLENGE_POOL_SIZE);
    })()
  }));
}

function buildDailyChallengeHtml(questionPools, generationInfo) {
  const embeddedQuestions = JSON.stringify(questionPools).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Défi du jour — Exercices</title>
    <link rel="stylesheet" href="core/style.css" />
  </head>
  <body>
    <main class="daily-challenge-page">
      <p class="back-link"><a href="index.html">← Retour aux exercices</a></p>
      <h1>☀️ Défi du jour</h1>
      <p class="subtitle">5 questions sur 5 exercices différents chaque jour. Le défi fait tourner les 24 exercices au fil des jours. Tes réponses ici ne modifient pas leurs scores.</p>
      <section class="daily-challenge-card" aria-live="polite">
        <p id="daily-challenge-date" class="daily-challenge-date"></p>
        <progress id="daily-challenge-progress" max="${DAILY_CHALLENGE_QUESTION_COUNT}" value="0"></progress>
        <p id="daily-challenge-count" class="daily-challenge-count"></p>
        <p id="daily-challenge-source" class="daily-challenge-source"></p>
        <h2 id="daily-challenge-question"></h2>
        <div id="daily-challenge-choices" class="choices"></div>
        <p id="daily-challenge-feedback" class="feedback" role="status"></p>
        <div id="daily-challenge-result" class="daily-challenge-result" hidden>
          <h2>Défi terminé !</h2>
          <p>Ton résultat : <strong id="daily-challenge-score"></strong></p>
        </div>
        <p id="daily-challenge-save-status" class="daily-challenge-save-status" role="status"></p>
      </section>
      <footer>${generationInfo}</footer>
    </main>
    <script>
      const EXERCISE_QUESTION_BANKS = ${embeddedQuestions};
      const QUESTION_COUNT = ${DAILY_CHALLENGE_QUESTION_COUNT};
      const STORAGE_KEY_PREFIX = "daily-challenge:";
      const COMPLETIONS_STORAGE_KEY = "${DAILY_CHALLENGE_COMPLETIONS_KEY}";
      const today = new Date();
      const dateKey = today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");
      const dateLabel = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
      }).format(today);

      function createRandom(seedText) {
        let seed = 2166136261;
        for (const character of seedText) {
          seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
        }
        return function () {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed / 4294967296;
        };
      }

      function shuffle(items, random) {
        const result = [...items];
        for (let index = result.length - 1; index > 0; index--) {
          const other = Math.floor(random() * (index + 1));
          [result[index], result[other]] = [result[other], result[index]];
        }
        return result;
      }

      const dayNumber = Math.floor(Date.UTC(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ) / 86400000);
      const firstExerciseIndex =
        (dayNumber * QUESTION_COUNT) % EXERCISE_QUESTION_BANKS.length;
      const dailyQuestions = Array.from({ length: QUESTION_COUNT }, (_, index) => {
        const exerciseBank =
          EXERCISE_QUESTION_BANKS[(firstExerciseIndex + index) % EXERCISE_QUESTION_BANKS.length];
        const random = createRandom(dateKey + ":" + exerciseBank.exerciseKey);
        const question =
          exerciseBank.questions[Math.floor(random() * exerciseBank.questions.length)];
        return {
          ...question,
          exerciseKey: exerciseBank.exerciseKey,
          exercise: exerciseBank.exercise,
          options: shuffle(question.options, random)
        };
      });
      const challengeId = dailyQuestions
        .map((question) => question.exerciseKey + ":" + question.prompt)
        .join("|");
      const storageKey = STORAGE_KEY_PREFIX + dateKey;
      const resultStorageKey = "${DAILY_CHALLENGE_RESULT_PREFIX}" + dateKey;
      const answers = Array(QUESTION_COUNT).fill(null);
      let completedResult = null;

      try {
        const savedResult = JSON.parse(localStorage.getItem(resultStorageKey) || "null");
        if (
          savedResult &&
          savedResult.challengeId === challengeId &&
          Number.isInteger(savedResult.score) &&
          savedResult.score >= 0 &&
          savedResult.score <= QUESTION_COUNT
        ) {
          completedResult = savedResult;
        }
        const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
        if (
          saved &&
          saved.challengeId === challengeId &&
          Array.isArray(saved.answers) &&
          saved.answers.length === QUESTION_COUNT
        ) {
          saved.answers.forEach((answer, index) => {
            if (
              Number.isInteger(answer) &&
              answer >= 0 &&
              answer < dailyQuestions[index].options.length
            ) {
              answers[index] = answer;
            }
          });
        }
      } catch (error) {
        console.warn("Impossible de reprendre le défi du jour.", error);
      }

      const questionElement = document.getElementById("daily-challenge-question");
      const choicesElement = document.getElementById("daily-challenge-choices");
      const feedbackElement = document.getElementById("daily-challenge-feedback");
      const resultElement = document.getElementById("daily-challenge-result");
      const progressElement = document.getElementById("daily-challenge-progress");
      const saveStatus = document.getElementById("daily-challenge-save-status");
      let currentIndex = 0;

      function saveAnswers() {
        try {
          localStorage.setItem(storageKey, JSON.stringify({ challengeId, answers }));
          saveStatus.textContent = "";
        } catch (error) {
          console.warn("Impossible de sauvegarder le défi du jour.", error);
          saveStatus.textContent = "La sauvegarde du défi a échoué.";
        }
      }

      function recordDailyCompletion(correctCount) {
        completedResult = {
          challengeId,
          score: correctCount,
          total: QUESTION_COUNT
        };
        try {
          localStorage.setItem(
            resultStorageKey,
            JSON.stringify(completedResult)
          );
          const saved = localStorage.getItem(COMPLETIONS_STORAGE_KEY);
          const completedDays = saved ? JSON.parse(saved) : [];
          if (
            !Array.isArray(completedDays) ||
            !completedDays.every((day) => typeof day === "string")
          ) {
            throw new Error("Historique des défis terminés invalide.");
          }
          if (!completedDays.includes(dateKey)) {
            completedDays.push(dateKey);
            localStorage.setItem(
              COMPLETIONS_STORAGE_KEY,
              JSON.stringify(completedDays)
            );
          }
        } catch (error) {
          console.warn("Impossible d’enregistrer le défi terminé.", error);
          saveStatus.textContent = "La sauvegarde de la progression des défis a échoué.";
        }
      }

      function render() {
        if (completedResult) {
          questionElement.hidden = true;
          choicesElement.hidden = true;
          feedbackElement.hidden = true;
          resultElement.hidden = false;
          progressElement.value = QUESTION_COUNT;
          document.getElementById("daily-challenge-count").textContent =
            "Défi déjà terminé aujourd’hui";
          document.getElementById("daily-challenge-score").textContent =
            completedResult.score + " / " + completedResult.total;
          return;
        }

        const answeredCount = answers.filter((answer) => answer !== null).length;
        progressElement.value = answeredCount;
        document.getElementById("daily-challenge-date").textContent =
          "Défi du " + dateLabel;

        currentIndex = answers.findIndex((answer) => answer === null);
        if (currentIndex === -1) {
          const correctCount = answers.reduce(
            (count, answer, index) =>
              count + (dailyQuestions[index].options[answer] === dailyQuestions[index].answer ? 1 : 0),
            0
          );
          recordDailyCompletion(correctCount);
          questionElement.hidden = true;
          choicesElement.hidden = true;
          feedbackElement.hidden = true;
          resultElement.hidden = false;
          document.getElementById("daily-challenge-count").textContent =
            "Défi déjà terminé aujourd’hui";
          document.getElementById("daily-challenge-score").textContent =
            correctCount + " / " + QUESTION_COUNT;
          return;
        }

        questionElement.hidden = false;
        choicesElement.hidden = false;
        feedbackElement.hidden = true;
        resultElement.hidden = true;
        document.getElementById("daily-challenge-count").textContent =
          "Question " + (currentIndex + 1) + " sur " + QUESTION_COUNT;
        const sourceLink = document.createElement("a");
        sourceLink.href = dailyQuestions[currentIndex].exercise.rel;
        sourceLink.textContent =
          dailyQuestions[currentIndex].exercise.category + " · " +
          dailyQuestions[currentIndex].exercise.title;
        const sourceElement = document.getElementById("daily-challenge-source");
        sourceElement.replaceChildren(sourceLink);
        questionElement.textContent = dailyQuestions[currentIndex].prompt;
        choicesElement.replaceChildren();
        dailyQuestions[currentIndex].options.forEach((option, optionIndex) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = option;
          button.addEventListener("click", () => {
            answers[currentIndex] = optionIndex;
            saveAnswers();
            const correct = option === dailyQuestions[currentIndex].answer;
            feedbackElement.textContent = correct
              ? "✅ Bonne réponse !"
              : "❌ La bonne réponse était : " + dailyQuestions[currentIndex].answer;
            feedbackElement.className = "feedback " + (correct ? "good" : "bad");
            feedbackElement.hidden = false;
            choicesElement.querySelectorAll("button").forEach((choice) => {
              choice.disabled = true;
            });
            progressElement.value = answers.filter((answer) => answer !== null).length;
            window.setTimeout(render, 700);
          });
          choicesElement.append(button);
        });
      }

      document.getElementById("daily-challenge-date").textContent =
        "Défi du " + dateLabel;
      render();
    </script>
  </body>
</html>
`;
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

function buildDailyChallengeBadgesSection() {
  const cards = DAILY_CHALLENGE_BADGES.map(
    (badge) =>
      '          <a class="badge-card daily-challenge-badge" data-daily-challenge-threshold="' +
      badge.threshold + '" href="' + DAILY_CHALLENGE_NAME + '">\n' +
      '            <span class="badge-icon" aria-hidden="true">' + badge.icon + "</span>\n" +
      "            <h4>" + badge.title + "</h4>\n" +
      "            <p>Terminer " + badge.threshold + " défis quotidiens.</p>\n" +
      '            <span class="badge-status">0 / ' + badge.threshold + " défis terminés</span>\n" +
      "          </a>"
  ).join("\n");

  return `        <div class="badge-category daily-challenge-badge-category">
          <h3>Badges du défi quotidien</h3>
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
            '            <a class="badge-card" data-score-key="' +
            escapeHtml(exercise.storageKey || "") +
            '" href="' + escapeHtml(exercise.rel) + '">\n' +
            '              <span class="badge-icon" aria-hidden="true">' +
            escapeHtml(getBadgeIcon(exercise)) + "</span>\n" +
            "              <h4>" + escapeHtml(exercise.title) + "</h4>\n" +
            "              <p>Au moins 20 réponses et 80 % de réussite.</p>\n" +
            '              <span class="badge-status">0 / 20 réponses</span>\n' +
            "            </a>"
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
    exerciseBadgeCount + GLOBAL_BADGES.length + GOOD_ANSWER_BADGES.length +
    DAILY_CHALLENGE_BADGES.length;
  const totalBadgeCount = badgeCount + 1;

  return `      <section class="badges-panel" aria-labelledby="badges-title" data-exercise-count="${exerciseBadgeCount}">
        <h2 id="badges-title">Mes badges</h2>
        <p id="badge-summary" role="status">0 / ${totalBadgeCount} badges débloqués.</p>
${badgeCategories}
${buildGlobalBadgesSection()}
${buildGoodAnswerBadgesSection()}
${buildDailyChallengeBadgesSection()}
        <div class="badge-category ultimate-badge-category">
          <h3>Badge ultime</h3>
          <div class="badge-grid">
            <article class="badge-card ultimate-badge-card">
              <span class="badge-icon" aria-hidden="true">🏆</span>
              <h4>Collection complète</h4>
              <p>Débloquer tous les autres badges.</p>
              <span class="badge-status">${badgeCount} badges à obtenir</span>
            </article>
          </div>
        </div>
      </section>`;
}

function buildBadgesSummary(categories) {
  const baseBadgeCount = categories.reduce(
    (count, category) => count + category.exercises.length,
    0
  ) + GLOBAL_BADGES.length + GOOD_ANSWER_BADGES.length +
    DAILY_CHALLENGE_BADGES.length;
  const badgeCount = baseBadgeCount + 1;
  const earnedBadges = categories
    .flatMap((category) => category.exercises)
    .map(
      (exercise) =>
        '          <a class="earned-badge earned-badge-top" data-badge-scope="summary" data-score-key="' +
        escapeHtml(exercise.storageKey || "") +
        '" href="' + escapeHtml(exercise.rel) +
        '" hidden><span class="earned-badge-icon" aria-hidden="true">' +
        escapeHtml(getBadgeIcon(exercise)) +
        "</span><span>" + escapeHtml(exercise.title) + "</span></a>"
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
  const dailyChallengeBadges = DAILY_CHALLENGE_BADGES.map(
    (badge) =>
      '          <a class="earned-badge earned-daily-challenge-badge" data-daily-challenge-threshold="' +
      badge.threshold + '" href="' + DAILY_CHALLENGE_NAME +
      '" hidden><span class="earned-badge-icon" aria-hidden="true">' +
      badge.icon + "</span><span>" + badge.title + "</span></a>"
  ).join("\n");
  const ultimateBadge =
    '          <span class="earned-badge ultimate-badge earned-ultimate-badge" hidden>' +
    '<span class="earned-badge-icon" aria-hidden="true">🏆</span>' +
    "<span>Collection complète</span></span>";

  const exerciseCount = categories.reduce(
    (count, category) => count + category.exercises.length,
    0
  );

  return `      <section class="badges-summary" aria-labelledby="badges-summary-title" data-exercise-count="${exerciseCount}" data-base-badge-count="${baseBadgeCount}">
        <h2 id="badges-summary-title">Mes badges</h2>
        <p><span id="badge-summary-earned">0</span> / ${badgeCount} badges débloqués</p>
        <p id="earned-badges-empty">Les badges obtenus apparaîtront ici.</p>
        <div class="earned-badges" aria-live="polite">
${earnedBadges}
${globalBadges}
${goodAnswerBadges}
${dailyChallengeBadges}
${ultimateBadge}
        </div>
        <a href="${BADGES_NAME}">Voir tous mes badges →</a>
      </section>`;
}

function buildBadgesSummaryScript() {
  return `        function isExerciseBadgeEarned(good, total) {
    return total >= 20 && good / total >= 0.8;
  }

        function readDailyChallengeCompletions() {
    try {
      const saved = localStorage.getItem("${DAILY_CHALLENGE_COMPLETIONS_KEY}");
      if (!saved) return 0;
      const days = JSON.parse(saved);
      if (!Array.isArray(days) || !days.every((day) => typeof day === "string")) {
        throw new Error("Historique des défis terminés invalide.");
      }
      return new Set(days).size;
    } catch (error) {
      console.warn("Impossible de lire les défis quotidiens terminés.", error);
      return null;
    }
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
    const dailyChallengeCount = readDailyChallengeCompletions();
    document.querySelectorAll(".earned-daily-challenge-badge").forEach((badge) => {
      const earned = dailyChallengeCount !== null &&
        dailyChallengeCount >= Number(badge.dataset.dailyChallengeThreshold);
      badge.hidden = !earned;
      if (earned) earnedCount++;
    });

    const ultimateBadge = document.querySelector(".earned-ultimate-badge");
    const baseBadgeCount = Number(
      document.querySelector(".badges-summary").dataset.baseBadgeCount
    );
    const ultimateEarned = earnedCount === baseBadgeCount;
    ultimateBadge.hidden = !ultimateEarned;
    if (ultimateEarned) earnedCount++;

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
        return total >= 20 && good / total >= 0.8;
      }

      function readDailyChallengeCompletions() {
        try {
          const saved = localStorage.getItem("${DAILY_CHALLENGE_COMPLETIONS_KEY}");
          if (!saved) return 0;
          const days = JSON.parse(saved);
          if (!Array.isArray(days) || !days.every((day) => typeof day === "string")) {
            throw new Error("Historique des défis terminés invalide.");
          }
          return new Set(days).size;
        } catch (error) {
          console.warn("Impossible de lire les défis quotidiens terminés.", error);
          return null;
        }
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
            ? "Débloqué !" + (total > 0 && good === total ? " · 100 %" : "")
            : total < 20
              ? total + " / 20 réponses"
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
            ? "Débloqué !" + (threshold === 100 ? " · 100 %" : "")
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
        const dailyChallengeCount = readDailyChallengeCompletions();
        document.querySelectorAll(".daily-challenge-badge").forEach((card) => {
          const threshold = Number(card.dataset.dailyChallengeThreshold);
          const status = card.querySelector(".badge-status");
          const earned = dailyChallengeCount !== null && dailyChallengeCount >= threshold;
          card.classList.toggle("earned", earned);
          status.textContent = earned
            ? "Débloqué !"
            : dailyChallengeCount === null
              ? "Progression indisponible"
              : dailyChallengeCount + " / " + threshold + " défis terminés";
          if (earned) earnedCount++;
        });

        const ultimateCard = document.querySelector(".ultimate-badge-card");
        const baseBadgeCount = document.querySelectorAll(".badge-card").length - 1;
        const ultimateEarned = earnedCount === baseBadgeCount;
        const ultimateStatus = ultimateCard.querySelector(".badge-status");
        ultimateCard.classList.toggle("earned", ultimateEarned);
        ultimateStatus.textContent = ultimateEarned
          ? "Tous les badges obtenus !"
          : earnedCount + " / " + baseBadgeCount + " badges débloqués";
        if (ultimateEarned) earnedCount++;

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
      <p class="subtitle">Les badges d’exercice se débloquent avec au moins 20 réponses et 80 % de réussite. Les badges de réussite globale demandent au moins 20 réponses dans chaque exercice ; les badges de bonnes réponses comptent toutes les bonnes réponses cumulées.</p>
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
        element.classList.remove("score-low", "score-medium", "score-high", "score-perfect");
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
            if (stats.total >= 20 && stats.good === stats.total) {
              item.classList.add("score-perfect");
              scoreElement.classList.add("score-perfect");
              progressElement.classList.add("score-perfect");
            } else {
              item.classList.remove("score-perfect");
            }
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
            '        <a class="earned-badge earned-badge-category" data-badge-scope="category" data-score-key="' +
            escapeHtml(exercise.storageKey || "") +
            '" href="' + escapeHtml(exercise.rel) +
            '" hidden><span class="earned-badge-icon" aria-hidden="true">' +
            escapeHtml(getBadgeIcon(exercise)) +
            "</span><span>" + escapeHtml(exercise.title) + "</span></a>"
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
      <section class="daily-challenge-promo">
        <div>
          <h2>☀️ Défi du jour</h2>
          <p id="daily-challenge-summary">5 questions variées pour tester tes connaissances. Le défi change chaque jour !</p>
        </div>
        <a id="daily-challenge-link" href="${DAILY_CHALLENGE_NAME}">Faire le défi →</a>
      </section>
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

      function renderDailyChallengeSummary() {
        const today = new Date();
        const dateKey = today.getFullYear() + "-" +
          String(today.getMonth() + 1).padStart(2, "0") + "-" +
          String(today.getDate()).padStart(2, "0");
        const summary = document.getElementById("daily-challenge-summary");
        const link = document.getElementById("daily-challenge-link");
        try {
          const saved = localStorage.getItem("${DAILY_CHALLENGE_RESULT_PREFIX}" + dateKey);
          const result = saved ? JSON.parse(saved) : null;
          if (
            result &&
            Number.isInteger(result.score) &&
            Number.isInteger(result.total) &&
            result.total === ${DAILY_CHALLENGE_QUESTION_COUNT} &&
            result.score >= 0 &&
            result.score <= result.total
          ) {
            summary.textContent = "Défi du jour terminé : " +
              result.score + " / " + result.total + ".";
            link.textContent = "Voir mon résultat →";
            return;
          }
          summary.textContent =
            "5 questions variées pour tester tes connaissances. Le défi change chaque jour !";
          link.textContent = "Faire le défi →";
        } catch (error) {
          console.warn("Impossible de lire le résultat du défi du jour.", error);
          summary.textContent = "Le résultat du défi du jour est indisponible.";
          link.textContent = "Ouvrir le défi →";
        }
      }

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
      renderDailyChallengeSummary();
      window.addEventListener("pageshow", renderScores);
      window.addEventListener("storage", renderScores);
      window.addEventListener("pageshow", renderDailyChallengeSummary);
      window.addEventListener("storage", renderDailyChallengeSummary);
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
  const dailyChallengeHtml = buildDailyChallengeHtml(
    loadDailyChallengeQuestions(root, categories),
    generationInfo
  );
  const outPath = path.join(root, OUTPUT_NAME);
  const progressionPath = path.join(root, PROGRESSION_NAME);
  const badgesPath = path.join(root, BADGES_NAME);
  const dailyChallengePath = path.join(root, DAILY_CHALLENGE_NAME);

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
    failedPath = dailyChallengePath;
    fs.writeFileSync(dailyChallengePath, dailyChallengeHtml, "utf8");
  } catch (e) {
    console.error("");
    console.error("Échec de l'écriture de : " + failedPath);
    console.error("Erreur système : " + (e.code || "?") + " — " + e.message);

    // Repli : on essaie d'écrire à côté du script
    const scriptDir = path.dirname(path.resolve(process.argv[1] || "."));
    const fallbackPath = path.join(scriptDir, OUTPUT_NAME);
    const fallbackProgressionPath = path.join(scriptDir, PROGRESSION_NAME);
    const fallbackBadgesPath = path.join(scriptDir, BADGES_NAME);
    const fallbackDailyChallengePath = path.join(scriptDir, DAILY_CHALLENGE_NAME);
    if (fallbackPath !== path.resolve(outPath) && failedPath === outPath) {
      try {
        fs.writeFileSync(fallbackPath, html, "utf8");
        fs.writeFileSync(fallbackProgressionPath, progressionHtml, "utf8");
        fs.writeFileSync(fallbackBadgesPath, badgesHtml, "utf8");
        fs.writeFileSync(fallbackDailyChallengePath, dailyChallengeHtml, "utf8");
        console.error("=> Le fichier a été écrit ici à la place : " + fallbackPath);
        console.error("   Déplace les pages générées dans le dossier scanné");
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
  console.log("Page générée : " + dailyChallengePath);
}

main();