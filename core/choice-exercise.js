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

  let questions = [];
  let deck = [];
  let currentQuestion = null;
  let stats = { good: 0, total: 0 };
  let answered = false;

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
      localStorage.setItem(config.storageKey, JSON.stringify({ stats }));
      saveStatus.textContent = "";
    } catch (error) {
      saveStatus.textContent = "La sauvegarde du score a échoué.";
      console.error("Impossible de sauvegarder le score.", error);
    }
  }

  function renderQuestion() {
    if (deck.length === 0) deck = shuffle(questions.map((_, index) => index));
    currentQuestion = questions[deck.pop()];
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
    window.setTimeout(renderQuestion, correct ? 1300 : 2000);
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
      updateScore();
      renderQuestion();
    } catch (error) {
      showError("Impossible de charger l’exercice ou son score. Vérifie le serveur et les données.", error);
    }
  }

  resetButton.addEventListener("click", () => {
    stats = { good: 0, total: 0 };
    updateScore();
    saveState();
    if (questions.length > 0) renderQuestion();
  });

  start();
})();
