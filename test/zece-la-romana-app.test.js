import { describe, it, expect } from "vitest";
import {
  SESSION_SIZE,
  LESSON_QUIZ_SIZE,
  EXAM_SIZE,
  CATEGORIES,
  buildExamSession,
  computeExamResult,
  formatMark,
  formatTime,
  recordExamRun,
  describeExamProgress,
  validateQuestionBank,
  validateLessonBank,
  formatGradeBadge,
  recordLessonScore,
  describeLessonProgress,
  shuffle,
  buildSession,
  buildReviewSession,
  createProgress,
  recordAnswer,
  recordSessionEnd,
  describeCategoryProgress,
  formatQuestionCount,
  buildSummaryMessage,
  serializeProgress,
  deserializeProgress,
} from "../zece-la-romana/app.js";
import bank from "../zece-la-romana/data/questions.json";
import lessonBank from "../zece-la-romana/data/lessons.json";

const makeQuestion = (overrides = {}) => ({
  id: "q1",
  category: "morfologie",
  prompt: "Întrebare de probă?",
  options: ["a", "b", "c", "d"],
  correctIndex: 0,
  explanation: "Pentru că da.",
  ...overrides,
});

const fakeRng = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("banca de întrebări reală", () => {
  it("trece validarea de schemă", () => {
    expect(validateQuestionBank(bank)).toEqual([]);
  });

  it("are minimum 15 întrebări în fiecare categorie care are întrebări", () => {
    for (const category of CATEGORIES) {
      const questions = bank.filter((q) => q.category === category.id);
      if (questions.length === 0) continue;
      expect(questions.length, `categoria ${category.id}`).toBeGreaterThanOrEqual(15);
    }
  });

  it("are id-uri unice", () => {
    expect(new Set(bank.map((q) => q.id)).size).toBe(bank.length);
  });
});

const makeLesson = (overrides = {}) => ({
  id: "lectie-proba",
  theme: "morfologie",
  title: "Lecție de probă",
  grades: [5, 6],
  readingMinutes: 3,
  intro: "Introducere de probă.",
  sections: [{ heading: "Secțiune", paragraphs: ["Text."] }],
  traps: ["O capcană."],
  quiz: [
    { ...makeQuestion({ id: "lq1" }) },
    { ...makeQuestion({ id: "lq2" }) },
    { ...makeQuestion({ id: "lq3" }) },
  ],
  ...overrides,
});

describe("banca de lecții reală", () => {
  it("trece validarea de schemă", () => {
    expect(validateLessonBank(lessonBank)).toEqual([]);
  });

  it("are cel puțin 3 fișe pe fiecare temă, fiecare cu tabel sau listă și cel puțin 3 capcane", () => {
    for (const { id: theme } of CATEGORIES) {
      const lessons = lessonBank.filter((lesson) => lesson.theme === theme);
      if (lessons.length === 0) continue;
      expect(lessons.length, `tema ${theme}`).toBeGreaterThanOrEqual(3);
      for (const lesson of lessons) {
        const hasStructure = lesson.sections.some(
          (section) => section.table || (section.bullets && section.bullets.length > 0)
        );
        expect(hasStructure, `${lesson.id} fără tabel sau listă`).toBe(true);
        expect(lesson.traps.length, `${lesson.id} sub 3 capcane`).toBeGreaterThanOrEqual(3);
        expect(lesson.quiz).toHaveLength(LESSON_QUIZ_SIZE);
      }
    }
  });

  it("are id-uri unice de lecție și de întrebare", () => {
    expect(new Set(lessonBank.map((lesson) => lesson.id)).size).toBe(lessonBank.length);
    const quizIds = lessonBank.flatMap((lesson) => lesson.quiz.map((question) => question.id));
    expect(new Set(quizIds).size).toBe(quizIds.length);
  });
});

