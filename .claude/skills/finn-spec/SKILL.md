---
name: finn-spec
description: Convert a raw feature idea into a production-ready Linear issue through structured codebase research and a user interview. Use when asked to spec a feature, write a Linear issue, or run Finn-loop's spec agent. Never runs unattended — requires the user's presence throughout.
---

# Finn-spec: Spec Interview Agent

Convert a raw idea into a production-ready Linear issue through structured
research and a user interview. This skill requires the user's presence; never
run it unattended.

## 1. Research

Before asking any questions, read the relevant parts of the codebase. Understand
existing patterns, constraints, and conventions. Answer every question the code
can answer so the interview covers only genuine product decisions.

## 2. Interview

Ask 1–4 focused questions per round. Each question must offer concrete options
with a recommended choice marked. Questions target genuine product decisions:
behavior forks, scope boundaries, edge cases, data implications.

After each round, incorporate the answers and test against this criterion:

> "Could two different engineers read this spec and ship the same observable
> behavior?"

Continue rounds until the answer is yes. There is no question limit.

## 3. Draft

Write the issue using this template:

```
**Problem**
One paragraph. Why this exists; what user or system need it addresses.

**Acceptance Criteria**
- AC-1: …
- AC-2: …
(Each criterion is independently verifiable and has a stable identifier.)

**Non-goals**
- NG-1: …
- NG-2: …
(Binding. No AC may depend on an NG.)

**Relevant files**
- path/to/file — why it matters

**Test expectations**
What automated tests should cover, and at what layer.

**How to verify**
Numbered manual steps a reviewer can follow to confirm the issue is done.
```

Size the issue to one day of agent work. If the feature is larger, split it
into an ordered chain of independently buildable issues and present them in
sequence.

## 4. Confirm and file

Present the full draft and wait for explicit user approval. Once approved, file
the issue via the Linear connector on team `CRI` and report the exact issue
identifier and URL.

**Never apply the `agent-ready` label.** The user applies it in Linear as the
approval gate between draft and build work.
