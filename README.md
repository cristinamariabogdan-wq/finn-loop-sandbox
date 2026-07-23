# finn-loop-sandbox

A throwaway repo for testing [Finn-loop](https://github.com/finna/Finn-loop) —
a Linear + GitHub AI development factory driven by three Claude Code skills.

## What's here

- `src/strings.js` — a couple of tiny string utilities to build against.
- `test/strings.test.js` — Vitest suite (`npm test`).
- `.github/workflows/ci.yml` — CI check that runs the tests on every PR.
  This is the **required status check** Finn-loop needs to reach a
  `loop-approved` verdict.

## Finn-loop skills

Installed in `.claude/skills/`, wired to Linear team key **CRI**:

- `/finn-spec` — interview → files a Linear issue with `AC-N` / `NG-N`.
- `/finn-build` — claims an `agent-ready` issue, implements it, opens a PR.
- `/finn-review` — reviews the PR against its issue + CI, posts a verdict.

## Rhythm

1. `/finn-spec`, then apply the `agent-ready` label in Linear yourself.
2. `/loop /finn-build` to implement. `/loop /finn-review` to review.
3. Merge only `loop-approved`, green, conflict-free PRs.
