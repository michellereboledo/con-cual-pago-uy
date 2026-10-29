# CLAUDE.md — ¿Con Cuál Pago? UY Engineering Charter

<!-- Graphify Navigation Hook -->
If `graphify-out/GRAPH_REPORT.md` exists, read it before grep/glob exploration to navigate the project's structural architecture, God nodes, and module clusters.

---

## 1. Andrej Karpathy's 4 Coding Principles (`multica-ai/andrej-karpathy-skills`)

### 1.1 Think Before Coding
- State assumptions explicitly before modifying financial discount math, card tier routing, or live verification pipelines.
- When multiple interpretations exist (e.g., bank cap per transaction vs. monthly cap), surface the trade-off instead of silently guessing.
- Push back if a requested change would violate the **Zero-Fake Discounts Mandate**.

### 1.2 Simplicity First
- Write the minimum code that solves the problem completely.
- Avoid speculative abstractions, premature wrappers, or unnecessary runtime dependencies.
- Keep the single-file bundle (`index.html` / Android WebView asset) self-contained and deterministic.

### 1.3 Surgical Changes
- Touch only the files and lines required to accomplish the goal.
- Never reformat unrelated files or strip existing verified bank catalog evidence in `src/data/merchantsData.ts`.
- Remove dead imports or variables created by your own edit immediately.

### 1.4 Goal-Driven Execution
- Every task must define a verifiable check before and after execution:
  - `npm run check:fast` — AST Knowledge Graph + Zero-Fake Discount Audit + Ponytail Engineering Audit
  - `npm run check:task` — Full Single-File Bundle Compilation (`scripts/build-preview.cjs`) + SSR Verification
  - `npm run check:full` — Complete Build + Android APK Compilation + Live Android 14 Emulator E2E Test Runner

---

## 2. Ponytail Discipline (`dietrichgebert/ponytail`)

- **Smallest Complete Change:** Every edit must leave all 166 bank discount rules verified, SSR rendering non-empty, and all UI motion/ergonomic checks passing.
- **Technical Debt Marker (`shortcut:`):** Any deliberate compromise or temporary workaround in `src/` or `scripts/` MUST include a `// shortcut: <reason and remediation plan>` comment so `scripts/ponytail-audit.cjs` can inventory it automatically.
- **Verification Ladder:**
  1. `check:fast` (`node scripts/graphify-ast.cjs && node scripts/audit-discounts.cjs && node scripts/ponytail-audit.cjs`)
  2. `check:task` (`node scripts/build-preview.cjs`)
  3. `check:full` (`node scripts/build-preview.cjs && node scripts/ponytail-audit.cjs && node scripts/build-apk.cjs && node scripts/android-test-runner.cjs`)