describe("validateLessonBank", () => {
  it("acceptă o lecție corectă", () => {
    expect(validateLessonBank([makeLesson()])).toEqual([]);
  });

  it("respinge ce nu este listă", () => {
    expect(validateLessonBank({})).toHaveLength(1);
  });

  it("prinde id de lecție duplicat", () => {
    const errors = validateLessonBank([makeLesson(), makeLesson()]);
    expect(errors.some((e) => e.includes("duplicat"))).toBe(true);
  });

  it("prinde clasele în afara intervalului 5–8", () => {
    const errors = validateLessonBank([makeLesson({ grades: [4, 5] })]);
    expect(errors.some((e) => e.includes("clasele"))).toBe(true);
  });

  it("prinde tema necunoscută și introducerea lipsă", () => {
    // Deliberately not a real category id, so adding areas never turns this
    // negative case into a passing one.
    const errors = validateLessonBank([makeLesson({ theme: "temă-inexistentă", intro: "  " })]);
    expect(errors.some((e) => e.includes("temă"))).toBe(true);
    expect(errors.some((e) => e.includes("introducere"))).toBe(true);
  });

  it("cere readingMinutes întreg pozitiv", () => {
    for (const value of [undefined, 0, -2, 3.5, "3"]) {
      const errors = validateLessonBank([makeLesson({ readingMinutes: value })]);
      expect(
        errors.some((e) => e.includes("readingMinutes")),
        `readingMinutes: ${String(value)}`
      ).toBe(true);
    }
  });

  it("prinde secțiunile și capcanele lipsă", () => {
    const errors = validateLessonBank([makeLesson({ sections: [], traps: [] })]);
    expect(errors.some((e) => e.includes("secțiune"))).toBe(true);
    expect(errors.some((e) => e.includes("capcană"))).toBe(true);
  });

  it("cere exact 3 întrebări în mini-verificare", () => {
    const short = makeLesson({ quiz: [makeQuestion({ id: "lq1" }), makeQuestion({ id: "lq2" })] });
    expect(validateLessonBank([short]).some((e) => e.includes("exact 3"))).toBe(true);
  });

  it("validează întrebările mini-verificării ca pe cele din bancă", () => {
    const lesson = makeLesson();
    lesson.quiz[1] = makeQuestion({ id: "lq2", options: ["a", "b"], correctIndex: 9 });
    const errors = validateLessonBank([lesson]);
    expect(errors.some((e) => e.includes("4 variante"))).toBe(true);
    expect(errors.some((e) => e.includes("correctIndex"))).toBe(true);
  });
});

describe("buildExamSession", () => {
  it("alege exact 20 de întrebări distincte din banca reală", () => {
    const paper = buildExamSession(bank);
    expect(paper).toHaveLength(EXAM_SIZE);
    expect(new Set(paper.map((q) => q.id)).size).toBe(EXAM_SIZE);
  });

  it("distribuie egal peste cele patru categorii", () => {
    const counts = {};
    for (const q of buildExamSession(bank)) counts[q.category] = (counts[q.category] || 0) + 1;
    expect(counts).toEqual({ morfologie: 5, sintaxa: 5, vocabular: 5, fonetica: 5 });
  });

  it("amestecă ariile în loc să le grupeze", () => {
    // With four blocks of five, a grouped paper would change category only
    // three times; a shuffled one changes far more often.
    const paper = buildExamSession(bank);
    const switches = paper.filter((q, i) => i > 0 && q.category !== paper[i - 1].category).length;
    expect(switches).toBeGreaterThan(3);
  });

  it("împarte restul către primele categorii când numărul nu se divide", () => {
    // Three categories → 20 = 7 + 7 + 6, in CATEGORIES order.
    const threeAreas = bank.filter((q) => q.category !== "fonetica");
    const counts = {};
    for (const q of buildExamSession(threeAreas)) counts[q.category] = (counts[q.category] || 0) + 1;
    expect(counts).toEqual({ morfologie: 7, sintaxa: 7, vocabular: 6 });
  });

  it("întoarce o listă goală când nu există întrebări", () => {
    expect(buildExamSession([])).toEqual([]);
  });

  it("este determinist pentru același rng", () => {
    const seeded = () => fakeRng(0.2, 0.8, 0.5, 0.1, 0.9, 0.35, 0.64);
    expect(buildExamSession(bank, seeded()).map((q) => q.id)).toEqual(
      buildExamSession(bank, seeded()).map((q) => q.id)
    );
  });
});

