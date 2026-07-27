// Zece la română — grilă de antrenament pentru Evaluarea Națională.
// Pure functions below are unit tested from test/zece-la-romana-app.test.js;
// the DOM wiring at the bottom only runs in a browser.

export const STORAGE_KEY = "zece-la-romana.v1";
export const SESSION_SIZE = 10;

export const CATEGORIES = [
  {
    id: "morfologie",
    label: "Morfologie",
    tagline: "Părți de vorbire, cazuri, moduri și timpuri",
  },
  {
    id: "sintaxa",
    label: "Sintaxă",
    tagline: "Funcții sintactice, propoziții și frază",
  },
];

const VALID_CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id));

/**
 * Check the question bank against the schema the app relies on.
 * @param {Array<{id: string, category: string, prompt: string, options: string[], correctIndex: number, explanation: string}>} questions
 * @returns {string[]} human-readable problems; empty when the bank is valid
 */
export function validateQuestionBank(questions) {
  if (!Array.isArray(questions)) return ["banca de întrebări nu este o listă"];
  const errors = [];
  const seen = new Set();
  questions.forEach((question, index) => {
    const where = `întrebarea #${index} (${question && question.id ? question.id : "fără id"})`;
    if (!question || typeof question !== "object") {
      errors.push(`${where}: nu este un obiect`);
      return;
    }
    if (typeof question.id !== "string" || !question.id.trim()) {
      errors.push(`${where}: id lipsă`);
    } else if (seen.has(question.id)) {
      errors.push(`${where}: id duplicat`);
    } else {
      seen.add(question.id);
    }
    if (!VALID_CATEGORY_IDS.has(question.category)) {
      errors.push(`${where}: categorie necunoscută`);
    }
    if (typeof question.prompt !== "string" || !question.prompt.trim()) {
      errors.push(`${where}: enunț lipsă`);
    }
    if (
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      question.options.some((option) => typeof option !== "string" || !option.trim())
    ) {
      errors.push(`${where}: trebuie exact 4 variante nevide`);
    }
    if (
      !Number.isInteger(question.correctIndex) ||
      question.correctIndex < 0 ||
      question.correctIndex > 3
    ) {
      errors.push(`${where}: correctIndex trebuie să fie între 0 și 3`);
    }
    if (typeof question.explanation !== "string" || !question.explanation.trim()) {
      errors.push(`${where}: explicație lipsă`);
    }
  });
  return errors;
}

/**
 * Fisher–Yates shuffle into a new array; `rng` is injectable for tests.
 * @template T @param {T[]} items @param {() => number} rng @returns {T[]}
 */
