import { describe, it, expect } from "vitest";
import {
  SESSION_SIZE,
  LESSON_QUIZ_SIZE,
  CATEGORIES,
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
    const errors = validateLessonBank([makeLesson({ theme: "fonetica", intro: "  " })]);
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
      makeQuestion({ explanation: "  ", category: "fonetica" }),
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