describe("computeExamResult", () => {
  const paper = [
    makeQuestion({ id: "a", correctIndex: 0 }),
    makeQuestion({ id: "b", correctIndex: 1 }),
    makeQuestion({ id: "c", correctIndex: 2 }),
  ];

  it("numără răspunsurile corecte", () => {
    const result = computeExamResult(paper, { a: 0, b: 1, c: 2 });
    expect(result).toMatchObject({ total: 3, score: 3, unanswered: 0 });
    expect(result.missed).toEqual([]);
  });

  it("tratează întrebările fără răspuns ca greșite", () => {
    const result = computeExamResult(paper, { a: 0 });
    expect(result).toMatchObject({ total: 3, score: 1, unanswered: 2 });
    expect(result.missed.map((q) => q.id)).toEqual(["b", "c"]);
  });

  it("adună greșelile și necompletatele în aceeași listă", () => {
    const result = computeExamResult(paper, { a: 3, b: 1 });
    expect(result.score).toBe(1);
    expect(result.missed.map((q) => q.id)).toEqual(["a", "c"]);
    expect(result.unanswered).toBe(1);
  });
});

describe("formatMark", () => {
  it("aplică formula 1 + 9 × procent", () => {
    expect(formatMark(20, 20)).toBe("10");
    expect(formatMark(16, 20)).toBe("8.2");
    expect(formatMark(10, 20)).toBe("5.5");
    expect(formatMark(0, 20)).toBe("1");
  });

  it("rotunjește în sus la jumătate de zecime, fără eroare de virgulă mobilă", () => {
    // 1 + 9 × 17/20 = 8.65 exactly; naive `Math.round(8.65 * 10)` gives 8.6.
    expect(formatMark(17, 20)).toBe("8.7");
    expect(formatMark(19, 20)).toBe("9.6");
    expect(formatMark(3, 20)).toBe("2.4");
  });

  it("nu coboară sub 1 și nu are total zero", () => {
    expect(formatMark(0, 0)).toBe("1");
  });
});

describe("formatTime", () => {
  it("formatează mm:ss", () => {
    expect(formatTime(20 * 60)).toBe("20:00");
    expect(formatTime(545)).toBe("09:05");
    expect(formatTime(0)).toBe("00:00");
  });

  it("nu afișează timp negativ", () => {
    expect(formatTime(-5)).toBe("00:00");
  });
});

describe("recordExamRun", () => {
  const result = (score, missedIds) => ({
    total: EXAM_SIZE,
    score,
    unanswered: 0,
    missed: missedIds.map((id) => makeQuestion({ id })),
  });

  it("numără rulările și păstrează cel mai bun scor", () => {
    let progress = recordExamRun(createProgress(), result(16, ["m01"]));
    expect(progress.exam).toEqual({ runs: 1, bestScore: 16 });
    progress = recordExamRun(progress, result(12, ["m02"]));
    expect(progress.exam).toEqual({ runs: 2, bestScore: 16 });
    progress = recordExamRun(progress, result(19, []));
    expect(progress.exam).toEqual({ runs: 3, bestScore: 19 });
  });

  it("trimite greșelile în lista de reluat", () => {
    const progress = recordExamRun(createProgress(), result(18, ["m01", "s03"]));
    expect(progress.wrongIds).toEqual(["m01", "s03"]);
  });

  it("nu atinge statisticile categoriilor", () => {
    const before = recordSessionEnd(createProgress(), "morfologie", 7);
    const after = recordExamRun(before, result(14, ["m01"]));
    expect(after.categories).toEqual(before.categories);
  });
});

describe("describeExamProgress", () => {
  it("întoarce null înainte de prima simulare", () => {
    expect(describeExamProgress(createProgress())).toBeNull();
  });

  it("formatează singularul și pluralul", () => {
    const one = recordExamRun(createProgress(), { total: 20, score: 15, unanswered: 0, missed: [] });
    expect(describeExamProgress(one)).toBe("Cel mai bun rezultat: 15/20 · 1 simulare");
    const two = recordExamRun(one, { total: 20, score: 11, unanswered: 0, missed: [] });
    expect(describeExamProgress(two)).toBe("Cel mai bun rezultat: 15/20 · 2 simulări");
  });
});

describe("CATEGORIES", () => {
  it("dă fiecărei categorii o formă articulată pentru butonul de exersare", () => {
    for (const category of CATEGORIES) {
      expect(typeof category.articulatedLabel, `categoria ${category.id}`).toBe("string");
      expect(category.articulatedLabel.trim(), `categoria ${category.id}`).not.toBe("");
    }
  });

  it("are id-uri și etichete unice", () => {
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length);
    expect(new Set(CATEGORIES.map((c) => c.label)).size).toBe(CATEGORIES.length);
  });
});