export function shuffle(items, rng = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Random session of up to SESSION_SIZE distinct questions from one category.
 */
export function buildSession(questions, categoryId, rng = Math.random) {
  const pool = questions.filter((question) => question.category === categoryId);
  return shuffle(pool, rng).slice(0, SESSION_SIZE);
}

/**
 * Session built from previously missed questions only.
 */
export function buildReviewSession(questions, wrongIds, rng = Math.random) {
  const wanted = new Set(wrongIds);
  const pool = questions.filter((question) => wanted.has(question.id));
  return shuffle(pool, rng).slice(0, SESSION_SIZE);
}

export function createProgress() {
  return { categories: {}, wrongIds: [] };
}

/**
 * A wrong answer queues the question for review; a correct one clears it.
 * Returns a new progress object; the input is never mutated.
 */
export function recordAnswer(progress, questionId, correct) {
  let wrongIds;
  if (correct) {
    wrongIds = progress.wrongIds.filter((id) => id !== questionId);
  } else if (progress.wrongIds.includes(questionId)) {
    wrongIds = [...progress.wrongIds];
  } else {
    wrongIds = [...progress.wrongIds, questionId];
  }
  return { ...progress, wrongIds };
}

/**
 * Close a finished session: bump the category's session count and keep the
 * best score. Review sessions (no category) leave the stats untouched.
 */
export function recordSessionEnd(progress, categoryId, score) {
  if (!categoryId) return progress;
  const previous = progress.categories[categoryId] || { sessions: 0, bestScore: 0 };
  return {
    ...progress,
    categories: {
      ...progress.categories,
      [categoryId]: {
        sessions: previous.sessions + 1,
        bestScore: Math.max(previous.bestScore, score),
      },
    },
  };
}

/**
 * @returns {string | null} start-screen stats line, or null when the category
 * has never been practiced
 */
export function describeCategoryProgress(progress, categoryId) {
  const stats = progress.categories[categoryId];
  if (!stats || stats.sessions === 0) return null;
  const sessionsLabel = stats.sessions === 1 ? "1 sesiune" : `${stats.sessions} sesiuni`;
  return `Cel mai bun scor: ${stats.bestScore}/${SESSION_SIZE} · ${sessionsLabel}`;
}

/**
 * Romanian count phrase: „o întrebare", „3 întrebări", „20 de întrebări".
 */
export function formatQuestionCount(count) {
  if (count === 1) return "o întrebare";
  if (count < 20) return `${count} întrebări`;
  return `${count} de întrebări`;
}

export function buildSummaryMessage(score, total) {
  const ratio = total > 0 ? score / total : 0;
  if (ratio === 1) return "Zece curat! Ești pregătit de examen la capitolul ăsta. 🎉";
  if (ratio >= 0.8) return "Aproape perfect! Încă puțin și e zece.";
  if (ratio >= 0.5) return "Bine! Reia greșelile și scorul urcă.";
  return "Nu te descuraja — fiecare greșeală explicată e un pas înainte.";
}

export function serializeProgress(progress) {
  return JSON.stringify(progress);
}

/**
 * Parse saved progress, tolerating missing, corrupt, or foreign data by
 * falling back to a fresh start — the app must never crash on bad storage.
 */
export function deserializeProgress(raw) {
  const fallback = createProgress();
  if (typeof raw !== "string" || !raw) return fallback;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
  const progress = createProgress();
  if (parsed.categories && typeof parsed.categories === "object") {
    for (const [id, stats] of Object.entries(parsed.categories)) {
      if (
        stats &&
        Number.isInteger(stats.sessions) &&
        stats.sessions >= 0 &&
        Number.isInteger(stats.bestScore) &&
        stats.bestScore >= 0
      ) {
        progress.categories[id] = { sessions: stats.sessions, bestScore: stats.bestScore };
      }
    }
  }
  if (Array.isArray(parsed.wrongIds)) {
    progress.wrongIds = [...new Set(parsed.wrongIds.filter((id) => typeof id === "string"))];
  }
  return progress;
}

// ---------------------------------------------------------------------------
// DOM wiring — browser only.

if (typeof document !== "undefined") {
  const els = {
    start: document.getElementById("view-start"),
    quiz: document.getElementById("view-quiz"),
    summary: document.getElementById("view-summary"),
    categoryList: document.getElementById("category-list"),
    reviewCard: document.getElementById("review-card"),
    reviewCount: document.getElementById("review-count"),
    reviewStart: document.getElementById("review-start"),
    loadError: document.getElementById("load-error"),
    quizCategory: document.getElementById("quiz-category"),
    quizStep: document.getElementById("quiz-step"),
    quizPrompt: document.getElementById("quiz-prompt"),
    quizOptions: document.getElementById("quiz-options"),
    quizFeedback: document.getElementById("quiz-feedback"),
    feedbackVerdict: document.getElementById("feedback-verdict"),
    feedbackExplanation: document.getElementById("feedback-explanation"),
    quizNext: document.getElementById("quiz-next"),
    summaryScore: document.getElementById("summary-score"),
    summaryMessage: document.getElementById("summary-message"),
    summaryAgain: document.getElementById("summary-again"),
    summaryHome: document.getElementById("summary-home"),
  };

  let bank = [];
  let progress = deserializeProgress(readStoredProgress());
  let session = null;

  function readStoredProgress() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, serializeProgress(progress));
    } catch {
      // Private mode or full storage: progress just stays in memory.
    }
  }

  function show(name) {
    els.start.hidden = name !== "start";
    els.quiz.hidden = name !== "quiz";
    els.summary.hidden = name !== "summary";
  }

  function renderStart() {
    els.categoryList.innerHTML = CATEGORIES.map((category) => {
      const stats = describeCategoryProgress(progress, category.id);
      return `
        <article class="category-card">
          <h3 class="category-card__title">${category.label}</h3>
          <p class="category-card__tagline">${category.tagline}</p>
          <p class="category-card__stats">${stats || "Încă neexersat"}</p>
          <button class="button" type="button" data-category="${category.id}">Începe o sesiune</button>
        </article>`;
    }).join("");
    els.categoryList.querySelectorAll("button[data-category]").forEach((button) => {
      button.addEventListener("click", () => startCategorySession(button.dataset.category));
    });
    const wrongCount = progress.wrongIds.length;
    els.reviewCard.hidden = wrongCount === 0;
    if (wrongCount > 0) {
      els.reviewCount.textContent = `${formatQuestionCount(wrongCount)} de reluat`;
    }
    show("start");
  }

  function startCategorySession(categoryId) {
    const questions = buildSession(bank, categoryId);
    if (questions.length === 0) return;
    session = { questions, categoryId, index: 0, score: 0, answered: false };
    renderQuestion();
    show("quiz");
  }

  function startReviewSession() {
    const questions = buildReviewSession(bank, progress.wrongIds);
    if (questions.length === 0) {
      renderStart();
      return;
    }
    session = { questions, categoryId: null, index: 0, score: 0, answered: false };
    renderQuestion();
    show("quiz");
  }

  function categoryLabel(categoryId) {
    const category = CATEGORIES.find((entry) => entry.id === categoryId);
    return category ? category.label : "Reia greșelile";
  }

  function renderQuestion() {
    const question = session.questions[session.index];
    session.answered = false;
    els.quizCategory.textContent = session.categoryId
      ? categoryLabel(session.categoryId)
      : "Reia greșelile";
    els.quizStep.textContent = `Întrebarea ${session.index + 1} din ${session.questions.length}`;
    els.quizPrompt.textContent = question.prompt;
    els.quizOptions.innerHTML = question.options
      .map(
        (option, index) => `
      <button class="option" type="button" data-index="${index}">
        <span class="option__letter">${"ABCD"[index]}</span>
        <span class="option__text">${option}</span>
      </button>`
      )
      .join("");
    els.quizOptions.querySelectorAll("button.option").forEach((button) => {
      button.addEventListener("click", () => answer(Number(button.dataset.index)));
    });
    els.quizFeedback.hidden = true;
  }

  function answer(selectedIndex) {
    if (session.answered) return;
    session.answered = true;
    const question = session.questions[session.index];
    const correct = selectedIndex === question.correctIndex;
    if (correct) session.score += 1;
    progress = recordAnswer(progress, question.id, correct);
    saveProgress();
    els.quizOptions.querySelectorAll("button.option").forEach((button) => {
      const index = Number(button.dataset.index);
      button.disabled = true;
      if (index === question.correctIndex) button.classList.add("option--correct");
      if (index === selectedIndex && !correct) button.classList.add("option--wrong");
    });
    els.feedbackVerdict.textContent = correct
      ? "Corect! 🎯"
      : `Greșit — răspunsul corect era ${"ABCD"[question.correctIndex]}.`;
    els.feedbackVerdict.classList.toggle("quiz-feedback__verdict--wrong", !correct);
    els.feedbackExplanation.textContent = question.explanation;
    els.quizNext.textContent =
      session.index + 1 === session.questions.length ? "Vezi rezultatul" : "Următoarea";
    els.quizFeedback.hidden = false;
    els.quizNext.focus();
  }

  function endSession() {
    progress = recordSessionEnd(progress, session.categoryId, session.score);
    saveProgress();
    els.summaryScore.textContent = `${session.score}/${session.questions.length}`;
    els.summaryMessage.textContent = buildSummaryMessage(session.score, session.questions.length);
    const canRepeat = session.categoryId ? true : progress.wrongIds.length > 0;
    els.summaryAgain.hidden = !canRepeat;
    els.summaryAgain.textContent = session.categoryId ? "Încă o sesiune" : "Reia din nou greșelile";
    show("summary");
  }

  els.quizNext.addEventListener("click", () => {
    session.index += 1;
    if (session.index < session.questions.length) renderQuestion();
    else endSession();
  });

  els.summaryAgain.addEventListener("click", () => {
    if (session.categoryId) startCategorySession(session.categoryId);
    else startReviewSession();
  });

  els.summaryHome.addEventListener("click", renderStart);
  els.reviewStart.addEventListener("click", startReviewSession);

  fetch("data/questions.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((questions) => {
      const problems = validateQuestionBank(questions);
      if (problems.length > 0) throw new Error(problems.join("; "));
      bank = questions;
      renderStart();
    })
    .catch((error) => {
      els.loadError.hidden = false;
      els.loadError.textContent =
        "Nu am putut încărca întrebările. Deschide aplicația printr-un server static (de exemplu „npx serve”) și reîncarcă pagina.";
      console.error("Zece la română:", error);
    });
}
