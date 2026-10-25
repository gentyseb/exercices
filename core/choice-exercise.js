(() => {
  const config = window.CHOICE_EXERCISE_CONFIG;
  const feedback = document.getElementById("feedback");
  const choices = document.getElementById("choices");
  const questionElement = document.getElementById("question");
  const saveStatus = document.getElementById("save-status");
  const goodElement = document.getElementById("good");
  const totalElement = document.getElementById("total");
  const percentageElement = document.getElementById("percentage");
  const resetButton = document.getElementById("reset");
  const settingsToggle = document.getElementById("settingsToggle");
  const settingsPanel = document.getElementById("settingsPanel");
  const settingsSelect = config && config.settings
    ? document.getElementById(config.settings.selectId)
    : null;
  const difficultySelect = config && config.settings && config.settings.difficultySelectId
    ? document.getElementById(config.settings.difficultySelectId)
    : null;

  let questions = [];
  let activeQuestions = [];
  let deck = [];
  let currentQuestion = null;
  let stats = { good: 0, total: 0 };
  let settings = {
    questionType: config && config.settings ? config.settings.defaultValue : "all",
    difficulty: "all"
  };
  let answered = false;
  let advanceTimeout = null;

  function showError(message, error) {
    console.error(message, error);
    feedback.textContent = message;
    feedback.className = "feedback bad";
    choices.replaceChildren();
  }

  function shuffle(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const otherIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[otherIndex]] = [shuffled[otherIndex], shuffled[index]];
    }
    return shuffled;
  }

  function updateScore() {
    goodElement.textContent = stats.good;
    totalElement.textContent = stats.total;
    percentageElement.textContent = stats.total
      ? Math.round((stats.good / stats.total) * 100) + " %"
      : "— %";
  }

  function saveState() {
    try {
      const state = config.settings ? { stats, settings } : { stats };
      localStorage.setItem(config.storageKey, JSON.stringify(state));
      saveStatus.textContent = "";
    } catch (error) {
      saveStatus.textContent = "La sauvegarde du score a échoué.";
      console.error("Impossible de sauvegarder le score.", error);
    }
  }

  function renderQuestion() {
    advanceTimeout = null;
    if (activeQuestions.length === 0) {
      showError("Aucune question disponible pour ce réglage.", new Error(settings.questionType));
      return;
    }
    if (deck.length === 0) deck = shuffle(activeQuestions.map((_, index) => index));
    currentQuestion = activeQuestions[deck.pop()];
    answered = false;
    questionElement.textContent = currentQuestion.enonce;
    feedback.textContent = "";
    feedback.className = "feedback";
    choices.replaceChildren();

    shuffle(currentQuestion.options).forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option;
      button.addEventListener("click", () => handleAnswer(option));
      choices.append(button);
    });
  }

  function handleAnswer(answer) {
    if (answered) return;
    answered = true;
    stats.total++;
    const correct = answer === currentQuestion.reponse;
    if (correct) stats.good++;
    feedback.textContent = correct
      ? "✅ Bonne réponse !"
      : "❌ La bonne réponse était : " + currentQuestion.reponse;
    feedback.className = "feedback " + (correct ? "good" : "bad");
    choices.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
    updateScore();
    saveState();
    advanceTimeout = window.setTimeout(renderQuestion, correct ? 1300 : 2000);
  }

  async function start() {
    if (!config || !config.storageKey || !config.dataUrl) {
      showError("La configuration de l’exercice est invalide.", new Error("Configuration manquante."));
      return;
    }

    try {
      const saved = localStorage.getItem(config.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          !parsed.stats ||
          !Number.isFinite(parsed.stats.good) ||
          !Number.isFinite(parsed.stats.total) ||
          parsed.stats.good < 0 ||
          parsed.stats.total < 0 ||
          parsed.stats.good > parsed.stats.total
        ) {
          throw new Error("Le score sauvegardé est invalide.");
        }
        stats = parsed.stats;
        if (
          config.settings &&
          parsed.settings &&
          settingsSelect &&
          Array.from(settingsSelect.options).some(
            (option) => option.value === parsed.settings.questionType
          ) &&
          (!difficultySelect ||
            Array.from(difficultySelect.options).some(
              (option) => option.value === parsed.settings.difficulty
            ))
        ) {
          settings = parsed.settings;
        }
      }

      const response = await fetch(config.dataUrl);
      if (!response.ok) {
        throw new Error("HTTP " + response.status + " lors du chargement des questions.");
      }
      const data = await response.json();
      if (
        !data ||
        !Array.isArray(data.questions) ||
        data.questions.length === 0 ||
        data.questions.some((item) =>
          !item ||
          typeof item.enonce !== "string" ||
          typeof item.reponse !== "string" ||
          !Array.isArray(item.options) ||
          item.options.length < 2 ||
          !item.options.includes(item.reponse)
        )
      ) {
        throw new Error("La banque de questions est invalide.");
      }
      questions = data.questions;
      if (settingsSelect) {
        settingsSelect.value = settings.questionType;
        if (difficultySelect) difficultySelect.value = settings.difficulty;
        const applySettings = () => {
          settings.questionType = settingsSelect.value;
          if (
            difficultySelect &&
            settings.questionType !== "all" &&
            settings.questionType !== "centimes"
          ) {
            settings.difficulty = "all";
            difficultySelect.value = "all";
          } else if (difficultySelect) {
            settings.difficulty = difficultySelect.value;
          }
          if (difficultySelect) {
            difficultySelect.disabled =
              settings.questionType !== "all" &&
              settings.questionType !== "centimes";
          }
          deck = [];
          activeQuestions = getActiveQuestions();
          if (advanceTimeout !== null) {
            window.clearTimeout(advanceTimeout);
            advanceTimeout = null;
          }
          saveState();
          renderQuestion();
        };
        settingsSelect.addEventListener("change", applySettings);
        if (difficultySelect) difficultySelect.addEventListener("change", applySettings);
        if (difficultySelect) {
          difficultySelect.disabled =
            settings.questionType !== "all" &&
            settings.questionType !== "centimes";
        }
        settingsToggle.addEventListener("click", () => {
          const isOpen = settingsPanel.classList.toggle("open");
          settingsToggle.classList.toggle("open", isOpen);
          settingsToggle.setAttribute("aria-expanded", String(isOpen));
        });
        activeQuestions = getActiveQuestions();
      } else {
        activeQuestions = questions;
      }
      updateScore();
      renderQuestion();
    } catch (error) {
      showError("Impossible de charger l’exercice ou son score. Vérifie le serveur et les données.", error);
    }
  }

  function getActiveQuestions() {
    return questions.filter((question) =>
      (settings.questionType === "all" ||
        (question.type || "classique") === settings.questionType) &&
      matchesDifficulty(question)
    );
  }

  function matchesDifficulty(question) {
    if (settings.difficulty === "all") return true;
    if (settings.difficulty === "facile") {
      return question.type === "centimes"
        ? question.difficulty === "facile"
        : question.usesCentimes !== true;
    }
    return question.type !== "centimes" ||
      (question.difficulty || "normal") === settings.difficulty;
  }

  resetButton.addEventListener("click", () => {
    stats = { good: 0, total: 0 };
    updateScore();
    saveState();
    if (advanceTimeout !== null) {
      window.clearTimeout(advanceTimeout);
      advanceTimeout = null;
    }
    if (activeQuestions.length > 0) renderQuestion();
  });

  start();
})();