describe("formatGradeBadge", () => {
  it("formatează o singură clasă", () => {
    expect(formatGradeBadge([5])).toBe("clasa a V-a");
    expect(formatGradeBadge([8])).toBe("clasa a VIII-a");
  });

  it("formatează un interval continuu", () => {
    expect(formatGradeBadge([5, 6])).toBe("clasele V–VI");
    expect(formatGradeBadge([5, 6, 7, 8])).toBe("clasele V–VIII");
  });

  it("formatează clase neconsecutive", () => {
    expect(formatGradeBadge([5, 7])).toBe("clasele V și VII");
  });

  it("normalizează ordinea și duplicatele", () => {
    expect(formatGradeBadge([6, 5, 6])).toBe("clasele V–VI");
  });
});

describe("recordLessonScore", () => {
  it("salvează scorul primei încercări", () => {
    const progress = recordLessonScore(createProgress(), "pronumele", 2);
    expect(progress.lessons.pronumele).toEqual({ bestScore: 2 });
  });

  it("păstrează cel mai bun scor", () => {
    let progress = recordLessonScore(createProgress(), "pronumele", 3);
    progress = recordLessonScore(progress, "pronumele", 1);
    expect(progress.lessons.pronumele).toEqual({ bestScore: 3 });
  });

  it("nu atinge statisticile categoriilor și lista de reluat", () => {
    let progress = recordSessionEnd(createProgress(), "morfologie", 7);
    progress = recordAnswer(progress, "m01", false);
    const after = recordLessonScore(progress, "pronumele", 3);
    expect(after.categories).toEqual(progress.categories);
    expect(after.wrongIds).toEqual(progress.wrongIds);
  });
});

describe("describeLessonProgress", () => {
  it("marchează verificarea nefăcută", () => {
    expect(describeLessonProgress(createProgress(), "verbul")).toBe("Verificare nefăcută");
  });

  it("afișează cel mai bun scor", () => {
    const progress = recordLessonScore(createProgress(), "verbul", 2);
    expect(describeLessonProgress(progress, "verbul")).toBe("Cel mai bun scor: 2/3");
  });
});

describe("validateQuestionBank", () => {
  it("acceptă o întrebare corectă", () => {
    expect(validateQuestionBank([makeQuestion()])).toEqual([]);
  });

  it("respinge ce nu este listă", () => {
    expect(validateQuestionBank("nu")).toHaveLength(1);
  });

  it("prinde id duplicat", () => {
    const errors = validateQuestionBank([makeQuestion(), makeQuestion()]);
    expect(errors.some((e) => e.includes("duplicat"))).toBe(true);
  });

  it("prinde numărul greșit de variante", () => {
    const errors = validateQuestionBank([makeQuestion({ options: ["a", "b", "c"] })]);
    expect(errors.some((e) => e.includes("4 variante"))).toBe(true);
  });

  it("prinde correctIndex în afara intervalului", () => {
    const errors = validateQuestionBank([makeQuestion({ correctIndex: 4 })]);
    expect(errors.some((e) => e.includes("correctIndex"))).toBe(true);
  });

  it("prinde explicația lipsă și categoria necunoscută", () => {
    const errors = validateQuestionBank([
      makeQuestion({ explanation: "  ", category: "categorie-inexistentă" }),
    ]);
    expect(errors.some((e) => e.includes("explicație"))).toBe(true);
    expect(errors.some((e) => e.includes("categorie"))).toBe(true);
  });
});

describe("shuffle", () => {
  it("păstrează aceleași elemente, fără a modifica originalul", () => {
    const items = [1, 2, 3, 4, 5];
    const result = shuffle(items, fakeRng(0.1, 0.7, 0.3, 0.9));
    expect(result).not.toBe(items);
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });

  it("este determinist pentru același șir de valori rng", () => {
    const items = ["a", "b", "c", "d", "e", "f"];
    const first = shuffle(items, fakeRng(0.2, 0.8, 0.5, 0.1, 0.9));
    const second = shuffle(items, fakeRng(0.2, 0.8, 0.5, 0.1, 0.9));
    expect(first).toEqual(second);
  });
});

