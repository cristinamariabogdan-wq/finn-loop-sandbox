import { describe, it, expect } from "vitest";
import {
  SESSION_SIZE,
  validateQuestionBank,
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

  it("are minimum 15 întrebări pe categorie", () => {
    const morfologie = bank.filter((q) => q.category === "morfologie");
    const sintaxa = bank.filter((q) => q.category === "sintaxa");
    expect(morfologie.length).toBeGreaterThanOrEqual(15);
    expect(sintaxa.length).toBeGreaterThanOrEqual(15);
  });

  it("are id-uri unice", () => {
    expect(new Set(bank.map((q) => q.id)).size).toBe(bank.length);
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
    expect(deserializeProgress(serializeProgress(progress))).toEqual(progress);
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
