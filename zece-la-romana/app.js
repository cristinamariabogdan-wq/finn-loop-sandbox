// Zece la română — grilă de antrenament pentru Evaluarea Națională.
// Pure functions below are unit tested from test/zece-la-romana-app.test.js;
// the DOM wiring at the bottom only runs in a browser.

export const STORAGE_KEY = "zece-la-romana.v1";
export const SESSION_SIZE = 10;
export const LESSON_QUIZ_SIZE = 3;
export const EXAM_SIZE = 20;
export const EXAM_MINUTES = 20;

export const CATEGORIES = [
  {
    id: "morfologie",
    label: "Morfologie",
    // Definite accusative, for sentences like „Exersează Morfologia”. Romanian
    // articulation is irregular enough that spelling it out beats deriving it.
    articulatedLabel: "Morfologia",
    tagline: "Părți de vorbire, cazuri, moduri și timpuri",
  },
  {
    id: "sintaxa",
    label: "Sintaxă",
    articulatedLabel: "Sintaxa",
    tagline: "Funcții sintactice, propoziții și frază",
  },
  {
    id: "vocabular",
    label: "Vocabular",
    articulatedLabel: "Vocabularul",
    tagline: "Sinonime, paronime și formarea cuvintelor",
  },
  {
    id: "fonetica",
    label: "Fonetică",
    articulatedLabel: "Fonetica",
    tagline: "Sunete, diftongi și despărțirea în silabe",
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

const VALID_GRADES = new Set([5, 6, 7, 8]);
const ROMAN_GRADES = { 5: "a V-a", 6: "a VI-a", 7: "a VII-a", 8: "a VIII-a" };

/**
 * Check one multiple-choice item — shared by the question bank and the lesson
 * quizzes, which use the same shape.
 * @returns {string[]} problems found, empty when valid
 */
function validateChoiceItem(item, where) {
  const errors = [];
  if (typeof item.prompt !== "string" || !item.prompt.trim()) {
    errors.push(`${where}: enunț lipsă`);
  }
  if (
    !Array.isArray(item.options) ||
    item.options.length !== 4 ||
    item.options.some((option) => typeof option !== "string" || !option.trim())
  ) {
    errors.push(`${where}: trebuie exact 4 variante nevide`);
  }
  if (!Number.isInteger(item.correctIndex) || item.correctIndex < 0 || item.correctIndex > 3) {
    errors.push(`${where}: correctIndex trebuie să fie între 0 și 3`);
  }
  if (typeof item.explanation !== "string" || !item.explanation.trim()) {
    errors.push(`${where}: explicație lipsă`);
  }
  return errors;
}

/**
 * Check the lesson bank against the schema the app relies on.
 * @param {Array<object>} lessons
 * @returns {string[]} human-readable problems; empty when the bank is valid
 */
export function validateLessonBank(lessons) {
  if (!Array.isArray(lessons)) return ["banca de lecții nu este o listă"];
  const errors = [];
  const seenLessons = new Set();
  const seenQuestions = new Set();
  lessons.forEach((lesson, index) => {
    const where = `lecția #${index} (${lesson && lesson.id ? lesson.id : "fără id"})`;
    if (!lesson || typeof lesson !== "object") {
      errors.push(`${where}: nu este un obiect`);
      return;
    }
    if (typeof lesson.id !== "string" || !lesson.id.trim()) {
      errors.push(`${where}: id lipsă`);
    } else if (seenLessons.has(lesson.id)) {
      errors.push(`${where}: id duplicat`);
    } else {
      seenLessons.add(lesson.id);
    }
    if (!VALID_CATEGORY_IDS.has(lesson.theme)) {
      errors.push(`${where}: temă necunoscută`);
    }
    if (typeof lesson.title !== "string" || !lesson.title.trim()) {
      errors.push(`${where}: titlu lipsă`);
    }
    if (
      !Array.isArray(lesson.grades) ||
      lesson.grades.length === 0 ||
      lesson.grades.some((grade) => !VALID_GRADES.has(grade))
    ) {
      errors.push(`${where}: clasele trebuie să fie între 5 și 8`);
    }
    if (!Number.isInteger(lesson.readingMinutes) || lesson.readingMinutes <= 0) {
      errors.push(`${where}: readingMinutes trebuie să fie un număr întreg pozitiv`);
    }
    if (typeof lesson.intro !== "string" || !lesson.intro.trim()) {
      errors.push(`${where}: introducere lipsă`);
    }
    if (!Array.isArray(lesson.sections) || lesson.sections.length === 0) {
      errors.push(`${where}: trebuie cel puțin o secțiune`);
    }
    if (!Array.isArray(lesson.traps) || lesson.traps.length === 0) {
      errors.push(`${where}: trebuie cel puțin o capcană`);
    }
    if (!Array.isArray(lesson.quiz) || lesson.quiz.length !== LESSON_QUIZ_SIZE) {
      errors.push(`${where}: mini-verificarea trebuie să aibă exact ${LESSON_QUIZ_SIZE} întrebări`);
      return;
    }
    lesson.quiz.forEach((question, qIndex) => {
      const qWhere = `${where}, întrebarea #${qIndex}`;
      if (typeof question.id !== "string" || !question.id.trim()) {
        errors.push(`${qWhere}: id lipsă`);
      } else if (seenQuestions.has(question.id)) {
        errors.push(`${qWhere}: id duplicat`);
      } else {
        seenQuestions.add(question.id);
      }
      errors.push(...validateChoiceItem(question, qWhere));
    });
  });
  return errors;
}

/**
 * Romanian label for the curriculum grades a lesson covers:
 * [5] → „clasa a V-a”, [5, 6] → „clasele V–VI”, [5, 7] → „clasele V și VII”.
 */
export function formatGradeBadge(grades) {
  const sorted = [...new Set(grades)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return `clasa ${ROMAN_GRADES[sorted[0]]}`;
  const romanNumerals = sorted.map((grade) => ROMAN_GRADES[grade].replace("a ", "").replace("-a", ""));
  const isRange = sorted.every((grade, index) => index === 0 || grade === sorted[index - 1] + 1);
  if (isRange) return `clasele ${romanNumerals[0]}–${romanNumerals[romanNumerals.length - 1]}`;
  return `clasele ${romanNumerals.join(" și ")}`;
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

/**
 * Exam paper: EXAM_SIZE questions spread as evenly as possible over the
 * categories that have questions, then shuffled so the areas interleave.
 * Fixing the total rather than a per-category quota keeps the paper the same
 * length if a fifth area is ever added.
 */
export function buildExamSession(questions, rng = Math.random) {
  const pools = CATEGORIES.map((category) =>
    questions.filter((question) => question.category === category.id)
  ).filter((pool) => pool.length > 0);
  if (pools.length === 0) return [];

  const base = Math.floor(EXAM_SIZE / pools.length);
  const remainder = EXAM_SIZE % pools.length;
  const picked = pools.flatMap((pool, index) =>
    shuffle(pool, rng).slice(0, base + (index < remainder ? 1 : 0))
  );
  return shuffle(picked, rng);
}

/**
 * Grade a finished paper. `answers` maps question id → chosen option index;
 * a missing entry means the question was left blank and counts as wrong.
 */
export function computeExamResult(questions, answers) {
  const missed = questions.filter((question) => answers[question.id] !== question.correctIndex);
  return {
    total: questions.length,
    score: questions.length - missed.length,
    missed,
    unanswered: questions.filter((question) => answers[question.id] === undefined).length,
  };
}

/**
 * Indicative mark on the Romanian 1–10 scale: 10 points „din oficiu” put the
 * floor at 1, the remaining 9 are earned. 16/20 → 8.2, 20/20 → 10, 0/20 → 1.
 */
export function formatMark(score, total) {
  if (total <= 0) return "1";
  // Work in tenths: `1 + 9 * 17/20` is 8.65, but `8.65 * 10` lands on
  // 86.4999… in binary floating point and would round down to 8.6.
  const tenths = Math.round(10 + (90 * score) / total);
  return tenths % 10 === 0 ? String(tenths / 10) : (tenths / 10).toFixed(1);
}

/**
 * Seconds → mm:ss, clamped at zero so an overrun never shows a negative clock.
 */
export function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function createProgress() {
  return { categories: {}, wrongIds: [], lessons: {}, exam: { runs: 0, bestScore: 0 } };
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
 * Close a finished lesson quiz, keeping the best score for that lesson.
 * Deliberately touches nothing else: lesson quizzes never feed the category
 * stats or the review list.
 */
export function recordLessonScore(progress, lessonId, score) {
  const previous = progress.lessons[lessonId];
  const bestScore = previous ? Math.max(previous.bestScore, score) : score;
  return {
    ...progress,
    lessons: { ...progress.lessons, [lessonId]: { bestScore } },
  };
}

/**
 * Close a finished exam: bump the run count, keep the best score, and queue
 * every missed question for review. Deliberately leaves `categories` alone —
 * those track ten-question single-area sessions, which a mixed twenty-question
 * paper is not comparable to.
 */
export function recordExamRun(progress, result) {
  const withWrong = result.missed.reduce(
    (acc, question) => recordAnswer(acc, question.id, false),
    progress
  );
  return {
    ...withWrong,
    exam: {
      runs: progress.exam.runs + 1,
      bestScore: Math.max(progress.exam.bestScore, result.score),
    },
  };
}

/**
 * @returns {string | null} start-card status line, or null before the first run
 */
export function describeExamProgress(progress) {
  const stats = progress.exam;
  if (!stats || stats.runs === 0) return null;
  const runsLabel = stats.runs === 1 ? "1 simulare" : `${stats.runs} simulări`;
  return `Cel mai bun rezultat: ${stats.bestScore}/${EXAM_SIZE} · ${runsLabel}`;
}

/**
 * @returns {string} lesson-list status line for the mini quiz
 */
export function describeLessonProgress(progress, lessonId) {
  const stats = progress.lessons[lessonId];
  if (!stats) return "Verificare nefăcută";
  return `Cel mai bun scor: ${stats.bestScore}/${LESSON_QUIZ_SIZE}`;
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
  // Absent on progress saved before lessons shipped — those visits just start
  // with no lesson scores rather than failing to load.
  if (parsed.lessons && typeof parsed.lessons === "object" && !Array.isArray(parsed.lessons)) {
    for (const [id, stats] of Object.entries(parsed.lessons)) {
      if (
        stats &&
        Number.isInteger(stats.bestScore) &&
        stats.bestScore >= 0 &&
        stats.bestScore <= LESSON_QUIZ_SIZE
      ) {
        progress.lessons[id] = { bestScore: stats.bestScore };
      }
    }
  }
  // Absent on progress saved before the exam shipped — those visits just start
  // with no exam history rather than failing to load.
  const exam = parsed.exam;
  if (
    exam &&
    typeof exam === "object" &&
    !Array.isArray(exam) &&
    Number.isInteger(exam.runs) &&
    exam.runs >= 0 &&
    Number.isInteger(exam.bestScore) &&
    exam.bestScore >= 0 &&
    exam.bestScore <= EXAM_SIZE
  ) {
    progress.exam = { runs: exam.runs, bestScore: exam.bestScore };
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
    lessons: document.getElementById("view-lessons"),
    lesson: document.getElementById("view-lesson"),
    lessonsCard: document.getElementById("lessons-card"),
    lessonsCount: document.getElementById("lessons-count"),
    lessonsOpen: document.getElementById("lessons-open"),
    lessonsHome: document.getElementById("lessons-home"),
    lessonGroups: document.getElementById("lesson-groups"),
    lessonBadge: document.getElementById("lesson-badge"),
    lessonTitle: document.getElementById("lesson-title"),
    lessonIntro: document.getElementById("lesson-intro"),
    lessonSections: document.getElementById("lesson-sections"),
    lessonTraps: document.getElementById("lesson-traps"),
    lessonQuizStep: document.getElementById("lesson-quiz-step"),
    lessonQuizPrompt: document.getElementById("lesson-quiz-prompt"),
    lessonQuizOptions: document.getElementById("lesson-quiz-options"),
    lessonQuizFeedback: document.getElementById("lesson-quiz-feedback"),
    lessonFeedbackVerdict: document.getElementById("lesson-feedback-verdict"),
    lessonFeedbackExplanation: document.getElementById("lesson-feedback-explanation"),
    lessonQuizNext: document.getElementById("lesson-quiz-next"),
    lessonQuizResult: document.getElementById("lesson-quiz-result"),
    lessonQuizScore: document.getElementById("lesson-quiz-score"),
    lessonQuizAgain: document.getElementById("lesson-quiz-again"),
    lessonPractice: document.getElementById("lesson-practice"),
    lessonBack: document.getElementById("lesson-back"),
    examIntro: document.getElementById("view-exam-intro"),
    exam: document.getElementById("view-exam"),
    examResult: document.getElementById("view-exam-result"),
    examCard: document.getElementById("exam-card"),
    examStats: document.getElementById("exam-stats"),
    examOpen: document.getElementById("exam-open"),
    examStart: document.getElementById("exam-start"),
    examCancel: document.getElementById("exam-cancel"),
    examClock: document.getElementById("exam-clock"),
    examStep: document.getElementById("exam-step"),
    examRemaining: document.getElementById("exam-remaining"),
    examPrompt: document.getElementById("exam-prompt"),
    examOptions: document.getElementById("exam-options"),
    examPrev: document.getElementById("exam-prev"),
    examNext: document.getElementById("exam-next"),
    examSubmit: document.getElementById("exam-submit"),
    examConfirm: document.getElementById("exam-confirm"),
    examScore: document.getElementById("exam-score"),
    examMark: document.getElementById("exam-mark"),
    examReview: document.getElementById("exam-review"),
    examAgain: document.getElementById("exam-again"),
    examHome: document.getElementById("exam-home"),
  };

  let bank = [];
  let lessons = [];
  let progress = deserializeProgress(readStoredProgress());
  let session = null;
  let lessonView = null;
  let exam = null;
  let examTimer = null;

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
    els.lessons.hidden = name !== "lessons";
    els.lesson.hidden = name !== "lesson";
    els.examIntro.hidden = name !== "exam-intro";
    els.exam.hidden = name !== "exam";
    els.examResult.hidden = name !== "exam-result";
    // Leaving the paper by any route stops the clock, so an abandoned run can
    // never keep ticking behind another view and submit itself later.
    if (name !== "exam") stopExamTimer();
    // Every view is a fresh screen, so it starts at its own top. Without this,
    // leaving a long lesson sheet carries the old offset over and the next
    // view opens scrolled past its heading — the taller the sheet, the worse.
    window.scrollTo({ top: 0 });
  }

  // Lesson copy comes from our own JSON, but it still passes through innerHTML,
  // so escape it rather than trusting the data file to stay markup-free. Quotes
  // are escaped too because the output also lands inside attributes, e.g.
  // data-lesson="…" in renderLessonList.
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
    els.examCard.hidden = bank.length === 0;
    const examStats = describeExamProgress(progress);
    els.examStats.textContent = examStats || "Încă neîncercată";
    els.lessonsCard.hidden = lessons.length === 0;
    if (lessons.length > 0) {
      els.lessonsCount.textContent = lessons.length === 1 ? "o fișă de teorie" : `${lessons.length} fișe de teorie`;
    }
    show("start");
  }

  function renderLessonList() {
    const groups = CATEGORIES.map((category) => ({
      category,
      items: lessons.filter((lesson) => lesson.theme === category.id),
    })).filter((group) => group.items.length > 0);

    els.lessonGroups.innerHTML = groups
      .map(
        (group) => `
        <section class="lesson-group">
          <h3 class="lesson-group__title">${escapeHtml(group.category.label)}</h3>
          <div class="lesson-group__items">
            ${group.items
              .map(
                (lesson) => `
              <button class="lesson-row" type="button" data-lesson="${escapeHtml(lesson.id)}">
                <span class="lesson-row__title">${escapeHtml(lesson.title)}</span>
                <span class="lesson-row__meta">
                  <span class="lesson-row__badge">${escapeHtml(formatGradeBadge(lesson.grades))}</span>
                  <span>${escapeHtml(lesson.readingMinutes)} min de citit</span>
                </span>
                <span class="lesson-row__status">${escapeHtml(describeLessonProgress(progress, lesson.id))}</span>
              </button>`
              )
              .join("")}
          </div>
        </section>`
      )
      .join("");

    els.lessonGroups.querySelectorAll("button[data-lesson]").forEach((button) => {
      button.addEventListener("click", () => openLesson(button.dataset.lesson));
    });
    show("lessons");
  }

  function renderLessonSections(lesson) {
    els.lessonSections.innerHTML = lesson.sections
      .map((section) => {
        const paragraphs = (section.paragraphs || [])
          .map((text) => `<p>${escapeHtml(text)}</p>`)
          .join("");
        const bullets = section.bullets
          ? `<ul class="lesson__bullets">${section.bullets
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join("")}</ul>`
          : "";
        const table = section.table
          ? `<div class="lesson__table-wrap">
              <table class="lesson__table">
                <caption>${escapeHtml(section.table.caption)}</caption>
                <thead><tr>${section.table.headers
                  .map((header) => `<th scope="col">${escapeHtml(header)}</th>`)
                  .join("")}</tr></thead>
                <tbody>${section.table.rows
                  .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
                  .join("")}</tbody>
              </table>
            </div>`
          : "";
        return `<section class="lesson__section">
            <h3 class="lesson__section-title">${escapeHtml(section.heading)}</h3>
            ${paragraphs}${bullets}${table}
          </section>`;
      })
      .join("");
  }

  function openLesson(lessonId) {
    const lesson = lessons.find((entry) => entry.id === lessonId);
    if (!lesson) return;
    lessonView = { lesson, index: 0, score: 0, answered: false };
    els.lessonBadge.textContent = formatGradeBadge(lesson.grades);
    els.lessonTitle.textContent = lesson.title;
    els.lessonIntro.textContent = lesson.intro;
    renderLessonSections(lesson);
    els.lessonTraps.innerHTML = lesson.traps.map((trap) => `<li>${escapeHtml(trap)}</li>`).join("");
    const theme = CATEGORIES.find((entry) => entry.id === lesson.theme);
    els.lessonPractice.textContent = `Exersează ${theme ? theme.articulatedLabel : ""}`.trim();
    renderLessonQuestion();
    show("lesson");
  }

  function renderLessonQuestion() {
    const question = lessonView.lesson.quiz[lessonView.index];
    lessonView.answered = false;
    els.lessonQuizStep.textContent = `Întrebarea ${lessonView.index + 1} din ${lessonView.lesson.quiz.length}`;
    els.lessonQuizPrompt.textContent = question.prompt;
    els.lessonQuizOptions.innerHTML = question.options
      .map(
        (option, index) => `
      <button class="option" type="button" data-index="${index}">
        <span class="option__letter">${"ABCD"[index]}</span>
        <span class="option__text">${escapeHtml(option)}</span>
      </button>`
      )
      .join("");
    els.lessonQuizOptions.querySelectorAll("button.option").forEach((button) => {
      button.addEventListener("click", () => answerLessonQuestion(Number(button.dataset.index)));
    });
    els.lessonQuizFeedback.hidden = true;
    els.lessonQuizResult.hidden = true;
    els.lessonQuizPrompt.hidden = false;
    els.lessonQuizOptions.hidden = false;
  }

  function answerLessonQuestion(selectedIndex) {
    if (lessonView.answered) return;
    lessonView.answered = true;
    const question = lessonView.lesson.quiz[lessonView.index];
    const correct = selectedIndex === question.correctIndex;
    if (correct) lessonView.score += 1;
    els.lessonQuizOptions.querySelectorAll("button.option").forEach((button) => {
      const index = Number(button.dataset.index);
      button.disabled = true;
      if (index === question.correctIndex) button.classList.add("option--correct");
      if (index === selectedIndex && !correct) button.classList.add("option--wrong");
    });
    els.lessonFeedbackVerdict.textContent = correct
      ? "Corect! 🎯"
      : `Greșit — răspunsul corect era ${"ABCD"[question.correctIndex]}.`;
    els.lessonFeedbackVerdict.classList.toggle("quiz-feedback__verdict--wrong", !correct);
    els.lessonFeedbackExplanation.textContent = question.explanation;
    els.lessonQuizNext.textContent =
      lessonView.index + 1 === lessonView.lesson.quiz.length ? "Vezi rezultatul" : "Următoarea";
    els.lessonQuizFeedback.hidden = false;
  }

  function endLessonQuiz() {
    progress = recordLessonScore(progress, lessonView.lesson.id, lessonView.score);
    saveProgress();
    els.lessonQuizScore.textContent = `${lessonView.score}/${lessonView.lesson.quiz.length}`;
    els.lessonQuizFeedback.hidden = true;
    els.lessonQuizPrompt.hidden = true;
    els.lessonQuizOptions.hidden = true;
    els.lessonQuizStep.textContent = "";
    els.lessonQuizResult.hidden = false;
  }

  function stopExamTimer() {
    if (examTimer !== null) {
      clearInterval(examTimer);
      examTimer = null;
    }
  }

  function startExam() {
    const questions = buildExamSession(bank);
    if (questions.length === 0) return;
    exam = { questions, answers: {}, index: 0, endsAt: Date.now() + EXAM_MINUTES * 60 * 1000 };
    els.examConfirm.hidden = true;
    renderExamQuestion();
    tickExamClock();
    examTimer = setInterval(tickExamClock, 1000);
    show("exam");
  }

  function tickExamClock() {
    if (!exam) return;
    const secondsLeft = (exam.endsAt - Date.now()) / 1000;
    // Round up so the first tick reads 20:00 rather than 19:59.
    els.examClock.textContent = formatTime(Math.ceil(secondsLeft));
    els.examClock.classList.toggle("exam-bar__clock--low", secondsLeft <= 60);
    if (secondsLeft <= 0) finishExam();
  }

  function renderExamQuestion() {
    const question = exam.questions[exam.index];
    const chosen = exam.answers[question.id];
    els.examStep.textContent = `Întrebarea ${exam.index + 1} din ${exam.questions.length}`;
    const blank = exam.questions.filter((q) => exam.answers[q.id] === undefined).length;
    els.examRemaining.textContent =
      blank === 0
        ? "Ai răspuns la toate întrebările."
        : blank === 1
          ? "A rămas o întrebare fără răspuns."
          : `Au rămas ${formatQuestionCount(blank)} fără răspuns.`;
    els.examPrompt.textContent = question.prompt;
    els.examOptions.innerHTML = question.options
      .map(
        (option, index) => `
      <button class="option${index === chosen ? " option--chosen" : ""}" type="button" data-index="${index}">
        <span class="option__letter">${"ABCD"[index]}</span>
        <span class="option__text">${escapeHtml(option)}</span>
      </button>`
      )
      .join("");
    els.examOptions.querySelectorAll("button.option").forEach((button) => {
      button.addEventListener("click", () => {
        // No verdict here on purpose: the paper stays silent until it is handed in.
        exam.answers[question.id] = Number(button.dataset.index);
        els.examConfirm.hidden = true;
        renderExamQuestion();
      });
    });
    els.examPrev.disabled = exam.index === 0;
    els.examNext.disabled = exam.index === exam.questions.length - 1;
  }

  function requestExamSubmit() {
    const blank = exam.questions.filter((q) => exam.answers[q.id] === undefined).length;
    if (blank > 0 && els.examConfirm.hidden) {
      els.examConfirm.textContent =
        blank === 1
          ? "A rămas o întrebare fără răspuns. Apasă din nou „Predă lucrarea” ca să predai așa."
          : `Au rămas ${formatQuestionCount(blank)} fără răspuns. Apasă din nou „Predă lucrarea” ca să predai așa.`;
      els.examConfirm.hidden = false;
      return;
    }
    finishExam();
  }

  function finishExam() {
    if (!exam) return;
    stopExamTimer();
    const result = computeExamResult(exam.questions, exam.answers);
    progress = recordExamRun(progress, result);
    saveProgress();
    els.examScore.textContent = `${result.score}/${result.total}`;
    els.examMark.textContent = `Nota estimativă: ${formatMark(result.score, result.total)}`;
    els.examReview.innerHTML =
      result.missed.length === 0
        ? `<p class="exam-review__perfect">Nicio greșeală. Zece curat! 🎉</p>`
        : `<h3 class="exam-review__title">De recapitulat (${result.missed.length})</h3>` +
          result.missed
            .map((question) => {
              const chosen = exam.answers[question.id];
              const given =
                chosen === undefined
                  ? "Fără răspuns"
                  : `Ai ales: ${"ABCD"[chosen]}. ${escapeHtml(question.options[chosen])}`;
              return `
        <article class="exam-review__item">
          <p class="exam-review__prompt">${escapeHtml(question.prompt)}</p>
          <p class="exam-review__given">${given}</p>
          <p class="exam-review__correct">Corect: ${"ABCD"[question.correctIndex]}. ${escapeHtml(question.options[question.correctIndex])}</p>
          <p class="exam-review__explanation">${escapeHtml(question.explanation)}</p>
        </article>`;
            })
            .join("");
    exam = null;
    show("exam-result");
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

  els.examOpen.addEventListener("click", () => show("exam-intro"));
  els.examCancel.addEventListener("click", renderStart);
  els.examStart.addEventListener("click", startExam);
  els.examPrev.addEventListener("click", () => {
    if (exam.index > 0) {
      exam.index -= 1;
      renderExamQuestion();
    }
  });
  els.examNext.addEventListener("click", () => {
    if (exam.index < exam.questions.length - 1) {
      exam.index += 1;
      renderExamQuestion();
    }
  });
  els.examSubmit.addEventListener("click", requestExamSubmit);
  els.examAgain.addEventListener("click", () => show("exam-intro"));
  els.examHome.addEventListener("click", renderStart);

  els.lessonsOpen.addEventListener("click", renderLessonList);
  els.lessonsHome.addEventListener("click", renderStart);
  els.lessonBack.addEventListener("click", renderLessonList);
  els.lessonPractice.addEventListener("click", () => startCategorySession(lessonView.lesson.theme));
  els.lessonQuizAgain.addEventListener("click", () => {
    lessonView.index = 0;
    lessonView.score = 0;
    renderLessonQuestion();
  });
  els.lessonQuizNext.addEventListener("click", () => {
    lessonView.index += 1;
    if (lessonView.index < lessonView.lesson.quiz.length) renderLessonQuestion();
    else endLessonQuiz();
  });

  Promise.all([
    fetch("data/questions.json").then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status} la questions.json`);
      return response.json();
    }),
    fetch("data/lessons.json").then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status} la lessons.json`);
      return response.json();
    }),
  ])
    .then(([questions, lessonBank]) => {
      const problems = [...validateQuestionBank(questions), ...validateLessonBank(lessonBank)];
      if (problems.length > 0) throw new Error(problems.join("; "));
      bank = questions;
      lessons = lessonBank;
      renderStart();
    })
    .catch((error) => {
      els.loadError.hidden = false;
      els.loadError.textContent =
        "Nu am putut încărca întrebările și lecțiile. Deschide aplicația printr-un server static (de exemplu „npx serve”) și reîncarcă pagina.";
      console.error("Zece la română:", error);
    });
}