describe("buildSession", () => {
  it("alege 10 întrebări unice din categoria cerută", () => {
    const session = buildSession(bank, "morfologie");
    expect(session).toHaveLength(SESSION_SIZE);
    expect(session.every((q) => q.category === "morfologie")).toBe(true);
    expect(new Set(session.map((q) => q.id)).size).toBe(SESSION_SIZE);
  });

  it("folosește toate întrebările când sunt mai puține de 10", () => {
    const pool = [
      makeQuestion({ id: "a" }),
      makeQuestion({ id: "b" }),
      makeQuestion({ id: "c" }),
      makeQuestion({ id: "d", category: "sintaxa" }),
    ];
    const session = buildSession(pool, "morfologie", fakeRng(0.5));
    expect(session.map((q) => q.id).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("buildReviewSession", () => {
  it("se limitează la întrebările din lista de greșeli", () => {
    const session = buildReviewSession(bank, ["m01", "s05"], fakeRng(0.5));
    expect(session.map((q) => q.id).sort()).toEqual(["m01", "s05"]);
  });

  it("taie la maximum 10 când lista e mai lungă", () => {
    const wrongIds = bank.slice(0, 12).map((q) => q.id);
    const session = buildReviewSession(bank, wrongIds);
    expect(session).toHaveLength(SESSION_SIZE);
    expect(session.every((q) => wrongIds.includes(q.id))).toBe(true);
  });
});

describe("recordAnswer", () => {
  it("adaugă întrebarea greșită o singură dată", () => {
    const start = createProgress();
    const once = recordAnswer(start, "m01", false);
    const twice = recordAnswer(once, "m01", false);
    expect(twice.wrongIds).toEqual(["m01"]);
    expect(start.wrongIds).toEqual([]);
  });

  it("scoate întrebarea din listă după un răspuns corect", () => {
    const progress = recordAnswer(recordAnswer(createProgress(), "m01", false), "m01", true);
    expect(progress.wrongIds).toEqual([]);
  });

  it("lasă lista neschimbată la răspuns corect pe întrebare absentă", () => {
    const progress = recordAnswer(createProgress(), "m02", true);
    expect(progress.wrongIds).toEqual([]);
  });
});

describe("recordSessionEnd", () => {
  it("creează statistici la prima sesiune", () => {
    const progress = recordSessionEnd(createProgress(), "morfologie", 7);
    expect(progress.categories.morfologie).toEqual({ sessions: 1, bestScore: 7 });
  });

  it("incrementează sesiunile și păstrează cel mai bun scor", () => {
    let progress = recordSessionEnd(createProgress(), "morfologie", 7);
    progress = recordSessionEnd(progress, "morfologie", 5);
    expect(progress.categories.morfologie).toEqual({ sessions: 2, bestScore: 7 });
    progress = recordSessionEnd(progress, "morfologie", 9);
    expect(progress.categories.morfologie).toEqual({ sessions: 3, bestScore: 9 });
  });

  it("nu atinge statisticile pentru sesiunile de reluare (fără categorie)", () => {
    const start = recordSessionEnd(createProgress(), "sintaxa", 6);
    const after = recordSessionEnd(start, null, 3);
    expect(after).toBe(start);
  });
});

describe("describeCategoryProgress", () => {
  it("întoarce null pentru o categorie neexersată", () => {
    expect(describeCategoryProgress(createProgress(), "morfologie")).toBeNull();
  });

  it("formatează singularul și pluralul", () => {
    const one = recordSessionEnd(createProgress(), "morfologie", 7);
    expect(describeCategoryProgress(one, "morfologie")).toBe("Cel mai bun scor: 7/10 · 1 sesiune");
    const three = recordSessionEnd(recordSessionEnd(one, "morfologie", 4), "morfologie", 8);
    expect(describeCategoryProgress(three, "morfologie")).toBe(
      "Cel mai bun scor: 8/10 · 3 sesiuni"
    );
  });
});

describe("formatQuestionCount", () => {
  it("declină corect numărul de întrebări", () => {
    expect(formatQuestionCount(1)).toBe("o întrebare");
    expect(formatQuestionCount(3)).toBe("3 întrebări");
    expect(formatQuestionCount(20)).toBe("20 de întrebări");
  });
});

describe("buildSummaryMessage", () => {
  it("alege mesajul după proporția scorului", () => {
    expect(buildSummaryMessage(10, 10)).toContain("Zece curat");
    expect(buildSummaryMessage(3, 3)).toContain("Zece curat");
    expect(buildSummaryMessage(8, 10)).toContain("Aproape perfect");
    expect(buildSummaryMessage(5, 10)).toContain("Bine");
    expect(buildSummaryMessage(2, 10)).toContain("Nu te descuraja");
  });
});

describe("serializare progres", () => {
  it("face round-trip fără pierderi", () => {
    let progress = recordSessionEnd(createProgress(), "morfologie", 8);
    progress = recordAnswer(progress, "s03", false);
    progress = recordLessonScore(progress, "pronumele", 3);
    expect(deserializeProgress(serializeProgress(progress))).toEqual(progress);
  });

  it("face round-trip cu istoricul de simulări", () => {
    let progress = recordExamRun(createProgress(), {
      total: EXAM_SIZE,
      score: 17,
      unanswered: 0,
      missed: [makeQuestion({ id: "s07" })],
    });
    progress = recordSessionEnd(progress, "fonetica", 8);
    expect(deserializeProgress(serializeProgress(progress))).toEqual(progress);
  });

  it("citește progresul salvat înainte de simulări, cu istoricul gol", () => {
    const legacy = JSON.stringify({
      categories: { vocabular: { sessions: 3, bestScore: 9 } },
      wrongIds: ["v02"],
      lessons: { pronumele: { bestScore: 3 } },
    });
    expect(deserializeProgress(legacy).exam).toEqual({ runs: 0, bestScore: 0 });
  });

  it("igienizează un istoric de simulări imposibil", () => {
    const bad = (exam) => deserializeProgress(JSON.stringify({ exam })).exam;
    expect(bad({ runs: -1, bestScore: 5 })).toEqual({ runs: 0, bestScore: 0 });
    expect(bad({ runs: 2, bestScore: EXAM_SIZE + 1 })).toEqual({ runs: 0, bestScore: 0 });
    expect(bad({ runs: "două", bestScore: 5 })).toEqual({ runs: 0, bestScore: 0 });
    expect(bad([1, 2])).toEqual({ runs: 0, bestScore: 0 });
    expect(bad({ runs: 2, bestScore: 14 })).toEqual({ runs: 2, bestScore: 14 });
  });

  it("citește progresul salvat înainte de lecții, fără scoruri de lecție", () => {
    const legacy = JSON.stringify({
      categories: { morfologie: { sessions: 2, bestScore: 8 } },
      wrongIds: ["m01"],
    });
    const progress = deserializeProgress(legacy);
    expect(progress.categories).toEqual({ morfologie: { sessions: 2, bestScore: 8 } });
    expect(progress.wrongIds).toEqual(["m01"]);
    expect(progress.lessons).toEqual({});
  });

  it("igienizează scorurile de lecție imposibile", () => {
    const raw = JSON.stringify({
      lessons: {
        verbul: { bestScore: 2 },
        pronumele: { bestScore: 9 },
        adjectivul: { bestScore: "trei" },
      },
    });
    expect(deserializeProgress(raw).lessons).toEqual({ verbul: { bestScore: 2 } });
  });

  it("pornește de la zero pentru date absente sau corupte", () => {
    const fresh = createProgress();
    expect(deserializeProgress(null)).toEqual(fresh);
    expect(deserializeProgress(undefined)).toEqual(fresh);
    expect(deserializeProgress("")).toEqual(fresh);
    expect(deserializeProgress("nu e json")).toEqual(fresh);
    expect(deserializeProgress('"doar un string"')).toEqual(fresh);
    expect(deserializeProgress("[1,2,3]")).toEqual(fresh);
  });

  it("igienizează câmpurile cu tipuri greșite", () => {
    const raw = JSON.stringify({
      categories: {
        morfologie: { sessions: "multe", bestScore: 2 },
        sintaxa: { sessions: 2, bestScore: 9 },
      },
      wrongIds: ["m01", 3, "m01", null],
    });
    const progress = deserializeProgress(raw);
    expect(progress.categories).toEqual({ sintaxa: { sessions: 2, bestScore: 9 } });
    expect(progress.wrongIds).toEqual(["m01"]);
  });
});
